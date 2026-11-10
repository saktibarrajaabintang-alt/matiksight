"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AggregationOperation,
  ChartPeriod,
  Dataset,
  DatasetColumn,
  DatasetColumnType,
  DatasetProfile,
  DatasetRecord,
  Visualization,
} from "@/lib/data-utils";
import { LoginCredentials, RegistrationDetails, linkGoogleAccount, registerAccount, signIn, signInWithGoogle } from "@/lib/auth-service";
import {
  apiRequest,
  AuthUser,
  BackendRow,
  BackendDataset,
  BackendDatasetPreviewResponse,
  BackendUploadResponse,
  BackendVisualization,
  clearAccessToken,
  fetchAllPages,
  hasAccessToken,
} from "@/lib/api-client";

export type Settings = { name: string; email: string; theme: "Terang" | "Gelap" | "Sistem"; defaultChart: string; pageSize: number };
type AuthResponse = { success: true; data: { user: AuthUser } };
type BackendDatasetDetailResponse = { success: true; data: BackendDataset };
type BackendVisualizationResponse = { success: true; data: BackendVisualization };
type ProfileUpdate = Pick<Settings, "name" | "email">;

type AppContextValue = {
  datasets: Dataset[];
  visualizations: Visualization[];
  settings: Settings;
  toast: string;
  toastClosing: boolean;
  user: AuthUser | null;
  authReady: boolean;
  authError: string;
  dataLoading: boolean;
  uploadDataset: (file: File) => Promise<Dataset>;
  removeDataset: (id: string) => Promise<void>;
  saveVisualization: (visualization: Omit<Visualization, "id" | "createdAt">) => Promise<void>;
  updateVisualization: (id: string, updates: Partial<Visualization>) => Promise<void>;
  removeVisualization: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => void;
  updateProfile: (profile: ProfileUpdate) => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: (idToken: string, remember: boolean) => Promise<void>;
  linkGoogle: (idToken: string) => Promise<void>;
  register: (details: RegistrationDetails) => Promise<void>;
  logout: () => Promise<void>;
  notify: (message: string) => void;
  currentDataset: Dataset | null;
  setCurrentDatasetId: (id: string) => void;
  rows: DatasetRecord[];
};

const preferencesKey = "matiksight-preferences-v1";
const currentDatasetKey = "matiksight-current-dataset";
const legacyStorageKey = "matiksight-workspace-v2";
const defaultSettings: Settings = { name: "", email: "", theme: "Terang", defaultChart: "Bar", pageSize: 10 };
const AppContext = createContext<AppContextValue | null>(null);

