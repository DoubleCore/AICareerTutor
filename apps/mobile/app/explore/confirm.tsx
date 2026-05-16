import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, ImageSourcePropType, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { AppButton, BottomSheet, ConfirmDialog, Screen, TextField } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";
import { ExploreProfile } from "@/types/domain";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const starIcon = require("../../img/4-1.png") as ImageSourcePropType;
const profileFileIcon = require("../../img/4-2.png") as ImageSourcePropType;
const organizingProgressGradientStyle =
  Platform.OS === "web"
    ? ({
        backgroundImage: "linear-gradient(90deg, #EEF3FF 0%, #CFE0FF 18%, #71A7FF 45%, #3B82F6 72%, #A884FF 100%)"
      } as never)
    : null;

type EditableSection = {
  title: string;
  icon: IconName;
  color: string;
  fields: { key: keyof ExploreProfile; label: string }[];
};

const sections: EditableSection[] = [
  {
    title: "基础背景",
    icon: "person-outline",
    color: colors.primary,
    fields: [
      { key: "stage", label: "当前阶段" },
      { key: "education", label: "学历状态" },
      { key: "major", label: "所学专业" }
    ]
  },
  {
    title: "兴趣与工作偏好",
    icon: "favorite-border",
    color: colors.accent,
    fields: [
      { key: "interests", label: "兴趣偏好" },
      { key: "workPreferences", label: "工作偏好" }
    ]
  },
  {
    title: "探索目标与现实约束",
    icon: "my-location",
    color: "#2563EB",
    fields: [
      { key: "goal", label: "探索目标" },
      { key: "constraints", label: "现实约束" }
    ]
  },
  {
    title: "经历与能力补充",
    icon: "business-center",
    color: colors.success,
    fields: [
      { key: "experiences", label: "经历类型" },
      { key: "workTypes", label: "做过的事情" },
      { key: "preferredStates", label: "偏好工作状态" },
      { key: "followups", label: "补充回答" }
    ]
  }
];

const aiSummary = [
  "你在经历里更有成就感的部分，会成为判断方向的重要依据。",
  "你的兴趣、偏好和现实约束会一起影响方向建议。",
  "确认后，我会基于这份画像生成更具体的职业方向。"
];

const toText = (value: string | string[]) => (Array.isArray(value) ? value.filter(Boolean).join("、") : value || "待补充");

