"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Dataset, DatasetRecord, ParsedDataset, Visualization } from "@/lib/data-utils";
import { buildDatasetProfile } from "@/lib/dataset-service";

export type Settings = { name: string; email: string; theme: "Terang" | "Gelap" | "Sistem"; defaultChart: string; pageSize: number };
type AppContextValue = {
  datasets: Dataset[];
  visualizations: Visualization[];
  settings: Settings;
  toast: string;
  addDataset: (fileName: string, fileSize: number, type: Dataset["type"], parsed: ParsedDataset) => { id: string; duplicate: boolean };
  removeDataset: (id: string) => void;
  saveVisualization: (visualization: Omit<Visualization, "id" | "createdAt">) => void;
  updateVisualization: (id: string, updates: Partial<Visualization>) => void;
  removeVisualization: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  notify: (message: string) => void;
  currentDataset: Dataset | null;
  setCurrentDatasetId: (id: string) => void;
  rows: DatasetRecord[];
};

const storageKey = "matiksight-workspace-v2";
const legacyStorageKey = "matiksight-workspace-v1";
const defaultSettings: Settings = { name: "", email: "", theme: "Terang", defaultChart: "Bar", pageSize: 10 };
const AppContext = createContext<AppContextValue | null>(null);

function applyTheme(theme: Settings["theme"]) {
  const dark = theme === "Gelap" || (
    theme === "Sistem" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const datasetsRef = useRef<Dataset[]>([]);
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [currentDatasetId, setCurrentDatasetId] = useState("");
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const legacy = saved ? null : localStorage.getItem(legacyStorageKey);
      const stored = saved ?? legacy;
      if (stored) {
        const migratingLegacy = !saved;
        const parsed = JSON.parse(stored) as Partial<{ datasets: Dataset[]; visualizations: Visualization[]; settings: Settings; currentDatasetId: string }>;
        const restoredDatasets = Array.isArray(parsed.datasets)
          ? parsed.datasets
            .filter((dataset) => !["dataset-sales", "dataset-students", "dataset-school"].includes(dataset.id))
            .map((dataset) => {
              const hasDynamicData = Array.isArray(dataset.columns)
                && Array.isArray(dataset.data)
                && dataset.data.every(Array.isArray);
              if (hasDynamicData && !migratingLegacy) return dataset;
              return {
                ...dataset,
                rows: 0,
                data: [],
                columns: [],
                profile: buildDatasetProfile([], []),
                status: "Belum diproses" as const,
              };
            })
          : [];
        const datasetIds = new Set(restoredDatasets.map((dataset) => dataset.id));
        const restoredVisualizations = Array.isArray(parsed.visualizations)
          ? migratingLegacy ? [] : parsed.visualizations.filter((visualization) =>
            datasetIds.has(visualization.datasetId)
            && typeof visualization.xKey === "string"
            && typeof visualization.yKey === "string"
            && typeof visualization.aggregation === "string",
          )
          : [];
        datasetsRef.current = restoredDatasets;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore persisted workspace after mount without changing server-rendered defaults.
        setDatasets(restoredDatasets);
        setVisualizations(restoredVisualizations);
        if (parsed.settings && typeof parsed.settings === "object") {
          const restoredSettings = { ...defaultSettings, ...parsed.settings };
          if (!["Terang", "Gelap", "Sistem"].includes(restoredSettings.theme)) {
            restoredSettings.theme = defaultSettings.theme;
          }
          if (restoredSettings.name === "Bintang" && restoredSettings.email === "bintang@matikcreative.id") {
            restoredSettings.name = "";
            restoredSettings.email = "";
          }
          setSettings(restoredSettings);
        }
        const savedCurrentId = parsed.currentDatasetId;
        setCurrentDatasetId(
          typeof savedCurrentId === "string" && restoredDatasets.some((dataset) => dataset.id === savedCurrentId)
            ? savedCurrentId
            : restoredDatasets[0]?.id ?? "",
        );
        if (migratingLegacy) localStorage.removeItem(legacyStorageKey);
      }
    } catch (error) {
      console.error("Could not restore the MatikSight workspace from local storage.", error);
      localStorage.removeItem(storageKey);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ datasets, visualizations, settings, currentDatasetId }));
    } catch (error) {
      console.error("Could not save the MatikSight workspace to local storage.", error);
    }
  }, [datasets, visualizations, settings, currentDatasetId, ready]);

  useEffect(() => {
    if (!ready) return;
    applyTheme(settings.theme);
    if (settings.theme !== "Sistem") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("Sistem");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings.theme, ready]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const addDataset = useCallback((fileName: string, fileSize: number, type: Dataset["type"], parsed: ParsedDataset) => {
    const size = Math.ceil(fileSize / 1024);
    const content = JSON.stringify({ columns: parsed.columns, rows: parsed.rows });
    const duplicate = datasetsRef.current.find((dataset) =>
      dataset.name === fileName
      && dataset.type === type
      && JSON.stringify({ columns: dataset.columns ?? [], rows: dataset.data ?? [] }) === content,
    );
    if (duplicate) {
      setCurrentDatasetId(duplicate.id);
      return { id: duplicate.id, duplicate: true };
    }

    const id = `dataset-${crypto.randomUUID()}`;
    const uploaded = new Date();
    const dataset: Dataset = {
      id,
      name: fileName,
      size,
      type,
      rows: parsed.rows.length,
      data: parsed.rows,
      columns: parsed.columns,
      profile: parsed.profile,
      sheetName: parsed.sheetName,
      uploadedAt: uploaded.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
      createdAt: uploaded.toISOString(),
      status: parsed.rows.length && parsed.columns.length ? "Selesai" : "Belum diproses",
    };
    datasetsRef.current = [dataset, ...datasetsRef.current];
    setDatasets(datasetsRef.current);
    setCurrentDatasetId(id);
    return { id, duplicate: false };
  }, []);

  const removeDataset = useCallback((id: string) => {
    datasetsRef.current = datasetsRef.current.filter((dataset) => dataset.id !== id);
    setDatasets(datasetsRef.current);
  }, []);

  const saveVisualization = useCallback((visualization: Omit<Visualization, "id" | "createdAt">) => {
    setVisualizations((previous) => [{ ...visualization, id: `visual-${crypto.randomUUID()}`, createdAt: "Baru saja" }, ...previous]);
  }, []);

  const updateVisualization = useCallback((id: string, updates: Partial<Visualization>) => {
    setVisualizations((previous) => previous.map((item) => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const removeVisualization = useCallback((id: string) => {
    setVisualizations((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    if (updates.theme) applyTheme(updates.theme);
    setSettings((previous) => ({ ...previous, ...updates }));
  }, []);

  const currentDataset = datasets.find((dataset) => dataset.id === currentDatasetId) ?? datasets[0] ?? null;
  const value = useMemo(() => ({
    datasets, visualizations, settings, toast, addDataset, removeDataset, saveVisualization,
    updateVisualization, removeVisualization, updateSettings, notify, currentDataset,
    setCurrentDatasetId, rows: currentDataset?.data ?? [],
  }), [datasets, visualizations, settings, toast, addDataset, removeDataset, saveVisualization, updateVisualization, removeVisualization, updateSettings, notify, currentDataset]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider.");
  return context;
}
