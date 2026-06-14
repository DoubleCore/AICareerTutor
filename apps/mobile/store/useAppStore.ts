import { create } from "zustand";
import { defaultProfile, directions, interviewReport, trainingTasks } from "@/data/mockData";
import { DirectionRecommendation, ExploreProfile, ExploreTask, InterviewReport, TaskStatus, TrainingTask } from "@/types/domain";

type ProfileMode = "both" | "explore" | "interview";

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
  setAvatarUri: (uri?: string) => void;
  setProfileField: (key: keyof ExploreProfile, value: string | string[]) => void;
  addFollowup: (answer: string) => void;
  setSelectedDirection: (id: string) => void;
  setDirections: (directions: DirectionRecommendation[]) => void;
  saveCurrentPath: (tasks?: ExploreTask[]) => void;
  updateExploreTask: (id: string, status: TaskStatus) => void;
  updateTrainingTask: (id: string, status: TaskStatus) => void;
  setProfileMode: (mode: ProfileMode) => void;
  resetDemo: () => void;
};

const freshReport = (): InterviewReport => ({
  ...interviewReport,
  priorityTasks: trainingTasks
});

export const useAppStore = create<AppState>((set, get) => ({
  profile: defaultProfile,
  avatarUri: undefined,
  directions,
  selectedDirectionId: "ai-pm",
  savedDirectionId: undefined,
  savedTasks: [],
  interviewReport: freshReport(),
  trainingTasks,
  profileMode: "both",
  setAvatarUri: (uri) => set({ avatarUri: uri }),
  setProfileField: (key, value) =>
    set((state) => ({
      profile: { ...state.profile, [key]: value }
    })),
  addFollowup: (answer) =>
    set((state) => ({
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
      profileMode: "both"
    })
}));

export const useSelectedDirection = () =>
  useAppStore((state) => state.directions.find((item) => item.id === state.selectedDirectionId) ?? state.directions[0]);
