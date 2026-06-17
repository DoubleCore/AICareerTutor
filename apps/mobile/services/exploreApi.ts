import { DirectionRecommendation, ExploreProfile, ExploreTask, FollowupQuestion } from "@/types/domain";
import { useAppStore } from "@/store/useAppStore";
import { aiGenerateExploreResult, aiGenerateFollowup } from "./ai";

/**
 * 职业探索接口。App 独立化后不再走后端 —— AI 类(followup / generate-result)直连 DeepSeek,
 * 存取类直接读写 zustand store。导出的类型与函数签名保持不变,屏幕代码零改动。
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

// 多轮追问:每轮把画像 + 已问问答历史交给 AI,返回下一题或 done。
export type FollowupTurn = {
  question: string;
  answer: string;
};

export type FollowupResponse = {
  question: FollowupQuestion | null; // null + done=true 表示结束
  done: boolean;
};

const LOCAL_OK: StatusResponse = { ok: true, message: "local" };

/** 提交基础画像 —— 画像已由屏幕的 setProfileField 写入 store,这里是 no-op。 */
export function submitBasicProfile(_profile: ExploreProfile): Promise<StatusResponse> {
  return Promise.resolve(LOCAL_OK);
}

/** 提交经历 —— 同上,no-op。 */
export function submitExperience(_profile: ExploreProfile): Promise<StatusResponse> {
  return Promise.resolve(LOCAL_OK);
}

/** 多轮追问:传画像 + 已问历史,返回下一题或 done(直连 DeepSeek,失败回退 mock 题库)。 */
export function generateFollowup(profile: ExploreProfile, history: FollowupTurn[] = []): Promise<FollowupResponse> {
  return aiGenerateFollowup(profile, history);
}

/** 确认画像 —— 原样回传。 */
export function confirmProfile(profile: ExploreProfile): Promise<ExploreProfile> {
  return Promise.resolve(profile);
}

/**
 * 生成方向推荐结果(直连 DeepSeek)。
 * 缓存短路:若本次画像已生成过(store.exploreExtras 非空),直接用 store 的 directions + extras 组装返回,
 * 避免每次进 result 屏都真烧一次 DeepSeek(对齐原后端 peek 缓存)。
 */
export async function generateExploreResult(profile?: ExploreProfile): Promise<ExploreResult> {
  const store = useAppStore.getState();
  if (store.exploreExtras && store.directions.length > 0) {
    return { ...store.exploreExtras, directions: store.directions };
  }
  const resolved = profile ?? store.profile;
  const result = await aiGenerateExploreResult(resolved);
  // 写回 store 作缓存:更新方向 + 存 extras(下次命中缓存直接返回完整结果)。
  store.setDirections(result.directions);
  store.setExploreExtras({
    conclusion: result.conclusion,
    transferableAbilities: result.transferableAbilities,
    notRecommended: result.notRecommended
  });
  return result;
}

/** 保存学习路径:把选中方向的 weeklyTasks 落入 store,返回当前路径。 */
export function saveExplorePath(directionId: string): Promise<CurrentPathResponse> {
  const store = useAppStore.getState();
  store.setSelectedDirection(directionId);
  store.saveCurrentPath();
  return Promise.resolve(readCurrentPath());
}

/** 读取当前已保存路径(从 store 组装)。 */
export function getCurrentPath(): Promise<CurrentPathResponse> {
  return Promise.resolve(readCurrentPath());
}

function readCurrentPath(): CurrentPathResponse {
  const { savedDirectionId, directions, savedTasks } = useAppStore.getState();
  if (!savedDirectionId) {
    return { direction: null, tasks: [] };
  }
  const direction = directions.find((item) => item.id === savedDirectionId) ?? null;
  return { direction, tasks: savedTasks };
}
