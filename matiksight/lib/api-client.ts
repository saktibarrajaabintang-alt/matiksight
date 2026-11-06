export type AuthUser = {
  id: string;
  fullName: string | null;
  username: string;
  email: string;
  profilePhotoUrl?: string | null;
  accountStatus?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendColumnMetadata = {
  name: string;
  type: string;
  nullable?: boolean;
  nullCount?: number;
  uniqueCount?: number;
  min?: number | string | null;
  max?: number | string | null;
  mean?: number | null;
};

export type BackendDataset = {
  id: string;
  name: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  createdAt: string;
  updatedAt?: string;
  sheetName?: string | null;
  columns?: string[];
  columnMetadata?: BackendColumnMetadata[];
  profiling?: {
    missingValues?: number;
    dateRange?: { column: string; min: string; max: string }[];
  };
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type BackendRow = Record<string, unknown> | unknown[];

export type BackendDatasetListResponse = {
  success: true;
  data: BackendDataset[];
  pagination: Pagination;
};

export type BackendDatasetPreviewResponse = {
  success: true;
  dataset: Pick<BackendDataset, "id" | "name" | "fileType" | "rowCount" | "columnCount"> & Partial<Pick<BackendDataset, "columns" | "columnMetadata" | "profiling">>;
  data: BackendRow[];
  pagination: Pagination;
};

export type BackendUploadResponse = {
  success: true;
  dataset: BackendDataset;
  columns: string[];
  totalRows: number;
  preview: BackendRow[];
  columnMetadata: BackendColumnMetadata[];
  profiling: BackendDataset["profiling"];
};

export type BackendVisualization = {
  id: string;
  datasetId: string;
  name: string;
  description: string | null;
  chartType: string;
  configuration: {
    chartType: string;
    xAxis: string;
    yAxis: string;
    groupBy?: string[];
    aggregation?: string;
    filters?: { column: string; operator: string; value?: unknown }[];
    sort?: { column: string; direction: "asc" | "desc" } | null;
    limit?: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type BackendVisualizationListResponse = {
  success: true;
  data: BackendVisualization[];
  pagination: Pagination;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const accessTokenKey = "matiksight-access-token";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(accessTokenKey) ?? sessionStorage.getItem(accessTokenKey);
}

export function hasAccessToken() {
  return getStoredToken() !== null;
}

export function storeAccessToken(token: string, remember: boolean) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(accessTokenKey);
  sessionStorage.removeItem(accessTokenKey);
  (remember ? localStorage : sessionStorage).setItem(accessTokenKey, token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(accessTokenKey);
  sessionStorage.removeItem(accessTokenKey);
}

function responseMessage(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null || !("message" in payload)) return fallback;
  const { message } = payload;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) return message.join(" ");
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { body, auth = true, headers: requestHeaders, ...requestOptions } = options;
  const requestUrl = `${apiBaseUrl}${path}`;
  const headers = new Headers(requestHeaders);
  const token = auth ? getStoredToken() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData || body instanceof Blob || typeof body === "string") {
    requestBody = body;
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...requestOptions,
      body: requestBody,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    if (error instanceof TypeError) {
      throw new ApiError(
        `Backend API tidak dapat dijangkau di ${apiBaseUrl}. Pastikan backend berjalan dan CORS mengizinkan origin frontend.`,
        0,
      );
    }
    throw error;
  }
  const text = await response.text();
  let payload: unknown;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (response.status === 401 && auth && token) {
    clearAccessToken();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("matiksight:unauthorized"));
  }
  if (!response.ok) {
    const method = requestOptions.method ?? "GET";
    const fallback = response.status === 404
      ? `Rute API ${method} ${path} tidak ditemukan di ${apiBaseUrl}. Pastikan NEXT_PUBLIC_API_BASE_URL mengarah ke backend NestJS, bukan server frontend.`
      : `Permintaan gagal (HTTP ${response.status}).`;
    throw new ApiError(responseMessage(payload, fallback), response.status);
  }
  return payload as T;
}

export async function fetchAllPages<T>(path: string) {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const response = await apiRequest<{ data: T[]; pagination: Pagination }>(
      `${path}${separator}page=${page}&limit=100`,
    );
    items.push(...response.data);
    totalPages = response.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);
  return items;
}
