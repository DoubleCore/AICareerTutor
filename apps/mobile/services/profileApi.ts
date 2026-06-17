import { InterviewReport } from "@/types/domain";
import { useAppStore } from "@/store/useAppStore";
import { CurrentPathResponse } from "./exploreApi";

/**
 * 个人主页接口。App 独立化后从 store 聚合(不再走后端)。
 * 结构沿用原后端 ProfileHome 返回形状,签名不变。
 * 注:当前无屏幕调用此函数(profile tab 直接读 store),保留作兼容。
 */

export type ProfileHomeResponse = {
  nickname: string;
  currentFocus: string;
  explore: CurrentPathResponse;
  interview: InterviewReport;
  abilities: string[];
};

/** 个人主页聚合数据(从 store 组装)。 */
export function getProfileHome(): Promise<ProfileHomeResponse> {
  const { savedDirectionId, directions, savedTasks, interviewReport } = useAppStore.getState();
  const direction = savedDirectionId ? (directions.find((item) => item.id === savedDirectionId) ?? null) : null;
  return Promise.resolve({
    nickname: "我",
    currentFocus: direction?.title ?? "",
    explore: { direction, tasks: savedTasks },
    interview: interviewReport,
    abilities: direction?.portrait.abilities ?? []
  });
}
