import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];
type ChoiceTone = "blue" | "violet";

const compassImage = require("../../img/znz.png") as ImageSourcePropType;
const rocketImage = require("../../img/hj.png") as ImageSourcePropType;

const choices: Array<{
  tone: ChoiceTone;
  image: ImageSourcePropType;
  title: string;
  subtitle: string;
  tags: Array<{ icon: IconName; label: string }>;
  onPress: () => void;
}> = [
  {
    tone: "blue",
    image: compassImage,
    title: "我还在探索方向",
    subtitle: "还不确定适合什么工作，\n或正在考虑转行、换方向",
    tags: [
      { icon: "help-outline", label: "迷茫期" },
      { icon: "swap-horiz", label: "转方向" }
    ],
    onPress: () => router.push("/explore/intro")
  },
  {
    tone: "violet",
    image: rocketImage,
    title: "我想提升求职成功率",
    subtitle: "已经有目标岗位，正在投递、\n准备面试，或想复盘面试表现",
    tags: [
      { icon: "work-outline", label: "求职中" },
      { icon: "chat-bubble-outline", label: "面试中" }
    ],
    onPress: () => router.push("/interview/upload")
  }
];

export default function Discover() {
  return (
    <Screen navTitle="发现" activeTab="发现">
      <View style={styles.hero}>
        <View style={styles.orbitOne} />
        <View style={styles.orbitTwo} />
        <View style={styles.sparkOne} />
        <View style={styles.sparkTwo} />
        <Text style={styles.title}>你现在更接近哪种状态？</Text>
        <Text style={styles.subtitle}>我会根据你的状态，提供不同的职业帮助。</Text>
      </View>

      <View style={styles.choiceList}>
        {choices.map((choice) => (
          <ChoiceCard key={choice.title} {...choice} />
        ))}
      </View>
    </Screen>
  );
}

function ChoiceCard({ tone, image, title, subtitle, tags, onPress }: (typeof choices)[number]) {
  const palette = tone === "blue" ? bluePalette : violetPalette;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choiceCard, { borderColor: palette.border, backgroundColor: palette.bg }, pressed ? styles.choicePressed : null]}>
      <View style={[styles.cardGlow, { backgroundColor: palette.glow }]} />
      <Image source={image}style={[styles.choiceImage, tone === "blue" ? styles.compassImage : styles.rocketImage]}resizeMode="contain"/>
      <View style={styles.choiceCopy}>
        <View style={styles.choiceTitleRow}>
          <Text style={styles.choiceTitle} numberOfLines={1}>{title}</Text>
          <MaterialIcons name="chevron-right" size={27} color="#0B1D3A" />
        </View>
        <Text style={styles.choiceText}>{subtitle}</Text>
        <View style={styles.tags}>
          {tags.map((tag) => (
            <View key={tag.label} style={[styles.tag, { backgroundColor: palette.tagBg, borderColor: palette.tagBorder }]}>
              <MaterialIcons name={tag.icon} size={14} color={palette.main} />
              <Text style={[styles.tagText, { color: palette.main }]}>{tag.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const bluePalette = {
  main: "#2563EB",
  bg: "#F8FBFF",
  border: "#5F95FF",
  tagBg: "#EAF3FF",
  tagBorder: "#BFD8FF",
  glow: "rgba(219,234,254,0.78)"
};

const violetPalette = {
  main: "#7C3AED",
  bg: "#FCFAFF",
  border: "#A78BFA",
  tagBg: "#F2EAFF",
  tagBorder: "#D9C7FF",
  glow: "rgba(237,233,254,0.8)"
};

const styles = StyleSheet.create({
  hero: {
    position: "relative",
    minHeight: 180,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: 72,
    overflow: "hidden",
    backgroundColor: "#F8FAFF"
  },
  title: {
    width: "86%",
    color: "#0B1D3A",
    fontSize: 29,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    marginTop: spacing.md,
    width: "82%",
    color: "#5C6980",
    fontSize: 16,
    lineHeight: 26
  },
  orbitOne: {
    position: "absolute",
    right: -54,
    top: 0,
    width: 158,
    height: 158,
    borderRadius: 79,
    borderWidth: 1,
    borderColor: "#D4E1FF"
  },
  orbitTwo: {
    position: "absolute",
    right: -18,
    top: -46,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "#E4DAFF"
  },
  sparkOne: {
    position: "absolute",
    right: 62,
    top: 96,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#9BAFFF"
  },
  sparkTwo: {
    position: "absolute",
    right: 28,
    top: 66,
    width: 24,
    height: 24,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: "#AEBFFF",
    transform: [{ rotate: "45deg" }]
  },
  choiceList: {
    gap: spacing.lg,
    marginTop: 10
  },
  choiceCard: {
    minHeight: 200,
    borderRadius: 28,
    borderWidth: 1.3,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    overflow: "hidden",
    shadowColor: "#1F3A68",
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3
  },
  choicePressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9
  },
  cardGlow: {
    position: "absolute",
    left: 18,
    top: 32,
    width: 138,
    height: 118,
    borderRadius: 70
  },
  choiceImage: {
    width: 154,
    height: 140
  },
  choiceCopy: {
    flex: 1,
    gap: spacing.md
  },
  choiceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4
  },
  choiceTitle: {
    flex: 1,
    color: "#0B1D3A",
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: 0
  },
  choiceText: {
    color: "#4B5B73",
    fontSize: 15,
    lineHeight: 25
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tag: {
    minHeight: 30,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1
  },
  tagText: {
    fontSize: 13
  },
  compassImage: {
    width: 154,
    aspectRatio: 1,
    transform: [{ translateX: -4 }]
  },
  rocketImage: {
    width: 154,
    height: 140
  }

});
