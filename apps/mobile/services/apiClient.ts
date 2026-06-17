import { Platform } from "react-native";

/**
 * 后端错误包络(与 apps/api/app/core/errors.py 对齐):
 *   { "error": { "code": string, "message": string, "details"?: unknown } }
 */
export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/** 网络/超时/后端错误统一抛出的类型,UI 层可据 code 做分支处理。 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(params: { code: string; message: string; status: number; details?: unknown }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }
}

/**
 * 解析 baseUrl:
 * - 优先用 EXPO_PUBLIC_API_URL(.env / .env.example 已预留)。
 * - 缺省时按平台兜底:Android 模拟器走 10.0.2.2(宿主机回环),其余走 localhost。
 *   真机调试需在 .env 写本机局域网 IP(如 http://192.168.x.x:8000)。
 *
 * @deprecated App 已独立化(AI 直连 DeepSeek + 本地 store),不再走 FastAPI 后端。
 *   request/getHealth/API_BASE_URL 仅保留作可选的 web 联调,正常打包路径不使用。
 *   ApiError 类仍被各屏幕 import 做 catch 分支判断,必须保留。
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://localhost:8000";
}

export const API_BASE_URL = resolveBaseUrl();

const DEFAULT_TIMEOUT_MS = 12000;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
};

function isErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const error = (value as { error?: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

/**
 * 统一请求入口:拼 baseUrl、注入 JSON header、超时控制、错误包络解析。
 * 成功返回已解析的 JSON(范型 T);失败抛 ApiError。
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      throw new ApiError({ code: "timeout", message: `请求超时(${timeoutMs}ms):${method} ${path}`, status: 0 });
    }
    throw new ApiError({
      code: "network_error",
      message: err instanceof Error ? err.message : "网络请求失败,请检查后端是否启动或地址是否正确。",
      status: 0,
      details: err
    });
  }
  clearTimeout(timeoutId);

  const raw = await response.text();
  const parsed: unknown = raw ? safeJsonParse(raw) : null;

  if (!response.ok) {
    if (isErrorEnvelope(parsed)) {
      throw new ApiError({
        code: parsed.error.code,
        message: parsed.error.message,
        status: response.status,
        details: parsed.error.details
      });
    }
    throw new ApiError({
      code: "http_error",
      message: `HTTP ${response.status}:${method} ${path}`,
      status: response.status,
      details: parsed
    });
  }

  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type HealthResponse = {
  status: string;
  app: string;
  version: string;
  environment: string;
};

/** 健康检查,联调第一步:确认前端能打到后端。 */
export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}
