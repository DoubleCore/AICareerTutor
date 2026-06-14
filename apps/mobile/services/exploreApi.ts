import { DirectionRecommendation, ExploreProfile, ExploreTask, FollowupQuestion } from "@/types/domain";
import { request } from "./apiClient";

/**
 * 职业探索相关接口,路径对齐 apps/api/app/api/routes/explore.py(前缀 /explore)。
 * ExploreResult / CurrentPathResponse 未在 types/domain.ts 定义,这里就近补与后端 schema 对齐的结构类型。
 */

export type ExploreResult = {
  conclusion: string;
  directions: DirectionRecommendation[];
  transferableAbilities: string[];
  notRecommended: { title: string; reason: string }[];
};

export type CurrentPathResponse = {
  direction: DirectionRecommendation | null;
  tasks: ExploreTask[];
};

export type StatusResponse = {
  ok: boolean;
  message: string;
};

// 真实 LLM 生成(followup / generate-result)可能超过默认 12s,给这两个调用单独放宽超时。
const EXPLORE_AI_TIMEOUT_MS = 45000;

/** POST /explore/basic-profile —— 提交基础画像。 */
export function submitBasicProfile(profile: ExploreProfile): Promise<StatusResponse> {
  return request<StatusResponse>("/explore/basic-profile", { method: "POST", body: profile });
}

/** POST /explore/experience —— 提交经历。 */
export function submitExperience(profile: ExploreProfile): Promise<StatusResponse> {
  return request<StatusResponse>("/explore/experience", { method: "POST", body: profile });
}

/** POST /explore/followup —— 生成追问问题(real 模式走 LLM,放宽超时)。 */
export function generateFollowup(profile: ExploreProfile): Promise<FollowupQuestion[]> {
  return request<FollowupQuestion[]>("/explore/followup", { method: "POST", body: profile, timeoutMs: EXPLORE_AI_TIMEOUT_MS });
}

/** POST /explore/confirm —— 确认画像。 */
export function confirmProfile(profile: ExploreProfile): Promise<ExploreProfile> {
  return request<ExploreProfile>("/explore/confirm", { method: "POST", body: profile });
}

/** POST /explore/generate-result —— 生成方向推荐结果(real 模式走 LLM,放宽超时)。 */
export function generateExploreResult(profile?: ExploreProfile): Promise<ExploreResult> {
  return request<ExploreResult>("/explore/generate-result", { method: "POST", body: profile, timeoutMs: EXPLORE_AI_TIMEOUT_MS });
}

/** POST /explore/save-path —— 保存学习路径(后端接收 directionId,populate_by_name 兼容)。 */
export function saveExplorePath(directionId: string): Promise<CurrentPathResponse> {
  return request<CurrentPathResponse>("/explore/save-path", { method: "POST", body: { directionId } });
}

/** GET /explore/current-path —— 当前已保存路径。 */
export function getCurrentPath(): Promise<CurrentPathResponse> {
  return request<CurrentPathResponse>("/explore/current-path");
}
