import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useId, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { AppButton, Card, Screen, StatusTag, uiStyles } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { ApiError } from "@/services/apiClient";
import { getInterviewOverview } from "@/services/interviewApi";
import { useAppStore } from "@/store/useAppStore";
import { InterviewReport, TaskStatus, TrainingTask } from "@/types/domain";

const heroGradientStyle =
  Platform.OS === "web"
    ? ({
        backgroundImage: "radial-gradient(circle at 88% 12%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 28%, rgba(255,255,255,0) 58%), linear-gradient(90deg, #3F7BFF 0%, #6A8CFF 50%, #8EA2FF 100%)"
      } as never)
    : null;

const nextStatus: Record<TaskStatus, TaskStatus> = {
  未开始: "进行中",
  进行中: "已完成",
  已完成: "未开始"
};

function SectionTitle({ icon, title, alignWithProblemIndex }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; alignWithProblemIndex?: boolean }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionIcon, alignWithProblemIndex ? styles.problemSectionIcon : null]}>
        <MaterialIcons name={icon} size={alignWithProblemIndex ? 15 : 18} color="#fff" />
      </View>
      <Text style={styles.overviewSectionTitle}>{title}</Text>
    </View>
  );
}

function PassRing({ value }: { value: number }) {
  const gradientId = `passRingGradient-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const radiusValue = 42;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radiusValue;
  const offset = circumference * (1 - value / 100);
  return (
    <View style={styles.ringWrap}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#71A7FF" />
            <Stop offset="48%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#A884FF" />
          </LinearGradient>
        </Defs>
        <Circle cx="60" cy="60" r={radiusValue} stroke="#EEF2F7" strokeWidth={strokeWidth} fill="none" />
        <Circle cx="60" cy="60" r={radiusValue} stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} fill="none" rotation="-90" origin="60,60" />
      </Svg>
      <Text style={styles.ringText}>{value}%</Text>
    </View>
  );
}

function TaskStatusButton({ status, onPress }: { status: TaskStatus; onPress: () => void }) {
  const style = status === "已完成" ? styles.statusDone : status === "进行中" ? styles.statusDoing : styles.statusTodo;
  const textStyle = status === "已完成" ? styles.statusDoneText : status === "进行中" ? styles.statusDoingText : styles.statusTodoText;
  return (
    <Pressable onPress={onPress} style={[styles.statusButton, style]}>
      <Text style={[styles.statusText, textStyle]}>{status}</Text>
    </Pressable>
  );
}

function ActionTask({ task, index, onPress }: { task: TrainingTask; index: number; onPress: () => void }) {
  return (
    <View style={styles.actionRow}>
      <View style={styles.actionIndex}>
        <Text style={styles.actionIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{task.title}</Text>
        <Text style={uiStyles.muted}>{task.description}</Text>
      </View>
      <TaskStatusButton status={task.status} onPress={onPress} />
    </View>
  );
}

export default function InterviewOverview() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const session = sessionId ?? "mock-session";
  const { interviewReport: storeReport } = useAppStore();
  const [apiReport, setApiReport] = useState<InterviewReport | null>(null);

  // P1-03/04 联调:挂载时按 sessionId 拉取真实后端报告;失败则回退到 store mock,保证演示不中断。
  useEffect(() => {
    let cancelled = false;
    getInterviewOverview(session)
      .then((report) => {
        if (!cancelled) {
          setApiReport(report);
        }
      })
      .catch((err: unknown) => {
        const reason = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
        console.warn("[overview] 拉取后端报告失败,回退本地数据:", reason);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const interviewReport = apiReport ?? storeReport;

  // 方案C:任务区展示「报告自带的 priorityTasks」(= 真实 AI 任务或 mock 报告任务),
  // 而非本地 store 的 trainingTasks。用本地 state 承接点击切换(未开始→进行中→已完成),
  // 报告变化(apiReport 到达)时同步;持久化留给 P1-07,本次不触 store 契约。
  const [tasks, setTasks] = useState<TrainingTask[]>(interviewReport.priorityTasks);
  useEffect(() => {
    setTasks(interviewReport.priorityTasks);
  }, [interviewReport]);

  const cycleTaskStatus = (taskId: string) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: nextStatus[task.status] } : task)));
  };

  return (
    <Screen
      navTitle="面试复盘"
      activeTab="面试"
      backTo="/interview/upload"
      footerAboveTab
      footer={
        <View style={styles.footerActions}>
          <View style={styles.footerButton}>
            <AppButton title="查看深入分析" variant="secondary" onPress={() => router.push("/interview/analysis")} />
          </View>
          <View style={styles.footerButton}>
            <AppButton title="进入训练进度" onPress={() => router.push("/interview/training")} />
          </View>
        </View>
      }
    >
      <Card style={[styles.heroCard, heroGradientStyle] as never}>
        {Platform.OS !== "web" ? <View pointerEvents="none" style={styles.heroNativeHighlight} /> : null}
        <View style={styles.heroContent}>
          <View style={styles.heroTopLine}>
            <View style={styles.heroLabel}>
              <Text style={styles.heroLabelText}>本次面试</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{interviewReport.title}</Text>
          <View style={styles.heroStatus}>
            <Text style={styles.heroStatusLabel}>整体表现：</Text>
            <Text style={styles.heroStatusBadge}>{interviewReport.overall.replace("整体表现：", "")}</Text>
          </View>
          <View style={styles.heroDivider} />
          <Text style={styles.heroConclusion}>{interviewReport.conclusion}</Text>
        </View>
      </Card>

      <Card>
        <View style={styles.passCardContent}>
          <View style={styles.passText}>
            <View style={styles.passHeader}>
              <Text style={styles.overviewSectionTitle}>通过可能性</Text>
              <MaterialIcons name="info-outline" size={18} color={colors.gray} />
            </View>
            <View style={styles.passNumberRow}>
              <Text style={styles.passNumber}>{interviewReport.passPossibility}%</Text>
              <StatusTag label={interviewReport.passLevel} />
            </View>
            <Text style={uiStyles.muted}>当前录用信心仍不稳定，主要受表达与结构问题影响。</Text>
          </View>
          <PassRing value={interviewReport.passPossibility} />
        </View>
      </Card>

      <Card>
        <SectionTitle icon="warning" title="本次核心问题" alignWithProblemIndex />
        {interviewReport.coreProblems.map((problem, index) => (
          <View key={problem} style={styles.problemRow}>
            <View style={styles.problemIndex}>
              <Text style={styles.problemIndexText}>{index + 1}</Text>
            </View>
            <Text style={styles.problemText}>{problem}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle icon="person" title="面试官视角摘要" />
        <View style={styles.impressionBox}>
          <MaterialIcons name="star" size={18} color={colors.primary} />
          <Text style={styles.impressionText}>整体印象：{interviewReport.interviewerView.impression}</Text>
        </View>
        <View style={styles.viewGrid}>
          <View style={styles.viewBox}>
            <View style={styles.viewHeader}>
              <MaterialIcons name="thumb-up" size={22} color={colors.success} />
              <Text style={styles.viewTitle}>加分点</Text>
            </View>
            {interviewReport.interviewerView.positives.map((item) => (
              <Text key={item} style={uiStyles.muted}>• {item}</Text>
            ))}
          </View>
          <View style={styles.viewBox}>
            <View style={styles.viewHeader}>
              <MaterialIcons name="help" size={22} color="#F97316" />
              <Text style={styles.viewTitle}>犹豫点</Text>
            </View>
            {interviewReport.interviewerView.concerns.map((item) => (
              <Text key={item} style={uiStyles.muted}>• {item}</Text>
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle icon="track-changes" title="你现在最该做的 3 件事" />
        <View style={styles.actionList}>
          {tasks.map((task, index) => (
            <ActionTask key={task.id} task={task} index={index} onPress={() => cycleTaskStatus(task.id)} />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    position: "relative",
    backgroundColor: "#3F7BFF",
    borderWidth: 0,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    overflow: "hidden",
    shadowColor: "#4F78FF",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3
  },
  heroNativeHighlight: {
    position: "absolute",
    top: -54,
    right: -42,
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  heroContent: {
    gap: spacing.md,
    position: "relative"
  },
  heroTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    flexWrap: "wrap"
  },
  heroLabel: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  heroLabelText: {
    color: "#EAF2FF",
    fontSize: 11,
    fontWeight: "400"
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 31,
    textAlignVertical: "center"
  },
  heroStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  heroStatusLabel: {
    color: "#DDEBFF",
    fontSize: 14,
    fontWeight: "400"
  },
  heroStatusBadge: {
    color: "#fff",
    backgroundColor: colors.warning,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: "400",
    overflow: "hidden"
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  heroConclusion: {
    color: "#EAF2FF",
    fontSize: 12,
    lineHeight: 24,
    fontWeight: "400"
  },
  passCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  passText: {
    flex: 1,
    gap: spacing.sm
  },
  passHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  overviewSectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600"
  },
  passNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  passNumber: {
    color: colors.primary,
    fontSize: 38,
    fontWeight: "600"
  },
  ringWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center"
  },
  ringText: {
    position: "absolute",
    color: colors.text,
    fontSize: 24,
    fontWeight: "600"
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  problemSectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent
  },
  problemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  problemIndex: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  problemIndexText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "400"
  },
  problemText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 22,
    fontWeight: "400"
  },
  impressionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "#F5F5FE",
    padding: spacing.md
  },
  impressionText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 21,
    fontWeight: "400"
  },
  viewGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  viewBox: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: "#fff"
  },
  viewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  viewTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  actionList: {
    gap: spacing.sm
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#F8FBFF"
  },
  actionIndex: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  actionIndexText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "400"
  },
  actionText: {
    flex: 1
  },
  actionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  statusButton: {
    minHeight: 30,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  statusTodo: {
    backgroundColor: "#F7F9FC",
    borderColor: "#E3E8F1"
  },
  statusDoing: {
    backgroundColor: "#EDF4FF",
    borderColor: "#A9C8FF"
  },
  statusDone: {
    backgroundColor: "#ECFBF1",
    borderColor: "#A8E0BC"
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700"
  },
  statusTodoText: {
    color: "#8A96A8"
  },
  statusDoingText: {
    color: "#2F6BFF"
  },
  statusDoneText: {
    color: "#22A45A"
  },
  footerActions: {
    flexDirection: "row",
    gap: spacing.md
  },
  footerButton: {
    flex: 1
  }
});
