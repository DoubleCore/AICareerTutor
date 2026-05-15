import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton, BottomSheet, Card, Screen, StatusTag, uiStyles } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";
import { DirectionRecommendation } from "@/types/domain";

const directionIcons = {
  "AI产品经理": { name: "business-center", color: colors.primary, bg: "#DBEAFE" },
  数据分析师: { name: "bar-chart", color: colors.accent, bg: "#EDE9FE" },
  运营策略: { name: "pie-chart", color: "#F97316", bg: "#FFEDD5" }
} as const;

const abilities = [
  { title: "结构化表达", icon: "article", color: colors.primary },
  { title: "沟通协作", icon: "groups", color: colors.accent },
  { title: "项目推进", icon: "flag", color: colors.success },
  { title: "数据理解", icon: "bar-chart", color: "#F97316" },
  { title: "创意策划", icon: "lightbulb", color: "#EAB308" }
] as const;

function SectionTitle({ icon, title }: { icon: keyof typeof MaterialIcons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIcon}>
        <MaterialIcons name={icon} size={16} color="#fff" />
      </View>
      <Text style={uiStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

function DirectionRow({ direction, onPortrait }: { direction: DirectionRecommendation; onPortrait: () => void }) {
  const visual = directionIcons[direction.title as keyof typeof directionIcons] ?? directionIcons["AI产品经理"];
  return (
    <View style={styles.directionRow}>
      <View style={[styles.directionIcon, { backgroundColor: visual.bg }]}>
        <MaterialIcons name={visual.name} size={28} color={visual.color} />
      </View>
      <View style={styles.directionContent}>
        <View style={styles.directionHeader}>
          <Text style={styles.directionTitle}>{direction.title}</Text>
          <StatusTag label={direction.match} />
        </View>
        <Text style={uiStyles.muted}>{direction.reason}</Text>
      </View>
      <Pressable onPress={onPortrait} style={styles.tinyButton}>
        <Text style={styles.tinyButtonText}>岗位画像</Text>
      </Pressable>
    </View>
  );
}

function PortraitRow({ icon, color, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; color: string; label: string; value: string }) {
  return (
    <View style={styles.portraitRow}>
      <View style={styles.portraitLabel}>
        <MaterialIcons name={icon} size={21} color={color} />
        <Text style={styles.portraitLabelText}>{label}</Text>
      </View>
      <Text style={styles.portraitValue}>{value}</Text>
    </View>
  );
}

export default function ExploreResult() {
  const { directions } = useAppStore();
  const [portrait, setPortrait] = useState<DirectionRecommendation | null>(null);

  return (
    <>
      <Screen
        navTitle="发现"
        backTo="/explore/confirm"
        title="你的职业方向探索结果 ✦"
        subtitle="系统结合你的背景、兴趣、经历和现实约束，为你推荐以下方向"
        footer={<AppButton title="进入探索路径" onPress={() => router.push("/explore/path")} />}
      >
        <Card style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
            <Text style={uiStyles.itemTitle}>AI 结论</Text>
          </View>
          <Text style={styles.conclusion}>你更适合兼顾逻辑分析与沟通协作的岗位，而不是高度封闭、纯技术导向的方向。</Text>
        </Card>

        <Card>
          <SectionTitle icon="stars" title="推荐方向" />
          {directions.map((direction) => (
            <DirectionRow key={direction.id} direction={direction} onPortrait={() => setPortrait(direction)} />
          ))}
        </Card>

        <Card>
          <SectionTitle icon="bolt" title="你目前更明显的可迁移能力" />
          <View style={styles.abilityGrid}>
            {abilities.map((ability) => (
              <View key={ability.title} style={styles.abilityItem}>
                <MaterialIcons name={ability.icon} size={24} color={ability.color} />
                <Text style={styles.abilityText}>{ability.title}</Text>
              </View>
            ))}
          </View>
          <Text style={uiStyles.muted}>这些能力在产品、运营、分析等岗位中都有较高可迁移价值。</Text>
        </Card>

        <Card>
          <SectionTitle icon="rule" title="当前不建议优先尝试的方向" />
          <View style={styles.notRow}>
            <View style={styles.grayIcon}>
              <MaterialIcons name="code" size={24} color="#6B7280" />
            </View>
            <View style={styles.notContent}>
              <View style={styles.notHeader}>
                <Text style={styles.directionTitle}>纯算法研发</Text>
                <Text style={styles.grayChip}>当前不建议优先尝试</Text>
              </View>
              <Text style={uiStyles.muted}>该方向通常要求更强的数学、编程和长期技术积累，与你当前的经历与兴趣匹配度较低。</Text>
            </View>
          </View>
          <View style={styles.notRow}>
            <View style={styles.grayIcon}>
              <MaterialIcons name="format-list-bulleted" size={24} color="#6B7280" />
            </View>
            <View style={styles.notContent}>
              <View style={styles.notHeader}>
                <Text style={styles.directionTitle}>高度重复型执行岗位</Text>
                <Text style={styles.grayChip}>不建议长期优先投入</Text>
              </View>
              <Text style={uiStyles.muted}>你更适合有一定分析、表达或推动空间的岗位，而不是长期纯重复执行工作。</Text>
            </View>
          </View>
        </Card>
      </Screen>

      <BottomSheet visible={!!portrait} title="岗位画像" onClose={() => setPortrait(null)}>
        {portrait ? (
          <>
            <View style={styles.portraitHero}>
              <View style={[styles.directionIcon, { backgroundColor: (directionIcons[portrait.title as keyof typeof directionIcons] ?? directionIcons["AI产品经理"]).bg }]}>
                <MaterialIcons
                  name={(directionIcons[portrait.title as keyof typeof directionIcons] ?? directionIcons["AI产品经理"]).name}
                  size={30}
                  color={(directionIcons[portrait.title as keyof typeof directionIcons] ?? directionIcons["AI产品经理"]).color}
                />
              </View>
              <View style={styles.portraitHeroText}>
                <View style={styles.directionHeader}>
                  <Text style={styles.portraitTitle}>{portrait.title}</Text>
                  <StatusTag label={portrait.match === "高" ? "高匹配" : portrait.match} />
                </View>
                <Text style={uiStyles.muted}>{portrait.reason}</Text>
              </View>
            </View>
            <PortraitRow icon="article" color={colors.primary} label="日常工作" value={portrait.portrait.dailyWork.join("、")} />
            <PortraitRow icon="flag" color={colors.accent} label="常见挑战" value={portrait.portrait.challenges.join("、")} />
            <PortraitRow icon="person" color={colors.success} label="所需能力" value={portrait.portrait.abilities.join("、")} />
            <PortraitRow icon="trending-up" color="#F97316" label="发展路径" value={portrait.portrait.path} />
            <AppButton title="知道了" onPress={() => setPortrait(null)} />
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  aiCard: {
    paddingTop: spacing.xl
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  aiBadge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  aiBadgeText: {
    color: "#fff",
    fontWeight: "900"
  },
  conclusion: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 23
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
  directionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff"
  },
  directionIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center"
  },
  directionContent: {
    flex: 1,
    gap: spacing.xs
  },
  directionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  directionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  tinyButton: {
    minHeight: 34,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: "#fff"
  },
  tinyButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  abilityGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  abilityItem: {
    flex: 1,
    minHeight: 70,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "#fff"
  },
  abilityText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  notRow: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff"
  },
  grayIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB"
  },
  notContent: {
    flex: 1,
    gap: spacing.xs
  },
  notHeader: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    alignItems: "center"
  },
  grayChip: {
    color: colors.gray,
    backgroundColor: "#F3F4F6",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "800"
  },
  portraitHero: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    paddingBottom: spacing.sm
  },
  portraitHeroText: {
    flex: 1,
    gap: spacing.xs
  },
  portraitTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  portraitRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff"
  },
  portraitLabel: {
    width: 94,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border
  },
  portraitLabelText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  portraitValue: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600"
  }
});