export default function Confirm() {
  const { skipOrganizing } = useLocalSearchParams<{ skipOrganizing?: string }>();
  const shouldSkipOrganizing = skipOrganizing === "1";
  const [organizing, setOrganizing] = useState(!shouldSkipOrganizing);
  const [showExit, setShowExit] = useState(false);
  const [editing, setEditing] = useState<EditableSection | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [organizingTrackWidth, setOrganizingTrackWidth] = useState(0);
  const organizingProgress = useRef(new Animated.Value(0.03)).current;
  const { height } = useWindowDimensions();
  const { profile, setProfileField } = useAppStore();
  const organizingMinHeight = Math.max(620, height - 72 - 72 + 110);
  const organizingProgressWidth = organizingTrackWidth
    ? organizingProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [8, organizingTrackWidth]
      })
    : 8;

  useEffect(() => {
    setOrganizing(!shouldSkipOrganizing);
    organizingProgress.setValue(0.03);
  }, [organizingProgress, shouldSkipOrganizing]);

  useEffect(() => {
    if (!organizing) return;

    organizingProgress.setValue(0.03);
    const animation = Animated.sequence([
      Animated.timing(organizingProgress, { toValue: 0.35, duration: 760, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(organizingProgress, { toValue: 0.68, duration: 840, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(organizingProgress, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: false })
    ]);
    animation.start(({ finished }) => {
      if (finished) setOrganizing(false);
    });
    return () => animation.stop();
  }, [organizing, organizingProgress]);

  const handleOrganizingTrackLayout = (event: LayoutChangeEvent) => {
    setOrganizingTrackWidth(event.nativeEvent.layout.width);
  };

  const openEdit = (section: EditableSection) => {
    const next: Record<string, string> = {};
    section.fields.forEach((field) => {
      next[String(field.key)] = toText(profile[field.key]);
    });
    setDraft(next);
    setEditing(section);
  };

  const saveEdit = () => {
    if (!editing) return;

    editing.fields.forEach((field) => {
      const current = profile[field.key];
      const value = draft[String(field.key)] ?? "";
      const nextValue = Array.isArray(current)
        ? value
            .split(/[、，,\n]+/)
            .map((item) => item.trim())
            .filter(Boolean)
        : value;

      setProfileField(field.key, nextValue);
    });
    setEditing(null);
  };

  if (organizing) {
    return (
      <>
        <Screen navTitle="发现" close onClose={() => setShowExit(true)} activeTab="发现">
          <View style={[styles.organizingHero, { minHeight: organizingMinHeight }]}>
            <View style={styles.organizingBubble}>
              <Text style={styles.organizingBubbleText}>
                好的，我已经基本了解你了。接下来我会把你的信息整理成一份职业画像，请你确认后，我再为你生成方向建议。
              </Text>
            </View>

            <View style={styles.organizingCenter}>
              <View style={styles.loadingOrbWrap}>
                <View style={styles.orbitLine} />
                <View style={styles.loadingOrbOuter}>
                  <View style={styles.loadingOrb}>
                    <View style={styles.orbDot} />
                    <View style={[styles.orbDot, styles.orbDotActive]} />
                    <View style={styles.orbDot} />
                  </View>
                </View>
              </View>

              <View style={styles.organizingSteps}>
                <View style={styles.organizingStep}>
                  <View style={styles.stepIconWrap}>
                    <Image source={profileFileIcon} style={styles.stepFileImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.organizingStepText}>正在整理你的职业画像...</Text>
                </View>
                <View style={styles.organizingStep}>
                  <View style={[styles.stepIconWrap, styles.stepIconWrapPurple]}>
                    <Image source={starIcon} style={styles.stepImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.organizingStepText}>正在生成探索摘要...</Text>
                </View>
              </View>

              <View style={styles.organizingProgressTrack} onLayout={handleOrganizingTrackLayout}>
                <Animated.View style={[styles.organizingProgressFill, organizingProgressGradientStyle, { width: organizingProgressWidth }]} />
              </View>
            </View>
          </View>
        </Screen>

        <ConfirmDialog
          visible={showExit}
          title="退出本次探索？"
          message="当前未确认的内容不会保留，退出后需要重新开始。"
          cancelText="继续探索"
          confirmText="退出"
          onCancel={() => setShowExit(false)}
          onConfirm={() => router.replace("/explore/intro")}
        />
      </>
    );
  }

  return (
    <>
      <Screen navTitle="发现" close onClose={() => setShowExit(true)} activeTab="发现">
        <View style={styles.hero}>
          <Text style={styles.pageTitle}>信息确认</Text>
          <Text style={styles.pageSubtitle}>请确认以下信息是否准确。确认后，我会据此生成职业方向建议。</Text>
        </View>

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Image source={profileFileIcon} style={styles.introImage} resizeMode="contain" />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>你的职业画像已整理完成</Text>
            <Text style={styles.introText}>你可以直接确认，也可以先修改下方信息。</Text>
          </View>
        </View>

        {sections.map((section) => (
          <ConfirmSectionCard key={section.title} section={section} profile={profile} onEdit={() => openEdit(section)} />
        ))}

        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Image source={starIcon} style={styles.aiImage} resizeMode="contain" />
            </View>
            <View style={styles.aiTitleWrap}>
              <Text style={styles.cardTitle}>AI 补充理解</Text>
              <Text style={styles.aiBased}>基于你的回答</Text>
            </View>
          </View>
          <View style={styles.bulletList}>
            {aiSummary.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <AppButton title="确认并生成方向建议" onPress={() => router.push("/explore/result")} style={styles.confirmActionButton} />
      </Screen>

      <BottomSheet visible={!!editing} title={editing ? `编辑${editing.title}` : "编辑"} onClose={() => setEditing(null)}>
        {editing?.fields.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            value={draft[String(field.key)] ?? ""}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, [String(field.key)]: value }))}
            multiline
          />
        ))}
        <Text style={styles.editHint}>可以直接修改、补充或删除内容；多个关键词建议用顿号或逗号分隔。</Text>
        <View style={styles.editActions}>
          <View style={styles.editAction}>
            <AppButton title="取消" variant="secondary" onPress={() => setEditing(null)} />
          </View>
          <View style={styles.editAction}>
            <AppButton title="保存修改" onPress={saveEdit} />
          </View>
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={showExit}
        title="退出本次探索？"
        message="当前未确认的内容不会保留，退出后需要重新开始。"
        cancelText="继续探索"
        confirmText="退出"
        onCancel={() => setShowExit(false)}
        onConfirm={() => router.replace("/explore/intro")}
      />
    </>
  );
}

