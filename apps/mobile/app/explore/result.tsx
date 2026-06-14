import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton, BottomSheet, Card, Screen, uiStyles } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { ApiError } from "@/services/apiClient";
import { ExploreResult as ExploreResultData, generateExploreResult } from "@/services/exploreApi";
import { useAppStore } from "@/store/useAppStore";
import { DirectionRecommendation } from "@/types/domain";

const resultTitleIcon = require("../../img/3-1.png") as ImageSourcePropType;
const aiConclusionIcon = require("../../img/7-1.png") as ImageSourcePropType;
const recommendationIcon = require("../../img/7-2.png") as ImageSourcePropType;
const transferableAbilityIcon = require("../../img/7-3.png") as ImageSourcePropType;
const notRecommendedIcon = require("../../img/7-4.png") as ImageSourcePropType;
const productManagerIcon = require("../../img/7-5.png") as ImageSourcePropType;
const dataAnalystIcon = require("../../img/7-6.png") as ImageSourcePropType;
const operationsStrategyIcon = require("../../img/7-7.png") as ImageSourcePropType;
const structuredExpressionIcon = require("../../img/7-8.png") as ImageSourcePropType;
const collaborationIcon = require("../../img/7-9.png") as ImageSourcePropType;
const projectProgressIcon = require("../../img/7-10.png") as ImageSourcePropType;
const dataUnderstandingIcon = require("../../img/7-11.png") as ImageSourcePropType;
const creativePlanningIcon = require("../../img/7-12.png") as ImageSourcePropType;

const abilities = [
  { title: "结构化表达", icon: structuredExpressionIcon },
  { title: "沟通协作", icon: collaborationIcon },
  { title: "项目推进", icon: projectProgressIcon },
  { title: "数据理解", icon: dataUnderstandingIcon },
  { title: "创意策划", icon: creativePlanningIcon }
] as const;

// 探索链路做实:apiResult 到达前的兜底常量(与后端 build_mock_explore_result 内容一致)。
const defaultConclusion = "你更适合兼顾逻辑分析与沟通协作的岗位，而不是高度封闭、纯技术导向的方向。";
const defaultAbilityTitles = abilities.map((item) => item.title);
const defaultNotRecommended = [
  { title: "纯算法研发", reason: "该方向通常要求更强的数学、编程和长期技术积累，与你当前的经历与兴趣匹配度较低。" },
  { title: "高度重复型执行岗位", reason: "你更适合有一定分析、表达或推动空间的岗位，而不是长期纯重复执行工作。" }
];
// 能力 title → 图标映射(后端返回的能力名按此取图标,缺省用默认图标)。
const abilityIconByTitle: Record<string, ImageSourcePropType> = abilities.reduce(
  (acc, item) => ({ ...acc, [item.title]: item.icon }),
  {} as Record<string, ImageSourcePropType>
);
const defaultAbilityIcon = structuredExpressionIcon;

const directionIcons = {
  "AI产品经理": { image: productManagerIcon },
  数据分析师: { image: dataAnalystIcon },
  运营策略: { image: operationsStrategyIcon }
} as const;

const directionIconVisualOffset = -6;

