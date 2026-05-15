import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { AppButton, Card, Screen, StatusTag, uiStyles } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";
import { TaskStatus, TrainingTask } from "@/types/domain";

const nextStatus: Record<TaskStatus, TaskStatus> = {
  未开始: "进行中",
  进行中: "已完成",
  已完成: "未开始"
};

function SectionTitle({ icon, title }: { icon: keyof typeof MaterialIcons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIcon}>
        <MaterialIcons name={icon} size={18} color="#fff" />
      </View>
      <Text style={uiStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

function PassRing({ value }: { value: number }) {
  const radiusValue = 42;
  const circumference = 2 * Math.PI * radiusValue;
  const offset = circumference * (1 - value / 100);
  return (
    <View style={styles.ringWrap}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Circle cx="60" cy="60" r={radiusValue} stroke="#EEF2F7" strokeWidth="11" fill="none" />
        <Circle cx="60" cy="60" r={radiusValue} stroke={colors.primary} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} fill="none" rotation="-90" origin="60,60" />
      </Svg>
      <Text style={styles.ringText}>{value}%</Text>
    </View>
  );
}

function TaskStatusButton({ status, onPress }: { status: TaskStatus; onPress: () => void }) {
  const style = status === "已完成" ? styles.statusDone : status === "进行中" ? styles.statusDoing : styles.statusTodo;
  return (
    <Pressable onPress={onPress} style={[styles.statusButton, style]}>
      <Text style={[styles.statusText, status !== "未开始" ? styles.statusTextActive : null]}>{status}</Text>
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
  const { interviewReport, trainingTasks, updateTrainingTask } = useAppStore();

  return (
    <Screen
      navTitle="面试复盘"
      activeTab="面试"
      backTo="/interview/upload"
      title="面试复盘"
      subtitle="本次分析结果"
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
      <Card style={styles.heroCard}>
        <View style={styles.heroLabel}>
          <Text style={styles.heroLabelText}>本次面试</Text>
        </View>
        <View style={styles.heroContent}>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{interviewReport.title}</Text>
            <View style={styles.heroStatus}>
              <Text style={styles.heroStatusLabel}>整体表现：</Text>
              <Text style={styles.heroStatusBadge}>{interviewReport.overall.replace("整体表现：", "")}</Text>
            </View>
            <View style={styles.heroDivider} />
            <Text style={styles.heroConclusion}>{interviewReport.conclusion}</Text>
          </View>
          <View style={styles.heroDecor}>
            <MaterialIcons name="auto-awesome" size={44} color="#DBEAFE" />
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.passCardContent}>
          <View style={styles.passText}>
            <View style={styles.passHeader}>
              <Text style={uiStyles.sectionTitle}>通过可能性</Text>
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
        <SectionTitle icon="warning" title="本次核心问题" />
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
          {trainingTasks.map((task, index) => (
            <ActionTask key={task.id} task={task} index={index} onPress={() => updateTrainingTask(task.id, nextStatus[task.status])} />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    padding: spacing.xl,
    overflow: "hidden"
  },
  heroLabel: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  heroLabelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900"
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  heroText: {
    flex: 1,
    gap: spacing.sm
  },
  heroTitle: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "900"
  },
  heroStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  heroStatusLabel: {
    color: "#E0ECFF",
    fontSize: 14,
    fontWeight: "700"
  },
  heroStatusBadge: {
    color: "#fff",
    backgroundColor: colors.warning,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: "900"
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginVertical: spacing.xs
  },
  heroConclusion: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 25,
    fontWeight: "700"
  },
  heroDecor: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)"
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
  passNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  passNumber: {
    color: colors.primary,
    fontSize: 40,
    fontWeight: "900"
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
    fontWeight: "900"
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  problemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  problemIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  problemIndexText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900"
  },
  problemText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700"
  },
  impressionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "#F5F3FF",
    padding: spacing.md
  },
  impressionText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
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
    fontWeight: "900"
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  actionIndexText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900"
  },
  actionText: {
    flex: 1
  },
  actionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  statusButton: {
    minHeight: 30,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  statusTodo: {
    backgroundColor: colors.primarySoft
  },
  statusDoing: {
    backgroundColor: "#FEF3C7"
  },
  statusDone: {
    backgroundColor: "#DCFCE7"
  },
  statusText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  statusTextActive: {
    color: colors.text
  },
  footerActions: {
    flexDirection: "row",
    gap: spacing.md
  },
  footerButton: {
    flex: 1
  }
});
