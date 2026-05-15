import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Screen } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { interviewAnalysis } from "@/data/mockData";

type AnalysisTab = "逻辑" | "STAR" | "面试官" | "风险";
type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const tabs: Array<{ key: AnalysisTab; icon: IconName }> = [
  { key: "逻辑", icon: "account-tree" },
  { key: "STAR", icon: "star-border" },
  { key: "面试官", icon: "groups" },
  { key: "风险", icon: "verified-user" }
];

const logicIcons: IconName[] = ["track-changes", "person", "bar-chart", "swap-horiz"];
const riskIcons: IconName[] = ["gps-fixed", "bar-chart", "shuffle"];

const starColors = ["#2563EB", colors.accent, "#F97316", "#3B82F6"];
const statusScore: Record<string, number> = { 较强: 78, 一般: 52, 偏弱: 34 };

function statusColor(status: string) {
  if (status.includes("较强")) return colors.success;
  if (status.includes("高风险") || status.includes("偏弱")) return colors.danger;
  if (status.includes("中风险") || status.includes("一般")) return colors.warning;
  return colors.primary;
}

function light(color: string, alpha = "16") {
  return `${color}${alpha}`;
}

export default function InterviewAnalysisScreen() {
  const [tab, setTab] = useState<AnalysisTab>("逻辑");

  return (
    <Screen navTitle="深入分析" backTo="/interview/overview" activeTab="面试">
      <View style={styles.heroTitleRow}>
        <View style={styles.titleBar} />
        <View style={styles.titleCopy}>
          <Text style={styles.pageTitle}>深入分析</Text>
          <Text style={styles.subtitle}>我会把总览中的关键结论拆开说明给你看</Text>
        </View>
      </View>

      <Card style={styles.focusCard}>
        <View style={styles.focusIcon}>
          <MaterialIcons name="description" size={26} color={colors.accent} />
        </View>
        <View style={styles.focusCopy}>
          <Text style={styles.focusTitle}>这份分析主要聚焦 4 个方面</Text>
          <Text style={styles.focusText}>回答逻辑、STAR 结构、面试官追问意图、风险点与判断依据</Text>
        </View>
      </Card>

      <Card style={styles.analysisPanel}>
        <AnalysisTabs value={tab} onChange={setTab} />
        {tab === "逻辑" ? <LogicPanel /> : null}
        {tab === "STAR" ? <StarPanel /> : null}
        {tab === "面试官" ? <InterviewerPanel /> : null}
        {tab === "风险" ? <RiskPanel /> : null}
      </Card>
    </Screen>
  );
}