function SectionTitle({ icon, title }: { icon: ImageSourcePropType; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIcon}>
        <Image source={icon} style={styles.sectionIconImage} resizeMode="contain" />
      </View>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function MatchTag({ label }: { label: string }) {
  const variant =
    label === "高"
      ? styles.matchTagHigh
      : label === "较高"
        ? styles.matchTagMedium
        : styles.matchTagTry;
  const textVariant =
    label === "高"
      ? styles.matchTagTextHigh
      : label === "较高"
        ? styles.matchTagTextMedium
        : styles.matchTagTextTry;

  return (
    <View style={[styles.matchTag, variant]}>
      <Text style={[styles.matchTagText, textVariant]}>{label}</Text>
    </View>
  );
}

function DirectionRow({ direction, onPortrait }: { direction: DirectionRecommendation; onPortrait: () => void }) {
  const visual = directionIcons[direction.title as keyof typeof directionIcons] ?? directionIcons["AI产品经理"];
  return (
    <View style={styles.directionRow}>
      <View style={styles.directionIcon}>
        <Image source={visual.image} style={styles.directionIconImage} resizeMode="contain" />
      </View>
      <View style={styles.directionContent}>
        <View style={styles.directionHeader}>
          <Text style={styles.directionTitle}>{direction.title}</Text>
          <MatchTag label={direction.match} />
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
  const { directions: storeDirections } = useAppStore();
  const [portrait, setPortrait] = useState<DirectionRecommendation | null>(null);
  const [apiResult, setApiResult] = useState<ExploreResultData | null>(null);

  // 探索链路做实:挂载时按当前画像拉后端方向推荐结果;失败回退 store/mock(对齐面试链路范式)。
  useEffect(() => {
    let cancelled = false;
    generateExploreResult(useAppStore.getState().profile)
      .then((data) => {
        if (!cancelled) setApiResult(data);
      })
      .catch((err: unknown) => {
        const reason = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
        console.warn("[result] 拉取后端方向推荐失败,回退本地数据:", reason);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // apiResult 到达前用 store/常量兜底,演示不中断。
  const directions = apiResult?.directions ?? storeDirections;
  const conclusion = apiResult?.conclusion ?? defaultConclusion;
  const transferableAbilities = apiResult?.transferableAbilities ?? defaultAbilityTitles;
  const notRecommended = apiResult?.notRecommended ?? defaultNotRecommended;

  return (
    <>
      <Screen
        navTitle="发现"
        backTo="/explore/confirm"
        footer={<AppButton title="进入探索路径" onPress={() => router.push("/explore/path")} />}
      >
        <View style={styles.resultHero}>
          <View style={styles.resultTitleRow}>
            <Text style={styles.resultTitle}>你的职业方向探索结果</Text>
            <Image source={resultTitleIcon} style={styles.resultTitleIcon} resizeMode="contain" />
          </View>
          <Text style={styles.resultSubtitle}>系统结合你的背景、兴趣、经历和现实约束，为你推荐以下方向</Text>
        </View>

        <Card style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiBadge}>
              <Image source={aiConclusionIcon} style={styles.aiBadgeImage} resizeMode="contain" />
            </View>
            <Text style={uiStyles.itemTitle}>AI 结论</Text>
          </View>
          <Text style={styles.conclusion}>{conclusion}</Text>
        </Card>

        <Card style={styles.recommendationCard}>
          <SectionTitle icon={recommendationIcon} title="推荐方向" />
          {directions.map((direction) => (
            <DirectionRow key={direction.id} direction={direction} onPortrait={() => setPortrait(direction)} />
          ))}
        </Card>

        <Card style={styles.resultSectionCard}>
          <SectionTitle icon={transferableAbilityIcon} title="你目前更明显的可迁移能力" />
          <View style={styles.abilityGrid}>
            {transferableAbilities.map((ability) => (
              <View key={ability} style={styles.abilityItem}>
                <Image source={abilityIconByTitle[ability] ?? defaultAbilityIcon} style={styles.abilityIconImage} resizeMode="contain" />
                <Text style={styles.abilityText}>{ability}</Text>
              </View>
            ))}
          </View>
          <Text style={uiStyles.muted}>这些能力在产品、运营、分析等岗位中都有较高可迁移价值。</Text>
        </Card>

        <Card style={styles.resultSectionCard}>
          <SectionTitle icon={notRecommendedIcon} title="当前不建议优先尝试的方向" />
          {notRecommended.map((item, index) => (
            <View key={item.title} style={styles.notRow}>
              <View style={styles.grayIcon}>
                <MaterialIcons name={index === 0 ? "code" : "format-list-bulleted"} size={24} color="#FFFFFF" />
              </View>
              <View style={styles.notContent}>
                <View style={styles.notHeader}>
                  <Text style={styles.directionTitle}>{item.title}</Text>
                  <Text style={styles.grayChip}>{index === 0 ? "当前不建议优先尝试" : "不建议长期优先投入"}</Text>
                </View>
                <Text style={uiStyles.muted}>{item.reason}</Text>
              </View>
            </View>
          ))}
        </Card>
      </Screen>

      <BottomSheet visible={!!portrait} title="岗位画像" onClose={() => setPortrait(null)}>
        {portrait ? (
          <>
            <View style={styles.portraitHero}>
              <View style={styles.directionIcon}>
                <Image source={(directionIcons[portrait.title as keyof typeof directionIcons] ?? directionIcons["AI产品经理"]).image} style={styles.directionIconImage} resizeMode="contain" />
              </View>
              <View style={styles.portraitHeroText}>
                <View style={styles.directionHeader}>
                  <Text style={styles.portraitTitle}>{portrait.title}</Text>
                  <MatchTag label={portrait.match} />
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
  resultHero: {
    gap: spacing.sm
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  resultTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "700"
  },
  resultTitleIcon: {
    width: 28,
    height: 28
  },
  resultSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22
  },
  aiCard: {
    paddingTop: 12,
    paddingHorizontal: 18,
    gap: 4,
    paddingBottom: 14
  },
  recommendationCard: {
    paddingTop: 6,
    gap: 6
  },
  resultSectionCard: {
    paddingTop: 6,
    gap: 6
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  aiBadge: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  aiBadgeImage: {
    width: 39,
    height: 39
  },
  conclusion: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 23
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0
  },
  sectionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  sectionIconImage: {
    width: 30,
    height: 30
  },
  sectionTitleText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
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
    alignItems: "center",
    justifyContent: "center"
  },
  directionIconImage: {
    width: 58,
    height: 58,
    marginLeft: directionIconVisualOffset
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
    fontWeight: "700"
  },
  matchTag: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  matchTagHigh: {
    backgroundColor: "#E1F5E9"
  },
  matchTagMedium: {
    backgroundColor: "#E3EBFE"
  },
  matchTagTry: {
    backgroundColor: "#FEEFE6"
  },
  matchTagText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  },
  matchTagTextHigh: {
    color: "#47A77F"
  },
  matchTagTextMedium: {
    color: "#3275FB"
  },
  matchTagTextTry: {
    color: "#FCA96B"
  },
  tinyButton: {
    minHeight: 30,
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
    fontWeight: "700"
  },
  abilityGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  abilityItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "#fff"
  },
  abilityIconImage: {
    width: 28,
    height: 28
  },
  abilityText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center"
  },
  notRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff"
  },
  grayIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7D819A"
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
    color: "#595a5c",
    backgroundColor: "#F3F4F6",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700"
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
    fontWeight: "700"
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
    color: "#232324",
    fontSize: 14,
    fontWeight: "700"
  },
  portraitValue: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500"
  }
});
