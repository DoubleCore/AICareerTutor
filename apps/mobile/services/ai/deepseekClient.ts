import { ApiError } from "../apiClient";

/**
 * App 内直连 DeepSeek(OpenAI 兼容端点)。取代原 FastAPI 后端的 AI 调用,
 * 使 App 可独立打包运行(不依赖部署后端)。
 *
 * key/baseUrl/model 走 EXPO_PUBLIC_* 环境变量(metro 打包期静态内联,改值须重新 build)。
 * 注意:web 端浏览器会撞 CORS,AI 真调以真机/模拟器为准;原生包无 CORS。
 */

const BASE_URL = (process.env.EXPO_PUBLIC_AI_BASE_URL?.trim() || "https://api.deepseek.com").replace(/\/+$/, "");
const MODEL = process.env.EXPO_PUBLIC_AI_MODEL?.trim() || "deepseek-chat";
const API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY?.trim() || "";

/** 真实 LLM 生成耗时较长,默认放宽到 60s(后台生成可单独再放宽)。 */
const DEFAULT_AI_TIMEOUT_MS = 60000;

/** 是否已配置 key —— 上层据此决定真调还是直接走 mock 回退。 */
export function hasAiKey(): boolean {
  return API_KEY.length > 0;
}

type ChatJsonParams = {
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
};

/**
 * 调 DeepSeek chat/completions(JSON Output 模式),返回已 parse 的 JSON 对象。
 * - response_format=json_object,要求 prompt 内出现 "json" 字样(prompts.ts 已保证)。
 * - 缺 key / 空内容 / HTTP 错 / 超时,统一抛 ApiError 让上层回退 mock。
 */
export async function chatJson({ system, user, maxTokens = 2000, timeoutMs = DEFAULT_AI_TIMEOUT_MS }: ChatJsonParams): Promise<unknown> {
  if (!API_KEY) {
    throw new ApiError({ code: "ai_no_key", message: "未配置 EXPO_PUBLIC_AI_API_KEY,走本地回退。", status: 0 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      }),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      throw new ApiError({ code: "ai_timeout", message: `DeepSeek 请求超时(${timeoutMs}ms)`, status: 0 });
    }
    throw new ApiError({ code: "ai_network_error", message: err instanceof Error ? err.message : "DeepSeek 网络请求失败", status: 0, details: err });
  }
  clearTimeout(timeoutId);

  const raw = await response.text();
  if (!response.ok) {
    // 不外泄 key;只透传状态码与截断后的响应体便于排查。
    throw new ApiError({ code: "ai_http_error", message: `DeepSeek HTTP ${response.status}`, status: response.status, details: raw.slice(0, 500) });
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    throw new ApiError({ code: "ai_bad_response", message: "DeepSeek 响应不是合法 JSON", status: 0 });
  }

  const content = (envelope as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    // JSON Output 偶发空内容(官方已知坑);空则抛错触发回退,避免 JSON.parse("") 崩。
    throw new ApiError({ code: "ai_empty_content", message: "DeepSeek 返回空内容", status: 0 });
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new ApiError({ code: "ai_bad_json", message: "DeepSeek 内容不是合法 JSON 对象", status: 0, details: content.slice(0, 500) });
  }
}
