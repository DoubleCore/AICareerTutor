import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultProfile, directions, interviewReport, trainingTasks } from "@/data/mockData";
import {
  DirectionRecommendation,
  ExploreProfile,
  ExploreTask,
  InterviewAnalysis,
  InterviewReport,
  InterviewUpload,
  TaskStatus,
  TrainingTask
} from "@/types/domain";

type ProfileMode = "both" | "explore" | "interview";

/** 面试链路生成状态(对齐原后端 AnalysisStatusResponse 语义)。 */
export type InterviewStatus = "idle" | "generating" | "ready" | "failed";

/** 同时保留的面试 session 数量上限,防 AsyncStorage 无限增长。 */
const MAX_INTERVIEW_SESSIONS = 2;

/** 探索方向推荐里 directions 之外的部分(conclusion / 可迁移能力 / 不推荐方向),用作缓存。 */
export type ExploreExtras = {
  conclusion: string;
  transferableAbilities: string[];
  notRecommended: { title: string; reason: string }[];
};

type AppState = {
  profile: ExploreProfile;
  avatarUri?: string;
  directions: DirectionRecommendation[];
  selectedDirectionId: string;
  savedDirectionId?: string;
  savedTasks: ExploreTask[];
  interviewReport: InterviewReport;
  trainingTasks: TrainingTask[];
  profileMode: ProfileMode;
  // 探索方向推荐缓存(对齐后端 peek 缓存,避免 result 屏每次挂载都真烧一次 DeepSeek):
  // directions 存在 state.directions;此处存 directions 之外的 conclusion/能力/不推荐。
  // null 表示尚未由 AI 生成过;resetDemo 与画像变更时复位为 null。
  exploreExtras: ExploreExtras | null;
  // 面试链路缓存(App 独立化后取代后端 mock_state,按 sessionId 存)。
  interviewUploads: Record<string, InterviewUpload>;
  interviewReports: Record<string, InterviewReport>;
  interviewAnalyses: Record<string, InterviewAnalysis>;
  interviewStatuses: Record<string, InterviewStatus>;
  setAvatarUri: (uri?: string) => void;
  setProfileField: (key: keyof ExploreProfile, value: string | string[]) => void;
  addFollowup: (answer: string) => void;
  setSelectedDirection: (id: string) => void;
  setDirections: (directions: DirectionRecommendation[]) => void;
  setExploreExtras: (extras: ExploreExtras | null) => void;
  saveCurrentPath: (tasks?: ExploreTask[]) => void;
  updateExploreTask: (id: string, status: TaskStatus) => void;
  updateTrainingTask: (id: string, status: TaskStatus) => void;
  setProfileMode: (mode: ProfileMode) => void;
  // 面试链路 setter(供 interviewApi 编排调用)。
  setInterviewUpload: (sessionId: string, upload: InterviewUpload) => void;
  setInterviewStatus: (sessionId: string, status: InterviewStatus) => void;
  setInterviewResult: (sessionId: string, report: InterviewReport, analysis: InterviewAnalysis) => void;
  updateInterviewTask: (sessionId: string, taskId: string, status: TaskStatus) => void;
  resetDemo: () => void;
};

const freshReport = (): InterviewReport => ({
  ...interviewReport,
  priorityTasks: trainingTasks
});

