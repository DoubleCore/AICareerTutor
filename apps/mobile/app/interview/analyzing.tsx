import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Card, Screen, StatusTag, uiStyles } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";

const steps = [
  ["读取面试资料", "已完成"],
  ["提取岗位信息", "已完成"],
  ["分析回答逻辑", "分析中"],
  ["识别 STAR 结构", "待进行"],
  ["生成面试官视角与训练建议", "待进行"]
] as const;

const materials = [
  ["graphic-eq", "面试资料", "面试记录 1 份"],
  ["business-center", "岗位名称", "AI产品经理"],
  ["apartment", "公司名称", "字节跳动"],
  ["description", "岗位 JD", "已补充"]
] as const;

function AnalysisOrb() {
  return (
    <View style={styles.orbWrap}>
      <Svg width={144} height={144} viewBox="0 0 144 144">
        <Circle cx="72" cy="72" r="58" stroke="#E0E7FF" strokeWidth="1" fill="none" />
        <Circle cx="72" cy="72" r="45" stroke="#DBEAFE" strokeWidth="1" fill="none" />
        <Circle cx="72" cy="72" r="31" stroke={colors.primary} strokeWidth="9" strokeDasharray="138 70" strokeLinecap="round" fill="none" />
        <Circle cx="42" cy="74" r="4" fill="#BFDBFE" />
        <Circle cx="116" cy="54" r="4" fill="#93C5FD" />
      </Svg>
    </View>
  );
}

function StepRow({ index, title, status }: { index: number; title: string; status: string }) {
  const done = status === "已完成";
  const active = status === "分析中";
  return (
    <View style={styles.stepRow}>
      <View style={styles.timeline}>
        <View style={[styles.stepDot, done ? styles.stepDotDone : active ? styles.stepDotActive : styles.stepDotTodo]}>
          {done ? <MaterialIcons name="check" size={14} color="#fff" /> : null}
        </View>
        {index < steps.length - 1 ? <View style={[styles.stepLine, done ? styles.stepLineDone : null]} /> : null}
      </View>
      <Text style={[styles.stepTitle, active ? styles.stepTitleActive : null]}>{index + 1}. {title}</Text>
      <StatusTag label={status} />
    </View>
  );
}

export default function InterviewAnalyzing() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/interview/overview"), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen navTitle="面试分析中" activeTab="面试">
      <Card style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View style={styles.heroText}>
            <View style={styles.heroTitleRow}>
              <MaterialIcons name="auto-awesome" size={24} color={colors.accent} />
              <Text style={styles.heroTitle}>正在生成你的复盘报告</Text>
            </View>
            <Text style={styles.heroDescription}>我会结合你的面试内容和岗位信息，从回答逻辑、STAR结构、风险点和面试官视角等方面进行分析。</Text>
            <View style={styles.loadingRow}>
              <Text style={uiStyles.muted}>AI 分析中</Text>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.dotMiddle]} />
              <View style={styles.dot} />
            </View>
          </View>
          <AnalysisOrb />
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="timeline" size={18} color={colors.primary} />
          </View>
          <Text style={uiStyles.sectionTitle}>正在进行的分析步骤</Text>
        </View>
        <View style={styles.steps}>
          {steps.map(([title, status], index) => (
            <StepRow key={title} index={index} title={title} status={status} />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="assignment" size={18} color={colors.primary} />
          </View>
          <Text style={uiStyles.sectionTitle}>本次分析资料</Text>
        </View>
        <View style={styles.materialBox}>
          {materials.map(([icon, label, value], index) => (
            <View key={label} style={[styles.materialRow, index === materials.length - 1 ? styles.materialRowLast : null]}>
              <View style={styles.materialIcon}>
                <MaterialIcons name={icon} size={19} color={colors.primary} />
              </View>
              <Text style={styles.materialLabel}>{label}</Text>
              <Text style={styles.materialValue}>{value}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.tipCard}>
        <View style={styles.tipIcon}>
          <MaterialIcons name="auto-awesome" size={24} color="#fff" />
        </View>
        <Text style={styles.tipText}>这不是简单打分，我更关注你卡在哪里，以及下一步怎么提升。</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: spacing.xl
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  heroText: {
    flex: 1,
    gap: spacing.md
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  heroTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 30
  },
  heroDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 24
  },
  orbWrap: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  dotMiddle: {
    opacity: 0.7
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  steps: {
    gap: 0
  },
  stepRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  timeline: {
    width: 22,
    alignItems: "center",
    alignSelf: "stretch"
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    borderWidth: 2
  },
  stepDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  stepDotActive: {
    backgroundColor: "#fff",
    borderColor: colors.primary
  },
  stepDotTodo: {
    backgroundColor: "#fff",
    borderColor: colors.border
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border
  },
  stepLineDone: {
    backgroundColor: colors.primary
  },
  stepTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  stepTitleActive: {
    color: colors.primary,
    fontWeight: "900"
  },
  materialBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: "#fff"
  },
  materialRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  materialRowLast: {
    borderBottomWidth: 0
  },
  materialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  materialLabel: {
    width: 84,
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  materialValue: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600"
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE"
  },
  tipIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  tipText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 24
  }
});