function ConfirmSectionCard({ section, profile, onEdit }: { section: EditableSection; profile: ExploreProfile; onEdit: () => void }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${section.color}14` }]}>
          <MaterialIcons name={section.icon} size={24} color={section.color} />
        </View>
        <Text style={styles.cardTitle}>{section.title}</Text>
        <Pressable onPress={onEdit} style={styles.editButton}>
          <MaterialIcons name="edit" size={17} color={colors.muted} />
          <Text style={styles.editButtonText}>编辑</Text>
        </Pressable>
      </View>
      <View style={styles.fieldList}>
        {section.fields.map((field) => (
          <InfoRow key={field.key} label={field.label} value={profile[field.key]} />
        ))}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string | string[] }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{toText(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  organizingHero: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: -110,
    paddingTop: spacing.xl,
    paddingBottom: 110,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    backgroundColor: "#F8FBFF"
  },
  organizingBubble: {
    width: "94%",
    borderRadius: 18,
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8EDF7",
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  organizingBubbleText: { color: "#13233F", fontSize: 15, lineHeight: 26, fontWeight: "400" },
  organizingCenter: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: spacing.lg ,transform: [{ translateY: -30 }]},
  loadingOrbWrap: { width: 176, height: 130, alignItems: "center", justifyContent: "center" },
  orbitLine: { position: "absolute", width: 170, height: 42, borderRadius: 42, borderWidth: 1, borderColor: "#D8E4FF", transform: [{ rotate: "7deg" }] },
  loadingOrbOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(226,239,255,0.62)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 }
  },
  loadingOrb: { width: 70, height: 70, borderRadius: 35, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11, backgroundColor: "#fff" },
  orbDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#AFC4F7" },
  orbDotActive: { backgroundColor: colors.primary },
  organizingSteps: { width: "62%", gap: spacing.md },
  organizingStep: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepIconWrap: { width: 40, height: 40, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF2FF" },
  stepIconWrapPurple: { backgroundColor: "#F1ECFF" },
  stepImage: { width: 24, height: 24 },
  stepFileImage: { width: 20, height: 20 },
  organizingStepText: { flex: 1, color: "#13233F", fontSize: 13, lineHeight: 20, fontWeight: "400" },
  organizingProgressTrack: { position: "relative", width: "62%", height: 7, borderRadius: radius.pill, overflow: "hidden", backgroundColor: "#E1E8F8" },
  organizingProgressFill: { height: "100%", minWidth: 8, borderRadius: radius.pill, overflow: "hidden", backgroundColor: "#3B82F6" },

  hero: { marginHorizontal: -spacing.lg, marginTop: -spacing.lg, paddingTop: spacing.xl, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, backgroundColor: "#F8FAFF" },
  pageTitle: { color: "#0B1D3A", fontSize: 29, lineHeight: 36, fontWeight: "900", letterSpacing: 0 },
  pageSubtitle: { marginTop: spacing.sm, color: colors.muted, fontSize: 15, lineHeight: 22, fontWeight: "400" },
  introCard: {
    marginTop: -8,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E4EAF3",
    flexDirection: "row",
    gap: spacing.md,
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  introIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF5FF" },
  introImage: { width: 26, height: 26 },
  introCopy: { flex: 1, gap: 6 },
  introTitle: { color: "#0B1D3A", fontSize: 17, fontWeight: "900", lineHeight: 23 },
  introText: { color: "#334155", fontSize: 13, lineHeight: 21, fontWeight: "400" },
  sectionCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5EAF2",
    gap: spacing.md,
    shadowColor: "#1F2937",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sectionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  cardTitle: { flex: 1, color: "#0B1D3A", fontSize: 18, lineHeight: 23, fontWeight: "400" },
  editButton: { minHeight: 36, borderRadius: radius.sm, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: "#DDE3EE", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff" },
  editButtonText: { color: colors.muted, fontSize: 13, fontWeight: "400" },
  fieldList: { gap: spacing.md, marginLeft: 52 },
  infoRow: { gap: spacing.xs, alignItems: "flex-start" },
  infoLabel: { color: colors.muted, fontSize: 14, lineHeight: 22, fontWeight: "400" },
  infoValue: { width: "100%", color: "#0B1D3A", fontSize: 14, lineHeight: 22, fontWeight: "400" },
  aiCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E9E2FF",
    gap: spacing.md,
    shadowColor: "#6D28D9",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  aiIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F0FF" },
  aiImage: { width: 24, height: 24 },
  aiTitleWrap: { flex: 1 },
  aiBased: { color: colors.muted, fontSize: 12, fontWeight: "400" },
  bulletList: { gap: spacing.sm, marginLeft: 54 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#0B1D3A", marginTop: 8 },
  bulletText: { flex: 1, color: "#24324A", fontSize: 13, lineHeight: 20, fontWeight: "400" },
  confirmActionButton: { marginTop: spacing.sm, marginBottom: spacing.lg, borderRadius: 14 },
  editHint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  editActions: { flexDirection: "row", gap: spacing.md },
  editAction: { flex: 1 }
});
