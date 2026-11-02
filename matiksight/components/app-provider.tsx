"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Dataset, SalesRow, Visualization } from "@/lib/data-utils";

export type Settings = { name: string; email: string; theme: "Terang" | "Gelap" | "Sistem"; defaultChart: string; pageSize: number };
type AppContextValue = {
  datasets: Dataset[];
  visualizations: Visualization[];
  settings: Settings;
  toast: string;
  addDataset: (fileName: string, fileSize: number, type: Dataset["type"], rows: SalesRow[]) => string;
  removeDataset: (id: string) => void;
  saveVisualization: (visualization: Omit<Visualization, "id" | "createdAt">) => void;
  updateVisualization: (id: string, updates: Partial<Visualization>) => void;
  removeVisualization: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  notify: (message: string) => void;
  currentDataset: Dataset | null;
  setCurrentDatasetId: (id: string) => void;
  rows: SalesRow[];
};

const storageKey = "matiksight-workspace-v2";
const legacyStorageKey = "matiksight-workspace-v1";
const defaultSettings: Settings = { name: "", email: "", theme: "Terang", defaultChart: "Bar", pageSize: 10 };
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
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
            .map((dataset) => migratingLegacy ? { ...dataset, rows: 0, status: "Belum diproses" as const } : dataset)
          : [];
        const restoredVisualizations = Array.isArray(parsed.visualizations)
          ? migratingLegacy ? [] : parsed.visualizations.filter((visualization) => !["visual-1", "visual-2"].includes(visualization.id))
          : [];
        setDatasets(restoredDatasets);
        setVisualizations(restoredVisualizations);
        if (parsed.settings && typeof parsed.settings === "object") {
          const restoredSettings = { ...defaultSettings, ...parsed.settings };
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

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const addDataset = useCallback((fileName: string, fileSize: number, type: Dataset["type"], rows: SalesRow[]) => {
    const id = `dataset-${crypto.randomUUID()}`;
    setDatasets((previous) => [{
      id, name: fileName, size: Math.round(fileSize / 1024), type, rows: rows.length, data: rows,
      uploadedAt: "Baru saja", createdAt: new Date().toISOString(), status: rows.length ? "Selesai" : "Belum diproses",
    }, ...previous]);
    setCurrentDatasetId(id);
    return id;
  }, []);

  const removeDataset = useCallback((id: string) => {
    setDatasets((previous) => previous.filter((dataset) => dataset.id !== id));
  }, []);

  const saveVisualization = useCallback((visualization: Omit<Visualization, "id" | "createdAt">) => {
    setVisualizations((previous) => [{ ...visualization, id: `visual-${Date.now()}`, createdAt: "Baru saja" }, ...previous]);
  }, []);

  const updateVisualization = useCallback((id: string, updates: Partial<Visualization>) => {
    setVisualizations((previous) => previous.map((item) => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const removeVisualization = useCallback((id: string) => {
    setVisualizations((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
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
