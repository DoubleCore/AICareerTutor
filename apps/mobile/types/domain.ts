export type TaskStatus = "未开始" | "进行中" | "已完成";
export type MatchLevel = "高" | "较高" | "可尝试";

export type ExploreAnswer = {
  id: string;
  label: string;
  value: string | string[];
};

export type ExploreProfile = {
  stage: string;
  education: string;
  major: string;
  interests: string[];
  workPreferences: string[];
  goal: string;
  constraints: string[];
  experiences: string[];
  workTypes: string[];
  preferredStates: string[];
  followups: string[];
};

export type FollowupQuestion = {
  id: string;
  question: string;
};

export type DirectionRecommendation = {
  id: string;
  title: string;
  match: MatchLevel;
  reason: string;
  portrait: {
    dailyWork: string[];
    challenges: string[];
    abilities: string[];
    path: string;
  };
  whyFirst: string[];
  abilitiesToBuild: { title: string; description: string }[];
  weeklyTasks: ExploreTask[];
};

export type ExploreTask = {
  id: string;
  title: string;
  status: TaskStatus;
};

export type InterviewUpload = {
  sessionId: string;
  fileName: string;
  jobTitle: string;
  company: string;
  jd: string;
  transcript: string;
};

export type TrainingTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
};

export type InterviewReport = {
  sessionId: string;
  title: string;
  overall: string;
  conclusion: string;
  passPossibility: number;
  passLevel: "低" | "中" | "高";
  coreProblems: string[];
  interviewerView: {
    impression: string;
    positives: string[];
    concerns: string[];
  };
  priorityTasks: TrainingTask[];
};

export type InterviewAnalysis = {
  logic: { title: string; status: string; description: string }[];
  star: { title: string; status: string; description: string }[];
  interviewer: {
    summary: string;
    hesitations: string[];
    questions: { question: string; intent: string; answer: string }[];
  };
  risks: {
    risks: string[];
    positives: string[];
    negatives: string[];
  };
};

export type ProfileHome = {
  nickname: string;
  hasExplore: boolean;
  hasInterview: boolean;
};

/** 登录用户(对齐后端 /auth 的 AuthUser,绝不含密码)。 */
export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
};
