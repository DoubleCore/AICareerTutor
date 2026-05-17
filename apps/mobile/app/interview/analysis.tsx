import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
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
const focusImage = require("../../img/11-1.png") as ImageSourcePropType;
const improvementImage = require("../../img/11-2.png") as ImageSourcePropType;
const riskHeaderImage = require("../../img/11-3.png") as ImageSourcePropType;
const logicIconColor = "#1D43E7";
const logicIconBackground = "#EBF1FD";
const riskIconColor = "#FE7979";
const riskIconBackground = "#FEEBEC";
const positiveFactorColor = "#43C78C";
const positiveFactorBackground = "#F9FBFA";
const positiveFactorBorder = "#EBF1EE";
const positiveCheckColor = "#09BB73";
const negativeFactorColor = "#F66971";
const negativeFactorBackground = "#FFFAFA";
const negativeFactorBorder = "#FCF4F5";
const negativeCheckColor = "#FF7E7D";

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
          <Image source={focusImage} style={styles.focusIconImage} resizeMode="contain" />
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
        <MetricCard key={item.title} icon={logicIcons[index] ?? "lens"} title={item.title} status={item.status} description={item.description} score={statusScore[item.status] ?? 45} color={colors.primary} />
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
      <TipCard title="如何提升" text="建议在后续训练中，优先强化偏弱项，提升 STAR 结构的完整度与说服力。" iconImage={improvementImage} borderless titleMedium />
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
        <Image source={riskHeaderImage} style={styles.subHeaderImage} resizeMode="contain" />
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
      <TipCard title="改进优先级" text="风险点是可改进的，建议优先解决高风险问题，提升面试稳定性。" iconImage={improvementImage} borderless hideTitle backgroundColor="#F7FAFF" textColor="#7F95DF" />
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

function ProgressLine({ score, color, thin }: { score: number; color: string; thin?: boolean }) {
  return (
    <View style={[styles.progressTrack, thin ? styles.progressTrackThin : null]}>
      <View style={[styles.progressFill, thin ? styles.progressFillThin : null, { width: `${Math.min(100, Math.max(8, score))}%`, backgroundColor: color }]} />
    </View>
  );
}

function MetricCard({ icon, title, status, description, score, color }: { icon: IconName; title: string; status: string; description: string; score: number; color: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: logicIconBackground }]}>
        <MaterialIcons name={icon} size={28} color={logicIconColor} />
      </View>
      <View style={styles.metricContent}>
        <View style={styles.metricHeaderTop}>
          <Text style={styles.metricTitle}>{title}</Text>
          <StatusPill status={status} />
        </View>
        <ProgressLine score={score} color={color} thin />
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
        <View style={styles.metricHeaderTop}>
          <Text style={styles.metricTitle}>{title}</Text>
          <StatusPill status={status} />
        </View>
        <ProgressLine score={score} color={color} thin />
        <Text style={styles.metricDesc}>{description}</Text>
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
  return (
    <View style={styles.riskItem}>
      <View style={[styles.riskIcon, { backgroundColor: riskIconBackground }]}>
        <MaterialIcons name={icon} size={28} color={riskIconColor} />
      </View>
      <View style={styles.riskBody}>
        <View style={styles.metricHeaderTop}>
          <Text style={[styles.metricTitle, styles.riskTitleCompact]}>{index}. {title}</Text>
          <StatusPill status={level} />
        </View>
        <Text style={styles.metricDesc}>{index === 1 ? "面试官难以判断你的真实贡献和能力边界。" : index === 2 ? "缺少具体数据或业务影响，导致价值感不足。" : "重点不够聚焦，逻辑跳跃会影响整体印象。"}</Text>
      </View>
    </View>
  );
}