function applyTheme(theme: Settings["theme"]) {
  const dark = theme === "Gelap" || (
    theme === "Sistem" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function normalizeColumnType(type: string): DatasetColumnType {
  switch (type.toLowerCase()) {
    case "integer":
      return "integer";
    case "decimal":
    case "number":
      return "decimal";
    case "currency":
      return "currency";
    case "percentage":
      return "percentage";
    case "date":
      return "date";
    case "datetime":
      return "datetime";
    case "time":
      return "time";
    case "boolean":
      return "boolean";
    default:
      return "string";
  }
}

function datasetColumns(dataset: BackendDataset): DatasetColumn[] {
  const names = dataset.columns ?? [];
  const metadata = dataset.columnMetadata ?? [];
  const count = Math.max(names.length, metadata.length, dataset.columnCount);
  return Array.from({ length: count }, (_, index) => {
    const column = metadata[index];
    return {
      key: String(index),
      name: column?.name ?? names[index] ?? `Kolom ${index + 1}`,
      type: normalizeColumnType(column?.type ?? "string"),
      missingValues: column?.nullCount ?? 0,
    };
  });
}

function numberValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function datasetProfile(dataset: BackendDataset, columns: DatasetColumn[]): DatasetProfile {
  const metadata = dataset.columnMetadata ?? [];
  const numericColumns = columns.flatMap((column, index) => {
    if (!["integer", "decimal", "currency", "percentage"].includes(column.type)) return [];
    const source = metadata[index];
    const minimum = numberValue(source?.min);
    const maximum = numberValue(source?.max);
    const average = numberValue(source?.mean);
    const count = Math.max(0, dataset.rowCount - (source?.nullCount ?? 0));
    return [{
      columnKey: column.key,
      minimum: minimum ?? 0,
      maximum: maximum ?? 0,
      average: average ?? 0,
      sum: (average ?? 0) * count,
    }];
  });
  const categoricalColumns = columns.flatMap((column, index) => {
    if (!["string", "time", "boolean"].includes(column.type)) return [];
    return [{
      columnKey: column.key,
      distinctValues: metadata[index]?.uniqueCount ?? 0,
      topValues: [],
    }];
  });
  const names = dataset.columns ?? [];
  const dateRanges = (dataset.profiling?.dateRange ?? []).flatMap((range) => {
    const index = names.indexOf(range.column);
    return index < 0 ? [] : [{ columnKey: String(index), start: range.min, end: range.max }];
  });
  return {
    rowCount: dataset.rowCount,
    columnCount: dataset.columnCount,
    missingValues: dataset.profiling?.missingValues
      ?? metadata.reduce((total, column) => total + (column.nullCount ?? 0), 0),
    numericColumns,
    categoricalColumns,
    dateRanges,
  };
}

function rowsFromBackend(rows: BackendRow[], columns: DatasetColumn[]): DatasetRecord[] {
  return rows.map((row) => Array.isArray(row)
    ? row
    : columns.map((column) => row[column.name]));
}

function toDataset(source: BackendDataset, rawRows: BackendRow[] = []): Dataset {
  const columns = datasetColumns(source);
  const uploaded = new Date(source.createdAt);
  return {
    id: source.id,
    name: source.originalFilename || source.name,
    size: Math.ceil(source.fileSize / 1024),
    type: source.fileType === "csv" ? "CSV" : "Excel",
    rows: source.rowCount,
    data: rowsFromBackend(rawRows, columns),
    columns,
    profile: datasetProfile(source, columns),
    sheetName: source.sheetName ?? undefined,
    uploadedAt: Number.isNaN(uploaded.getTime())
      ? source.createdAt
      : uploaded.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
    createdAt: source.createdAt,
    status: source.rowCount && source.columnCount ? "Selesai" : "Belum diproses",
  };
}

function mapChartType(value: string): Visualization["chartType"] {
  const normalized = value.toLowerCase();
  if (normalized === "line" || normalized === "area" || normalized === "pie" || normalized === "donut" || normalized === "scatter") {
    return normalized[0].toUpperCase() + normalized.slice(1) as Visualization["chartType"];
  }
  return "Bar";
}

function toVisualization(source: BackendVisualization, datasets: Dataset[]): Visualization {
  const dataset = datasets.find((item) => item.id === source.datasetId);
  const configuration = source.configuration;
  const xKey = dataset?.columns?.find((column) => column.name === configuration.xAxis)?.key ?? configuration.xAxis;
  const yKey = configuration.aggregation === "count" && configuration.chartType !== "scatter"
    ? ""
    : dataset?.columns?.find((column) => column.name === configuration.yAxis)?.key ?? configuration.yAxis;
  const created = new Date(source.createdAt);
  const dateFilter = configuration.filters?.find((filter) => filter.operator === "gte");
  const periodDays = dateFilter && typeof dateFilter.value === "string"
    ? (Date.now() - Date.parse(dateFilter.value)) / (24 * 60 * 60 * 1000)
    : Number.NaN;
  const period: ChartPeriod = periodDays >= 5 && periodDays <= 10
    ? "7 Hari"
    : periodDays >= 25 && periodDays <= 35
      ? "30 Hari"
      : periodDays >= 330 && periodDays <= 400
        ? "12 Bulan"
        : "Semua Data";
  return {
    id: source.id,
    title: source.name,
    datasetId: source.datasetId,
    datasetName: dataset?.name ?? "Dataset",
    chartType: mapChartType(source.chartType ?? configuration.chartType),
    xKey,
    yKey,
    aggregation: (configuration.aggregation ?? "average") as AggregationOperation,
    createdAt: Number.isNaN(created.getTime()) ? source.createdAt : created.toLocaleString("id-ID"),
    period,
    filters: configuration.filters ?? [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [currentDatasetId, setCurrentDatasetId] = useState("");
  const [toast, setToast] = useState("");
  const [toastClosing, setToastClosing] = useState(false);
  const toastTimeout = useRef<number | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [dataLoading, setDataLoading] = useState(false);

  const notify = useCallback((message: string) => {
    if (toastTimeout.current !== null) window.clearTimeout(toastTimeout.current);
    setToast(message);
    setToastClosing(false);
    toastTimeout.current = window.setTimeout(() => {
      setToastClosing(true);
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
      toastTimeout.current = window.setTimeout(() => {
        setToast("");
        setToastClosing(false);
        toastTimeout.current = null;
      }, delay);
    }, 3000);
  }, []);
  useEffect(() => () => {
    if (toastTimeout.current !== null) window.clearTimeout(toastTimeout.current);
  }, []);

  const loadDataset = useCallback(async (id: string, existing: Dataset[]) => {
    const [detail, preview] = await Promise.all([
      apiRequest<BackendDatasetDetailResponse>(`/datasets/${encodeURIComponent(id)}`),
      apiRequest<BackendDatasetPreviewResponse>(`/datasets/${encodeURIComponent(id)}/preview?page=1&limit=100`),
    ]);
    const source = {
      ...detail.data,
      columns: detail.data.columns ?? preview.dataset.columns,
      columnMetadata: detail.data.columnMetadata ?? preview.dataset.columnMetadata,
      profiling: detail.data.profiling ?? preview.dataset.profiling,
    };
    const updated = toDataset(source, preview.data);
    setDatasets((previous) => {
      const current = previous.length ? previous : existing;
      return current.map((dataset) => dataset.id === id ? updated : dataset);
    });
    return updated;
  }, []);

  const selectDataset = useCallback((id: string) => {
    setCurrentDatasetId(id);
    const dataset = datasets.find((item) => item.id === id);
    if (dataset && !dataset.data?.length && dataset.rows > 0) {
      void loadDataset(id, datasets).catch((error: unknown) => {
        notify(`Gagal memuat preview dataset: ${error instanceof Error ? error.message : "Kesalahan API."}`);
      });
    }
  }, [datasets, loadDataset, notify]);

  const loadWorkspace = useCallback(async () => {
    setDataLoading(true);
    try {
      const [backendDatasets, backendVisualizations] = await Promise.all([
        fetchAllPages<BackendDataset>("/datasets"),
        fetchAllPages<BackendVisualization>("/visualizations"),
      ]);
      const nextDatasets = backendDatasets.map((dataset) => toDataset(dataset));
      setDatasets(nextDatasets);
      setVisualizations(backendVisualizations.map((item) => toVisualization(item, nextDatasets)));
      const savedId = localStorage.getItem(currentDatasetKey);
      const selectedId = savedId && nextDatasets.some((item) => item.id === savedId)
        ? savedId
        : nextDatasets[0]?.id ?? "";
      setCurrentDatasetId(selectedId);
      if (selectedId) await loadDataset(selectedId, nextDatasets);
    } finally {
      setDataLoading(false);
    }
  }, [loadDataset]);

  const loadProfile = useCallback((currentUser: AuthUser) => {
    setUser(currentUser);
    setSettings((previous) => ({
      ...previous,
      name: currentUser.fullName ?? currentUser.username,
      email: currentUser.email,
    }));
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(preferencesKey);
      const legacy = saved ? null : localStorage.getItem(legacyStorageKey);
      const legacyWorkspace = legacy ? JSON.parse(legacy) as unknown : null;
      const parsed = saved
        ? JSON.parse(saved) as Partial<Settings>
        : isRecord(legacyWorkspace) && isRecord(legacyWorkspace.settings)
          ? legacyWorkspace.settings as Partial<Settings>
          : null;
      if (parsed) {
        const restored = { ...defaultSettings, ...parsed };
        if (!["Terang", "Gelap", "Sistem"].includes(restored.theme)) restored.theme = defaultSettings.theme;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore saved UI preferences after hydration.
        setSettings((previous) => ({ ...previous, ...restored }));
      }
      const savedDatasetId = localStorage.getItem(currentDatasetKey);
      if (savedDatasetId) setCurrentDatasetId(savedDatasetId);
    } catch (error) {
      console.error("Could not restore MatikSight UI preferences.", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(preferencesKey, JSON.stringify({
        theme: settings.theme,
        defaultChart: settings.defaultChart,
        pageSize: settings.pageSize,
      }));
      if (currentDatasetId) localStorage.setItem(currentDatasetKey, currentDatasetId);
      else localStorage.removeItem(currentDatasetKey);
    } catch (error) {
      console.error("Could not save MatikSight UI preferences.", error);
    }
  }, [settings.theme, settings.defaultChart, settings.pageSize, currentDatasetId]);

  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== "Sistem") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("Sistem");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings.theme]);

  useEffect(() => {
    let active = true;
    const handleUnauthorized = () => {
      if (!active) return;
      setUser(null);
      setDatasets([]);
      setVisualizations([]);
      setCurrentDatasetId("");
      setAuthError("");
      setAuthReady(true);
    };
    window.addEventListener("matiksight:unauthorized", handleUnauthorized);
    const restoreSession = async () => {
      if (!hasAccessToken()) {
        setAuthReady(true);
        return;
      }
      try {
        const response = await apiRequest<AuthResponse>("/auth/me");
        if (!active) return;
        loadProfile(response.data.user);
        setAuthError("");
        await loadWorkspace();
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Sesi tidak dapat dipulihkan.";
        if (!(error instanceof Error && "status" in error && error.status === 401)) setAuthError(message);
        else setUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    };
    void restoreSession();
    return () => {
      active = false;
      window.removeEventListener("matiksight:unauthorized", handleUnauthorized);
    };
  }, [loadProfile, loadWorkspace]);

  const uploadDataset = useCallback(async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    const response = await apiRequest<BackendUploadResponse>("/datasets", { method: "POST", body });
    const columns = response.columns ?? response.dataset.columns ?? [];
    const uploaded = toDataset({
      ...response.dataset,
      originalFilename: response.dataset.originalFilename || file.name,
      fileSize: response.dataset.fileSize || file.size,
      columns,
      columnMetadata: response.columnMetadata,
      profiling: response.profiling,
    }, response.preview ?? []);
    setDatasets((previous) => [uploaded, ...previous.filter((dataset) => dataset.id !== uploaded.id)]);
    setCurrentDatasetId(uploaded.id);
    return uploaded;
  }, []);

  const removeDataset = useCallback(async (id: string) => {
    await apiRequest<{ success: true; message: string }>(`/datasets/${encodeURIComponent(id)}`, { method: "DELETE" });
    const remaining = datasets.filter((dataset) => dataset.id !== id);
    setDatasets(remaining);
    if (currentDatasetId === id) {
      const next = remaining[0];
      setCurrentDatasetId(next?.id ?? "");
      if (next && next.rows > 0) await loadDataset(next.id, remaining);
    }
  }, [datasets, currentDatasetId, loadDataset]);

  const saveVisualization = useCallback(async (visualization: Omit<Visualization, "id" | "createdAt">) => {
    const dataset = datasets.find((item) => item.id === visualization.datasetId);
    const xColumn = dataset?.columns?.find((column) => column.key === visualization.xKey);
    const yColumn = dataset?.columns?.find((column) => column.key === visualization.yKey);
    const apiYAxis = yColumn?.name ?? dataset?.columns?.find((column) => column.key !== xColumn?.key)?.name;
    if (!dataset || !xColumn || (visualization.aggregation !== "count" && !yColumn)) {
      throw new Error("Dataset dan kolom visualisasi tidak tersedia.");
    }
    if (!apiYAxis) {
      throw new Error("Visualisasi hitung memerlukan minimal dua kolom untuk disimpan.");
    }
    const response = await apiRequest<BackendVisualizationResponse>("/visualizations", {
      method: "POST",
      body: {
        datasetId: visualization.datasetId,
        name: visualization.title,
        configuration: {
          chartType: visualization.chartType.toLowerCase(),
          xAxis: xColumn.name,
          yAxis: apiYAxis,
          groupBy: [],
          aggregation: visualization.aggregation,
          filters: visualization.filters ?? [],
          sort: { column: "value", direction: "desc" },
          limit: 100,
        },
      },
    });
    setVisualizations((previous) => [toVisualization(response.data, datasets), ...previous]);
  }, [datasets]);

  const updateVisualization = useCallback(async (id: string, updates: Partial<Visualization>) => {
    const response = await apiRequest<BackendVisualizationResponse>(`/visualizations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { ...(updates.title !== undefined ? { name: updates.title } : {}) },
    });
    setVisualizations((previous) => previous.map((item) => item.id === id
      ? toVisualization(response.data, datasets)
      : item));
  }, [datasets]);

  const removeVisualization = useCallback(async (id: string) => {
    await apiRequest<{ success: true; message: string }>(`/visualizations/${encodeURIComponent(id)}`, { method: "DELETE" });
    setVisualizations((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    if (updates.theme) applyTheme(updates.theme);
    setSettings((previous) => ({ ...previous, ...updates }));
  }, []);

  const updateProfile = useCallback(async (profile: ProfileUpdate) => {
    const response = await apiRequest<AuthResponse>("/users/me", {
      method: "PATCH",
      body: { fullName: profile.name, email: profile.email },
    });
    loadProfile(response.data.user);
  }, [loadProfile]);

  const completeLogin = useCallback(async (currentUser: AuthUser) => {
    loadProfile(currentUser);
    setAuthError("");
    setAuthReady(true);
    try {
      await loadWorkspace();
    } catch (error) {
      notify(`Berhasil masuk, tetapi workspace gagal dimuat: ${error instanceof Error ? error.message : "Kesalahan API."}`);
    }
  }, [loadProfile, loadWorkspace, notify]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    await completeLogin(await signIn(credentials));
  }, [completeLogin]);

  const loginWithGoogle = useCallback(async (idToken: string, remember: boolean) => {
    await completeLogin(await signInWithGoogle(idToken, remember));
  }, [completeLogin]);

  const linkGoogle = useCallback(async (idToken: string) => {
    await linkGoogleAccount(idToken);
  }, []);

  const register = useCallback(async (details: RegistrationDetails) => {
    const currentUser = await registerAccount(details);
    loadProfile(currentUser);
    setAuthError("");
    setAuthReady(true);
    try {
      await loadWorkspace();
    } catch (error) {
      notify(`Akun berhasil dibuat, tetapi workspace gagal dimuat: ${error instanceof Error ? error.message : "Kesalahan API."}`);
    }
  }, [loadProfile, loadWorkspace, notify]);

  const logout = useCallback(async () => {
    try {
      await apiRequest<{ success: true; message: string }>("/auth/logout", { method: "POST" });
    } finally {
      clearAccessToken();
      setUser(null);
      setDatasets([]);
      setVisualizations([]);
      setCurrentDatasetId("");
    }
  }, []);

  const currentDataset = datasets.find((dataset) => dataset.id === currentDatasetId) ?? datasets[0] ?? null;
  const value = useMemo(() => ({
    datasets, visualizations, settings, toast, toastClosing, user, authReady, authError, dataLoading,
    uploadDataset, removeDataset, saveVisualization, updateVisualization, removeVisualization,
    updateSettings, updateProfile, login, loginWithGoogle, linkGoogle, register, logout, notify, currentDataset,
    setCurrentDatasetId: selectDataset, rows: currentDataset?.data ?? [],
  }), [
    datasets, visualizations, settings, toast, toastClosing, user, authReady, authError, dataLoading,
    uploadDataset, removeDataset, saveVisualization, updateVisualization, removeVisualization,
    updateSettings, updateProfile, login, loginWithGoogle, linkGoogle, register, logout, notify, currentDataset, selectDataset,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider.");
  return context;
}
