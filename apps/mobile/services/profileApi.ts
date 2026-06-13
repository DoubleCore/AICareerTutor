import { InterviewReport } from "@/types/domain";
import { request } from "./apiClient";
import { CurrentPathResponse } from "./exploreApi";

/**
 * 个人主页接口,路径对齐 apps/api/app/api/routes/profile.py(前缀 /profile)。
 *
 * 注意:后端 ProfileHome 的结构({ nickname, currentFocus, explore, interview, abilities })
 * 与前端 types/domain.ts 里的 ProfileHome({ nickname, hasExplore, hasInterview })并不一致。
 * 这层结构对齐留到 P1-09 处理,这里先按后端真实返回结构定义类型。
 */

export type ProfileHomeResponse = {
  nickname: string;
  currentFocus: string;
  explore: CurrentPathResponse;
  interview: InterviewReport;
  abilities: string[];
};

/** GET /profile/home —— 个人主页聚合数据。 */
export function getProfileHome(): Promise<ProfileHomeResponse> {
  return request<ProfileHomeResponse>("/profile/home");
}