function FactorBox({ tone, title, items }: { tone: "positive" | "negative"; title: string; items: string[] }) {
  const isPositive = tone === "positive";
  const titleColor = isPositive ? positiveFactorColor : negativeFactorColor;
  const boxBackground = isPositive ? positiveFactorBackground : negativeFactorBackground;
  const borderColor = isPositive ? positiveFactorBorder : negativeFactorBorder;
  const itemStyle = isPositive ? styles.factorItemPositive : styles.factorItemNegative;
  const iconColor = isPositive ? positiveCheckColor : negativeCheckColor;
  const arrowIcon = isPositive ? "arrow-upward" : "arrow-downward";
  return (
    <View style={[styles.factorBox, { backgroundColor: boxBackground, borderColor }]}>
      <View style={styles.factorTitleRow}>
        <MaterialIcons name={arrowIcon} size={20} color={titleColor} />
        <Text style={[styles.factorTitle, { color: titleColor }]}>{title}</Text>
      </View>
      {items.map((item) => (
        <View key={item} style={[styles.factorItem, itemStyle]}>
          <MaterialIcons name={tone === "positive" ? "check-circle" : "cancel"} size={18} color={iconColor} />
          <Text style={styles.factorText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function TipCard({
  title,
  text,
  iconImage,
  borderless,
  titleMedium,
  hideTitle,
  backgroundColor,
  textColor
}: {
  title: string;
  text: string;
  iconImage?: ImageSourcePropType;
  borderless?: boolean;
  titleMedium?: boolean;
  hideTitle?: boolean;
  backgroundColor?: string;
  textColor?: string;
}) {
  return (
    <View style={[styles.tipCard, borderless ? styles.tipCardBorderless : null, backgroundColor ? { backgroundColor } : null]}>
      <View style={[styles.tipIcon, iconImage ? styles.tipImageIcon : null]}>
        {iconImage ? <Image source={iconImage} style={styles.tipIconImage} resizeMode="contain" /> : <MaterialIcons name="auto-awesome" size={22} color="#fff" />}
      </View>
      <View style={styles.tipCopy}>
        {hideTitle ? null : <Text style={[styles.tipTitle, titleMedium ? styles.tipTitleMedium : null]}>{title}</Text>}
        <Text style={[styles.tipText, textColor ? { color: textColor } : null]}>{text}</Text>
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
  pageTitle: { color: "#0F1F3D", fontSize: 27, fontWeight: "700", lineHeight: 34 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  focusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#E1E7FF",
    backgroundColor: "#FBFAFF"
  },
  focusIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0ECFF"
  },
  focusIconImage: {
    width: 50,
    height: 50
  },
  focusCopy: { flex: 1, gap: 6 },
  focusTitle: { color: "#0F1F3D", fontSize: 15, fontWeight: "600" },
  focusText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  analysisPanel: {
    padding: 0,
    gap: 0,
    overflow: "hidden"
  },
  tabs: {
    flexDirection: "row",
    padding: spacing.md,
    backgroundColor: "#F3F6FB",
    gap: 5
  },
  tabItem: {
    flex: 1,
    minHeight: 46,
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
  tabText: { color: colors.muted, fontSize: 13, fontWeight: "500" },
  tabTextActive: { color: "#fff" },
  panelContent: {
    padding: spacing.lg,
    gap: spacing.md
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionBar: { width: 4, height: 20, borderRadius: radius.pill, backgroundColor: colors.primary },
  sectionTitleLarge: { color: "#0F1F3D", fontSize: 16, fontWeight: "600", lineHeight: 18 },
  sectionSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  metricCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: "#fff"
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  metricContent: { flex: 1, gap: spacing.sm },
  metricHeaderTop: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  metricTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  metricTitle: { flex: 1, color: "#0F1F3D", fontSize: 12, fontWeight: "500", lineHeight: 20 },
  riskTitleCompact: { fontSize: 14, lineHeight: 19 },
  metricDesc: { color: "#4B5B78", fontSize: 13, lineHeight: 20 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: "500" },
  progressTrack: { height: 7, borderRadius: radius.pill, backgroundColor: "#E6EAF1", overflow: "hidden" },
  progressFill: { height: 7, borderRadius: radius.pill },
  progressTrackThin: { height: 5 },
  progressFillThin: { height: 5 },
  starCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: "#fff"
  },
  letterIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  letterText: { fontSize: 22, fontWeight: "500" },
  interviewerSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#DDE7FF",
    borderRadius: radius.lg,
    backgroundColor: "#FAFCFF"
  },
  avatarBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center"
  },
  summaryCopy: { flex: 1, gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border },
  infoLine: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  infoCopy: { flex: 1, gap: 3 },
  infoTitle: { color: "#0F1F3D", fontSize: 14, fontWeight: "500" },
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
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  questionIndexText: { color: "#fff", fontSize: 16, fontWeight: "400" },
  questionBody: { flex: 1, gap: spacing.md, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.md },
  questionTitle: { color: "#0F1F3D", fontSize: 15, fontWeight: "600", lineHeight: 22 },
  subHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  subHeaderImage: { width: 30, height: 30 },
  subHeaderText: { color: "#0F1F3D", fontSize: 16, fontWeight: "500" },
  riskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff"
  },
  riskIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  riskBody: { flex: 1, gap: spacing.sm },
  factorGrid: { flexDirection: "row", gap: spacing.md },
  factorBox: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm
  },
  factorTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  factorTitle: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 20 },
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
  factorItemPositive: {
    backgroundColor: "#FFFFFF",
    borderColor: positiveFactorBorder
  },
  factorItemNegative: {
    backgroundColor: "#FFFFFF",
    borderColor: negativeFactorBorder
  },
  factorText: { flex: 1, color: "#24324A", fontSize: 12, lineHeight: 18, fontWeight: "400" },
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
  tipCardBorderless: {
    borderWidth: 0
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#60A5FA"
  },
  tipImageIcon: {
    width: 55,
    height: 55,
    borderRadius: 0,
    backgroundColor: "transparent"
  },
  tipIconImage: {
    width: 50,
    height: 50
  },
  tipCopy: { flex: 1, gap: 4 },
  tipTitle: { color: "#0F1F3D", fontSize: 15, fontWeight: "500" },
  tipTitleMedium: { fontWeight: "500" },
  tipText: { color: "#4B5B78", fontSize: 13, lineHeight: 20 }
});
