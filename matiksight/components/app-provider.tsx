"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ColumnMetadata, DataRow, Dataset, SavedReport, Visualization, ChartType } from "@/lib/data-utils";

export type Settings = { name: string; email: string; theme: "Terang" | "Gelap" | "Sistem"; defaultChart: string; pageSize: number };
type UserProfile = { id: string; fullName: string | null; username: string; email: string };
type DatasetRecord = {
  id: string; name: string; originalFilename: string; fileType: string; fileSize: number;
  rowCount: number; columns?: string[]; columnMetadata?: ColumnMetadata[]; createdAt: string;
};
type VisualizationRecord = {
  id: string; datasetId: string; name: string; chartType: string;
  configuration: { chartType: string; xAxis: string; yAxis: string };
  createdAt: string;
};
type ApiList<T> = { success: boolean; data: T[] };
type ApiProfile = { success: boolean; data: { user: UserProfile } };
type AuthResponse = { success: boolean; data: { accessToken: string; user: UserProfile } };
type AppContextValue = {
  datasets: Dataset[];
  visualizations: Visualization[];
  reports: SavedReport[];
  settings: Settings;
  toast: string;
  token: string | null;
  authReady: boolean;
  loading: boolean;
  rows: DataRow[];
  columnMetadata: ColumnMetadata[];
  addDataset: (file: File) => Promise<void>;
  removeDataset: (id: string) => Promise<void>;
  saveVisualization: (visualization: { title: string; datasetId: string; chartType: ChartType; xKey: string; yKey: string; aggregation: string }) => Promise<void>;
  renameDataset: (id: string, name: string) => Promise<void>;
  updateVisualization: (id: string, updates: Partial<Visualization>) => Promise<void>;
  removeVisualization: (id: string) => Promise<void>;
  saveReport: (datasetId: string, title: string, configuration: Record<string, unknown>, snapshot: Record<string, unknown>) => Promise<void>;
  removeReport: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: { fullName: string; username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  notify: (message: string) => void;
  currentDataset: Dataset | null;
  setCurrentDatasetId: (id: string) => void;
  refreshDatasetPreview: (id: string) => Promise<void>;
};

const tokenStorageKey = "matiksight-access-token";
const settingsStorageKey = "matiksight-preferences";
const defaultSettings: Settings = { name: "", email: "", theme: "Terang", defaultChart: "Bar", pageSize: 10 };
const AppContext = createContext<AppContextValue | null>(null);

function mapDataset(record: DatasetRecord): Dataset {
  return {
    id: record.id,
    name: record.name,
    size: Math.round(record.fileSize / 1024),
    type: record.fileType === "csv" ? "CSV" : "Excel",
    rows: record.rowCount,
    uploadedAt: new Date(record.createdAt).toLocaleString("id-ID"),
    createdAt: record.createdAt,
    status: "Selesai",
    columns: record.columns,
    columnMetadata: record.columnMetadata,
  };
}

function mapVisualization(record: VisualizationRecord, datasets: Dataset[]): Visualization {
  const config = record.configuration;
  return {
    id: record.id,
    datasetId: record.datasetId,
    title: record.name,
    datasetName: datasets.find((dataset) => dataset.id === record.datasetId)?.name ?? "Dataset",
    chartType: (record.chartType.charAt(0).toUpperCase() + record.chartType.slice(1)) as ChartType,
    xKey: config.xAxis,
    yKey: config.yAxis,
    createdAt: new Date(record.createdAt).toLocaleString("id-ID"),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [currentDatasetId, setCurrentDatasetId] = useState("");
  const [rows, setRows] = useState<DataRow[]>([]);
  const [previewDatasetId, setPreviewDatasetId] = useState("");
  const [columnMetadata, setColumnMetadata] = useState<ColumnMetadata[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const initialize = () => {
      try {
        setToken(localStorage.getItem(tokenStorageKey));
        const storedSettings = localStorage.getItem(settingsStorageKey);
        if (storedSettings) setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) as Partial<Settings> });
      } catch (error) {
        console.error("Could not restore MatikSight preferences.", error);
      } finally {
        setAuthReady(true);
      }
    };
    const timer = window.setTimeout(initialize, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setDatasets([]);
    setVisualizations([]);
    setReports([]);
    setRows([]);
    setColumnMetadata([]);
    setCurrentDatasetId("");
    setSettings((current) => ({ ...current, name: "", email: "" }));
  }, []);

  const refreshWorkspace = useCallback(async (accessToken: string) => {
    setLoading(true);
    try {
      const [profile, datasetResponse, visualizationResponse, reportResponse] = await Promise.all([
        apiRequest<ApiProfile>("/users/me", { token: accessToken }),
        apiRequest<ApiList<DatasetRecord>>("/datasets?limit=100", { token: accessToken }),
        apiRequest<ApiList<VisualizationRecord>>("/visualizations?limit=100", { token: accessToken }),
        apiRequest<ApiList<{ id: string; datasetId: string; name: string; description?: string | null; createdAt: string }>>("/reports?limit=100", { token: accessToken }),
      ]);
      const mappedDatasets = datasetResponse.data.map(mapDataset);
      setDatasets(mappedDatasets);
      setVisualizations(visualizationResponse.data.map((item) => mapVisualization(item, mappedDatasets)));
      setReports(reportResponse.data.map((item) => ({
        id: item.id,
        datasetId: item.datasetId,
        title: item.name,
        description: item.description,
        createdAt: new Date(item.createdAt).toLocaleString("id-ID"),
      })));
      setSettings((current) => ({ ...current, name: profile.data.user.fullName ?? "", email: profile.data.user.email }));
      setCurrentDatasetId((current) => mappedDatasets.some((item) => item.id === current) ? current : mappedDatasets[0]?.id ?? "");
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 401) {
        clearSession();
      } else {
        notify(error instanceof Error ? error.message : "Gagal memuat data akun.");
      }
    } finally {
      setLoading(false);
    }
  }, [clearSession, notify]);

  useEffect(() => {
    if (!authReady || !token) return;
    const timer = window.setTimeout(() => { void refreshWorkspace(token); }, 0);
    return () => window.clearTimeout(timer);
  }, [authReady, token, refreshWorkspace]);

  const refreshDatasetPreview = useCallback(async (id: string) => {
    if (!token || !id) {
      setRows([]);
      setColumnMetadata([]);
      setPreviewDatasetId("");
      return;
    }
    const result = await apiRequest<{ data: DataRow[]; dataset: { columnMetadata?: ColumnMetadata[] } }>(
      `/datasets/${encodeURIComponent(id)}/preview?limit=100`,
      { token },
    );
    setRows(result.data);
    setColumnMetadata(result.dataset.columnMetadata ?? []);
    setPreviewDatasetId(id);
  }, [token]);

  useEffect(() => {
    if (!token || !currentDatasetId) return;
    const timer = window.setTimeout(() => {
      void refreshDatasetPreview(currentDatasetId).catch((error: unknown) => {
        notify(error instanceof Error ? error.message : "Gagal memuat pratinjau dataset.");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [token, currentDatasetId, refreshDatasetPreview, notify]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await apiRequest<AuthResponse>("/auth/login", { body: { identifier, password } });
    localStorage.setItem(tokenStorageKey, result.data.accessToken);
    setSettings((current) => ({ ...current, name: result.data.user.fullName ?? "", email: result.data.user.email }));
    setToken(result.data.accessToken);
  }, []);

  const register = useCallback(async (input: { fullName: string; username: string; email: string; password: string }) => {
    await apiRequest("/auth/register", { body: input });
    await login(input.email, input.password);
  }, [login]);

  const logout = useCallback(async () => {
    try {
      if (token) await apiRequest("/auth/logout", { token });
    } finally {
      clearSession();
    }
  }, [clearSession, token]);

  const addDataset = useCallback(async (file: File) => {
    if (!token) throw new Error("Silakan masuk kembali.");
    const form = new FormData();
    form.append("file", file);
    const result = await apiRequest<{ dataset: DatasetRecord }>("/datasets", { token, body: form });
    const dataset = mapDataset(result.dataset);
    setDatasets((previous) => [dataset, ...previous.filter((item) => item.id !== dataset.id)]);
    setCurrentDatasetId(dataset.id);
  }, [token]);

  const removeDataset = useCallback(async (id: string) => {
    if (!token) throw new Error("Silakan masuk kembali.");
    await apiRequest(`/datasets/${encodeURIComponent(id)}`, { token, method: "DELETE" });
    setDatasets((previous) => previous.filter((item) => item.id !== id));
    setVisualizations((previous) => previous.filter((item) => item.datasetId !== id));
    setReports((previous) => previous.filter((item) => item.datasetId !== id));
    if (currentDatasetId === id) setCurrentDatasetId(datasets.find((item) => item.id !== id)?.id ?? "");
  }, [currentDatasetId, datasets, token]);

  const renameDataset = useCallback(async (id: string, name: string) => {
    if (!token) throw new Error("Silakan masuk kembali.");
    const result = await apiRequest<{ data: DatasetRecord }>(`/datasets/${encodeURIComponent(id)}`, {
      token,
      method: "PATCH",
      body: { name },
    });
    setDatasets((previous) => previous.map((item) => item.id === id ? { ...item, name: result.data.name } : item));
  }, [token]);

  const saveVisualization = useCallback(async (visualization: { title: string; datasetId: string; chartType: ChartType; xKey: string; yKey: string; aggregation: string }) => {
    if (!token) throw new Error("Silakan masuk kembali.");
    const result = await apiRequest<{ data: VisualizationRecord }>("/visualizations", {
      token,
      body: {
        datasetId: visualization.datasetId,
        name: visualization.title,
        configuration: {
          chartType: visualization.chartType.toLowerCase(),
          xAxis: visualization.xKey,
          yAxis: visualization.yKey,
          groupBy: visualization.chartType === "Scatter" ? [] : [visualization.xKey],
          aggregation: visualization.aggregation,
          limit: 100,
        },
      },
    });
    setVisualizations((previous) => [mapVisualization(result.data, datasets), ...previous]);
  }, [datasets, token]);

  const updateVisualization = useCallback(async (id: string, updates: Partial<Visualization>) => {
    if (!token) throw new Error("Silakan masuk kembali.");
    await apiRequest(`/visualizations/${encodeURIComponent(id)}`, {
      token,
      method: "PATCH",
      body: { ...(updates.title !== undefined ? { name: updates.title } : {}) },
    });
    setVisualizations((previous) => previous.map((item) => item.id === id ? { ...item, ...updates } : item));
  }, [token]);

  const removeVisualization = useCallback(async (id: string) => {
    if (!token) throw new Error("Silakan masuk kembali.");
    await apiRequest(`/visualizations/${encodeURIComponent(id)}`, { token, method: "DELETE" });
    setVisualizations((previous) => previous.filter((item) => item.id !== id));
  }, [token]);

  const saveReport = useCallback(async (datasetId: string, title: string, configuration: Record<string, unknown>, snapshot: Record<string, unknown>) => {
    if (!token) throw new Error("Silakan masuk kembali.");
    const result = await apiRequest<{ data: { id: string; datasetId: string; name: string; description?: string | null; createdAt: string } }>("/reports", {
      token,
      body: { datasetId, name: title, configuration, snapshot },
    });
    setReports((previous) => [{
      id: result.data.id,
      datasetId: result.data.datasetId,
      title: result.data.name,
      description: result.data.description,
      createdAt: new Date(result.data.createdAt).toLocaleString("id-ID"),
    }, ...previous]);
  }, [token]);

  const removeReport = useCallback(async (id: string) => {
    if (!token) throw new Error("Silakan masuk kembali.");
    await apiRequest(`/reports/${encodeURIComponent(id)}`, { token, method: "DELETE" });
    setReports((previous) => previous.filter((item) => item.id !== id));
  }, [token]);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const next = { ...settings, ...updates };
    if (token && (updates.name !== undefined || updates.email !== undefined)) {
      const result = await apiRequest<ApiProfile>("/users/me", {
        token,
        method: "PATCH",
        body: { fullName: next.name, email: next.email },
      });
      next.name = result.data.user.fullName ?? "";
      next.email = result.data.user.email;
    }
    setSettings(next);
    localStorage.setItem(settingsStorageKey, JSON.stringify({
      theme: next.theme,
      defaultChart: next.defaultChart,
      pageSize: next.pageSize,
    }));
  }, [settings, token]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!token) throw new Error("Silakan masuk kembali.");
    await apiRequest("/users/me/password", {
      token,
      method: "PATCH",
      body: { currentPassword, newPassword },
    });
  }, [token]);

  const currentDataset = datasets.find((dataset) => dataset.id === currentDatasetId) ?? datasets[0] ?? null;
  const value = useMemo(() => ({
    datasets, visualizations, reports, settings, toast, token, authReady, loading,     rows: previewDatasetId === currentDatasetId ? rows : [], columnMetadata,
    addDataset, removeDataset, renameDataset, saveVisualization, updateVisualization, removeVisualization, saveReport,
    removeReport, updateSettings, changePassword, login, register, logout, notify, currentDataset,
    setCurrentDatasetId, refreshDatasetPreview,
  }), [
    datasets, visualizations, reports, settings, toast, token, authReady, loading, rows, previewDatasetId, currentDatasetId, columnMetadata,
    addDataset, removeDataset, renameDataset, saveVisualization, updateVisualization, removeVisualization, saveReport,
    removeReport, updateSettings, changePassword, login, register, logout, notify, currentDataset, refreshDatasetPreview,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider.");
  return context;
}