function AnalysisTabs({ value, onChange }: { value: AnalysisTab; onChange: (value: AnalysisTab) => void }) {
  return (
    <View style={styles.tabs}>
      {tabs.map((item) => {
        const active = item.key === value;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} style={[styles.tabItem, active ? styles.tabItemActive : null]}>
            <MaterialIcons name={item.icon} size={20} color={active ? "#fff" : colors.muted} />
            <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{item.key}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LogicPanel() {
  return (
    <View style={styles.panelContent}>
      <SectionTitle title="回答逻辑分析" />
      {interviewAnalysis.logic.map((item, index) => (
        <MetricCard key={item.title} icon={logicIcons[index] ?? "lens"} title={item.title} status={item.status} description={item.description} score={statusScore[item.status] ?? 45} color={index === 0 || index === 3 ? colors.primary : colors.danger} />
      ))}
    </View>
  );
}

function StarPanel() {
  return (
    <View style={styles.panelContent}>
      <View>
        <Text style={styles.sectionTitleLarge}>STAR 结构分析</Text>
        <Text style={styles.sectionSubtitle}>从情境、任务、行动、结果四个维度，评估你的回答质量。</Text>
      </View>
      {interviewAnalysis.star.map((item, index) => (
        <StarCard key={item.title} letter={item.title.slice(0, 1)} color={starColors[index] ?? colors.primary} title={item.title} status={item.status} description={item.description} score={statusScore[item.status] ?? 45} />
      ))}
      <TipCard title="如何提升" text="建议在后续训练中，优先强化偏弱项，提升 STAR 结构的完整度与说服力。" />
    </View>
  );
}

function InterviewerPanel() {
  return (
    <View style={styles.panelContent}>
      <View>
        <Text style={styles.sectionTitleLarge}>面试官视角与追问意图</Text>
        <Text style={styles.sectionSubtitle}>从面试官视角理解他们的关注点和追问背后的真实意图。</Text>
      </View>

      <View style={styles.interviewerSummary}>
        <View style={styles.avatarBubble}>
          <MaterialIcons name="person" size={38} color="#6366F1" />
        </View>
        <View style={styles.summaryCopy}>
          <InfoLine icon="stars" title="他大概怎么看你" text={interviewAnalysis.interviewer.summary} />
          <View style={styles.divider} />
          <InfoLine icon="help" title="他为什么犹豫" text={interviewAnalysis.interviewer.hesitations.join("，")} />
        </View>
      </View>

      <Text style={styles.sectionTitleLarge}>关键追问意图分析</Text>
      {interviewAnalysis.interviewer.questions.map((item, index) => (
        <QuestionCard key={item.question} index={index + 1} question={item.question} intent={item.intent} answer={item.answer} />
      ))}
    </View>
  );
}

function RiskPanel() {
  return (
    <View style={styles.panelContent}>
      <View>
        <Text style={styles.sectionTitleLarge}>风险点与判断依据</Text>
      </View>

      <View style={styles.subHeader}>
        <MaterialIcons name="shield" size={20} color={colors.danger} />
        <Text style={styles.subHeaderText}>一、风险点识别</Text>
      </View>
      {interviewAnalysis.risks.risks.map((item, index) => (
        <RiskItem key={item} index={index + 1} icon={riskIcons[index] ?? "warning"} title={item} level={index === 0 ? "高风险" : "中风险"} />
      ))}

      <View style={styles.subHeader}>
        <MaterialIcons name="balance" size={20} color={colors.primary} />
        <Text style={styles.subHeaderText}>二、判断依据</Text>
      </View>
      <View style={styles.factorGrid}>
        <FactorBox tone="positive" title="拉高判断的因素" items={interviewAnalysis.risks.positives} />
        <FactorBox tone="negative" title="拉低判断的因素" items={interviewAnalysis.risks.negatives} />
      </View>
      <TipCard title="改进优先级" text="风险点是可改进的，建议优先解决高风险问题，提升面试稳定性。" />
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitleLarge}>{title}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <View style={[styles.statusPill, { backgroundColor: light(color, "18") }]}>
      <Text style={[styles.statusText, { color }]}>{status}</Text>
    </View>
  );
}

function ProgressLine({ score, color }: { score: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(8, score))}%`, backgroundColor: color }]} />
    </View>
  );
}

function MetricCard({ icon, title, status, description, score, color }: { icon: IconName; title: string; status: string; description: string; score: number; color: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: light(color, "12") }]}>
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <View style={styles.metricContent}>
        <View style={styles.metricTop}>
          <Text style={styles.metricTitle}>{title}</Text>
          <StatusPill status={status} />
        </View>
        <ProgressLine score={score} color={color} />
        <Text style={styles.metricDesc}>{description}</Text>
      </View>
    </View>
  );
}

function StarCard({ letter, color, title, status, description, score }: { letter: string; color: string; title: string; status: string; description: string; score: number }) {
  return (
    <View style={styles.starCard}>
      <View style={[styles.letterIcon, { backgroundColor: light(color, "14") }]}>
        <Text style={[styles.letterText, { color }]}>{letter}</Text>
      </View>
      <View style={styles.metricContent}>
        <View style={styles.metricTop}>
          <Text style={styles.starTitle}>{title}</Text>
          <StatusPill status={status} />
        </View>
        <Text style={styles.metricDesc}>{description}</Text>
        <ProgressLine score={score} color={color} />
      </View>
    </View>
  );
}

function InfoLine({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.infoLine}>
      <MaterialIcons name={icon} size={18} color={colors.primary} />
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

function QuestionCard({ index, question, intent, answer }: { index: number; question: string; intent: string; answer: string }) {
  const color = index === 1 ? colors.primary : index === 2 ? colors.accent : colors.warning;
  return (
    <View style={styles.questionCard}>
      <View style={styles.questionIndexWrap}>
        <View style={[styles.questionIndex, { backgroundColor: color }]}>
          <Text style={styles.questionIndexText}>{index}</Text>
        </View>
      </View>
      <View style={styles.questionBody}>
        <Text style={styles.questionTitle}>追问 {index}：{question}</Text>
        <InfoLine icon="person" title="面试官真实意图" text={intent} />
        <InfoLine icon="chat" title="你的回答情况" text={answer} />
      </View>
    </View>
  );
}

function RiskItem({ index, icon, title, level }: { index: number; icon: IconName; title: string; level: string }) {
  const color = level === "高风险" ? colors.danger : colors.warning;
  return (
    <View style={styles.riskItem}>
      <View style={[styles.riskIcon, { backgroundColor: light(color, "14") }]}>
        <MaterialIcons name={icon} size={26} color={color} />
      </View>
      <View style={styles.riskBody}>
        <View style={styles.metricTop}>
          <Text style={styles.riskTitle}>{index}. {title}</Text>
          <StatusPill status={level} />
        </View>
        <Text style={styles.metricDesc}>{index === 1 ? "面试官难以判断你的真实贡献和能力边界。" : index === 2 ? "缺少具体数据或业务影响，导致价值感不足。" : "重点不够聚焦，逻辑跳跃会影响整体印象。"}</Text>
      </View>
    </View>
  );
}

function FactorBox({ tone, title, items }: { tone: "positive" | "negative"; title: string; items: string[] }) {
  const color = tone === "positive" ? colors.success : colors.danger;
  return (
    <View style={[styles.factorBox, { backgroundColor: tone === "positive" ? "#F0FDF4" : "#FFF1F2", borderColor: light(color, "24") }]}>
      <Text style={[styles.factorTitle, { color }]}>{tone === "positive" ? "↑ " : "↓ "}{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.factorItem}>
          <MaterialIcons name={tone === "positive" ? "check-circle" : "cancel"} size={18} color={color} />
          <Text style={styles.factorText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function TipCard({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.tipCard}>
      <View style={styles.tipIcon}>
        <MaterialIcons name="auto-awesome" size={22} color="#fff" />
      </View>
      <View style={styles.tipCopy}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipText}>{text}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  heroTitleRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start"
  },
  titleBar: {
    width: 5,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginTop: 3
  },
  titleCopy: { flex: 1, gap: 4 },
  pageTitle: { color: "#0F1F3D", fontSize: 27, fontWeight: "900", lineHeight: 34 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  focusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#E1E7FF",
    backgroundColor: "#FBFAFF"
  },
  focusIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0ECFF"
  },
  focusCopy: { flex: 1, gap: 6 },
  focusTitle: { color: "#0F1F3D", fontSize: 17, fontWeight: "900" },
  focusText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  analysisPanel: {
    padding: 0,
    gap: 0,
    overflow: "hidden"
  },
  tabs: {
    flexDirection: "row",
    padding: spacing.md,
    backgroundColor: "#F3F6FB",
    gap: 6
  },
  tabItem: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5
  },
  tabItemActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: "900" },
  tabTextActive: { color: "#fff" },
  panelContent: {
    padding: spacing.lg,
    gap: spacing.md
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionBar: { width: 4, height: 24, borderRadius: radius.pill, backgroundColor: colors.primary },
  sectionTitleLarge: { color: "#0F1F3D", fontSize: 20, fontWeight: "900", lineHeight: 28 },
  sectionSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  metricCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: "#fff"
  },
  metricIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center"
  },
  metricContent: { flex: 1, gap: spacing.sm },
  metricTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  metricTitle: { flex: 1, color: "#0F1F3D", fontSize: 16, fontWeight: "900", lineHeight: 22 },
  metricDesc: { color: "#4B5B78", fontSize: 13, lineHeight: 20 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start" },
  statusText: { fontSize: 12, fontWeight: "900" },
  progressTrack: { height: 7, borderRadius: radius.pill, backgroundColor: "#E6EAF1", overflow: "hidden" },
  progressFill: { height: 7, borderRadius: radius.pill },
  starCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: "#fff"
  },
  letterIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center"
  },
  letterText: { fontSize: 28, fontWeight: "800" },
  starTitle: { flex: 1, color: "#0F1F3D", fontSize: 18, fontWeight: "900" },
  interviewerSummary: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#DDE7FF",
    borderRadius: radius.lg,
    backgroundColor: "#FAFCFF"
  },
  avatarBubble: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm
  },
  summaryCopy: { flex: 1, gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border },
  infoLine: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  infoCopy: { flex: 1, gap: 3 },
  infoTitle: { color: "#0F1F3D", fontSize: 14, fontWeight: "900" },
  infoText: { color: "#4B5B78", fontSize: 13, lineHeight: 20 },
  questionCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#DDE7FF",
    backgroundColor: "#fff"
  },
  questionIndexWrap: { width: 42, alignItems: "center" },
  questionIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  questionIndexText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  questionBody: { flex: 1, gap: spacing.md, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.md },
  questionTitle: { color: "#0F1F3D", fontSize: 15, fontWeight: "900", lineHeight: 22 },
  subHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  subHeaderText: { color: "#0F1F3D", fontSize: 16, fontWeight: "900" },
  riskItem: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#F4D6D9",
    backgroundColor: "#fff"
  },
  riskIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center"
  },
  riskBody: { flex: 1, gap: spacing.sm },
  riskTitle: { flex: 1, color: "#0F1F3D", fontSize: 14, fontWeight: "900", lineHeight: 21 },
  factorGrid: { flexDirection: "row", gap: spacing.md },
  factorBox: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm
  },
  factorTitle: { fontSize: 14, fontWeight: "900", lineHeight: 20 },
  factorItem: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)"
  },
  factorText: { flex: 1, color: "#24324A", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#D8E8FF",
    backgroundColor: "#F4F9FF"
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#60A5FA"
  },
  tipCopy: { flex: 1, gap: 4 },
  tipTitle: { color: "#0F1F3D", fontSize: 15, fontWeight: "900" },
  tipText: { color: "#4B5B78", fontSize: 13, lineHeight: 20 }
});