/** 写入新 session 时裁剪,只保留最近 MAX_INTERVIEW_SESSIONS 个,防 map 无限增长。 */
function pruneSessions<T>(map: Record<string, T>, keepId: string): Record<string, T> {
  const ids = Object.keys(map);
  if (ids.length <= MAX_INTERVIEW_SESSIONS) {
    return map;
  }
  // 保留 keepId + 最后插入的若干个(对象键顺序即插入顺序)。
  const keep = new Set<string>([keepId, ...ids.slice(-MAX_INTERVIEW_SESSIONS)]);
  const next: Record<string, T> = {};
  for (const id of ids) {
    if (keep.has(id)) next[id] = map[id];
  }
  return next;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      avatarUri: undefined,
      directions,
      selectedDirectionId: "ai-pm",
      savedDirectionId: undefined,
      savedTasks: [],
      interviewReport: freshReport(),
      trainingTasks,
      profileMode: "both",
      exploreExtras: null,
      interviewUploads: {},
      interviewReports: {},
      interviewAnalyses: {},
      interviewStatuses: {},
      setAvatarUri: (uri) => set({ avatarUri: uri }),
      setProfileField: (key, value) =>
        set((state) => ({
          // 画像变更使已生成的方向缓存失效,下次进 result 屏会重新生成。
          exploreExtras: null,
          profile: { ...state.profile, [key]: value }
        })),
      addFollowup: (answer) =>
        set((state) => ({
          exploreExtras: null,
          profile: { ...state.profile, followups: [...state.profile.followups, answer] }
        })),
      setSelectedDirection: (id) => set({ selectedDirectionId: id }),
      setDirections: (directions) =>
        set((state) => ({
          directions,
          // 若当前选中方向不在新方向集里(AI 生成了新 id),对齐到首个方向,避免 path 屏保存到失效 id。
          selectedDirectionId: directions.some((item) => item.id === state.selectedDirectionId)
            ? state.selectedDirectionId
            : (directions[0]?.id ?? state.selectedDirectionId)
        })),
      setExploreExtras: (extras) => set({ exploreExtras: extras }),
      saveCurrentPath: (tasks) => {
        const direction = get().directions.find((item) => item.id === get().selectedDirectionId) ?? get().directions[0];
        set({
          savedDirectionId: direction.id,
          savedTasks: (tasks ?? direction.weeklyTasks).map((task) => ({ ...task }))
        });
      },
      updateExploreTask: (id, status) =>
        set((state) => ({
          savedTasks: state.savedTasks.map((task) => (task.id === id ? { ...task, status } : task))
        })),
      updateTrainingTask: (id, status) =>
        set((state) => {
          const nextTasks = state.trainingTasks.map((task) => (task.id === id ? { ...task, status } : task));
          return {
            trainingTasks: nextTasks,
            interviewReport: { ...state.interviewReport, priorityTasks: nextTasks }
          };
        }),
      setProfileMode: (mode) => set({ profileMode: mode }),
      setInterviewUpload: (sessionId, upload) =>
        set((state) => ({
          interviewUploads: pruneSessions({ ...state.interviewUploads, [sessionId]: upload }, sessionId)
        })),
      setInterviewStatus: (sessionId, status) =>
        set((state) => ({
          interviewStatuses: { ...state.interviewStatuses, [sessionId]: status }
        })),
      setInterviewResult: (sessionId, report, analysis) =>
        set((state) => ({
          interviewReports: pruneSessions({ ...state.interviewReports, [sessionId]: report }, sessionId),
          interviewAnalyses: pruneSessions({ ...state.interviewAnalyses, [sessionId]: analysis }, sessionId),
          interviewStatuses: { ...state.interviewStatuses, [sessionId]: "ready" }
        })),
      updateInterviewTask: (sessionId, taskId, status) =>
        set((state) => {
          const report = state.interviewReports[sessionId];
          if (!report) return {};
          const nextReport: InterviewReport = {
            ...report,
            priorityTasks: report.priorityTasks.map((task) => (task.id === taskId ? { ...task, status } : task))
          };
          return { interviewReports: { ...state.interviewReports, [sessionId]: nextReport } };
        }),
      resetDemo: () =>
        set({
          profile: defaultProfile,
          avatarUri: undefined,
          directions,
          selectedDirectionId: "ai-pm",
          savedDirectionId: undefined,
          savedTasks: [],
          interviewReport: freshReport(),
          trainingTasks,
          profileMode: "both",
          exploreExtras: null,
          interviewUploads: {},
          interviewReports: {},
          interviewAnalyses: {},
          interviewStatuses: {}
        })
    }),
    {
      name: "ai-career-tutor",
      storage: createJSONStorage(() => AsyncStorage),
      // 只持久化数据字段(白名单);函数 setter 与派生值不入库。
      partialize: (state) => ({
        profile: state.profile,
        avatarUri: state.avatarUri,
        directions: state.directions,
        selectedDirectionId: state.selectedDirectionId,
        savedDirectionId: state.savedDirectionId,
        savedTasks: state.savedTasks,
        interviewReport: state.interviewReport,
        trainingTasks: state.trainingTasks,
        profileMode: state.profileMode,
        exploreExtras: state.exploreExtras,
        interviewUploads: state.interviewUploads,
        interviewReports: state.interviewReports,
        interviewAnalyses: state.interviewAnalyses,
        interviewStatuses: state.interviewStatuses
      })
    }
  )
);

export const useSelectedDirection = () =>
  useAppStore((state) => state.directions.find((item) => item.id === state.selectedDirectionId) ?? state.directions[0]);
