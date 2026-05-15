import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";

const heroImage = require("../../img/2-1.png") as ImageSourcePropType;
const guideImage = require("../../img/2-2.png") as ImageSourcePropType;
const followImage = require("../../img/2-3.png") as ImageSourcePropType;
const resultImage = require("../../img/2-4.png") as ImageSourcePropType;

const highlights: Array<{ image: ImageSourcePropType; title: string; text: string }> = [
  { image: guideImage, title: "智能引导", text: "一步步提问，不用一次填很多内容" },
  { image: followImage, title: "动态追问", text: "根据你的回答，继续了解更关键的信息" },
  { image: resultImage, title: "个性化方向建议", text: "结合你的背景和偏好生成推荐结果" }
];

export default function ExploreIntro() {
  return (
    <Screen
      navTitle="发现"
      backTo="/(tabs)/discover"
      activeTab="发现"
    >
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>职业方向探索</Text>
          <Text style={styles.heroText}>通过 AI 引导式提问，了解你的背景、兴趣和现实约束，帮你找到更适合自己的职业方向。</Text>
        </View>
        <Image source={heroImage} style={styles.heroImage} resizeMode="contain" />
      </View>

      <View style={styles.featureList}>
        {highlights.map((item) => (
          <FeatureCard key={item.title} image={item.image} title={item.title} text={item.text} />
        ))}
      </View>
      <View style={styles.footerContent}>
        <View style={styles.durationRow}>
          <MaterialIcons name="schedule" size={17} color="#637086" />
          <Text style={styles.durationText}>整个过程大约 3-5 分钟</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/explore/basic-profile")}>
          <Text style={styles.primaryButtonText}>开始探索</Text>
          <MaterialIcons name="chevron-right" size={25} color="#fff" />
        </Pressable>
      </View>
    </Screen>
  );
}

function FeatureCard({ image, title, text }: { image: ImageSourcePropType; title: string; text: string }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureImageCircle}>
        <Image source={image} style={styles.featureImage} resizeMode="contain" />
      </View>
      <View style={styles.featureCopy}>
        <View style={styles.featureTitleRow}>
          <View style={styles.purpleDot} />
          <Text style={styles.featureTitle}>{title}</Text>
        </View>
        <Text style={styles.featureText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 372,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    overflow: "hidden",
    backgroundColor: "#F8F8FD"
  },
  heroCopy: {
    width: "62%",
    gap: spacing.md,
    zIndex: 2
  },
  heroTitle: {
    color: "#071936",
    fontSize: 30,
    lineHeight: 48,
    fontWeight: "900",
    letterSpacing: 0
  },
  heroText: {
    color: "#4C5B73",
    fontSize: 14,
    lineHeight: 31
  },
  heroImage: {
    position: "absolute",
    right: -10,
    top: -20,
    width: 220,
    height: 275,
  },
  featureList: {
    marginTop: -180,
    gap: spacing.md
  },
  featureCard: {
    minHeight: 95,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "#E6ECF6",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    shadowColor: "#1D355E",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 2
  },
  featureImage: {
    width: 55,
    height: 55
  },
  featureImageCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8FD"
  },
  featureCopy: {
    flex: 1,
    gap: spacing.sm
  },
  featureTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  purpleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent
  },
  featureTitle: {
    color: "#0B1D3A",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 26
  },
  featureText: {
    color: "#4C5B73",
    fontSize: 14,
    lineHeight: 24
  },
  footerContent: {
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6
  },
  durationText: {
    color: "#637086",
    fontSize: 15
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: radius.pill,
    backgroundColor: "#1062F7",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    shadowColor: "#0B63F6",
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 20,
    letterSpacing: 0
  }
});
