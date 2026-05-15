import { MaterialIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { GestureResponderEvent, Image, ImageSourcePropType, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { ExploreProfile } from "@/types/domain";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const questionIcon = require("../../img/3-1.png") as ImageSourcePropType;
const hintIcon = require("../../img/3-2.png") as ImageSourcePropType;

type SummaryItem = {
  icon: IconName;
  label: string;
  value: string | string[] | undefined;
};

export function CollectionHeader({ step, total, title, onSummary }: { step: number; total: number; title: string; onSummary: () => void }) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.progressRow}>  
        <View style={styles.stepTrack}>
          {Array.from({ length: total }).map((_, index) => {
            const active = index < step;
            return (
              <View key={index} style={[styles.progressSegment, active ? styles.progressSegmentActive : null]} />
            );
          })}
        </View>
        <Text style={styles.progressNumber}>{step}/{total}</Text>
        <Pressable onPress={onSummary} style={styles.summaryButton}>
          <MaterialIcons name="manage-accounts" size={18} color={colors.primary} />
          <Text style={styles.summaryButtonText}>画像摘要</Text>
        </Pressable>
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

export function QuestionExplanation({ text }: { text: string }) {
  return (
    <View style={styles.explanationWrap}>
      <Text style={styles.aiBubbleText}>{text}</Text>
    </View>
  );
}

export function AIQuestionCard({ title }: { title: string; helper?: string; selectedSummary?: string[] }) {
  return (
    <View style={styles.chatBlock}>
      <View style={styles.questionCard}>
        <View style={styles.questionTitleRow}>
          <Image source={questionIcon} style={styles.questionIconImage} resizeMode="contain" />
          <Text style={styles.questionTitle}>{title}</Text>
        </View>
      </View>
    </View>
  );
}

export function QuestionPanel({ children }: { children: React.ReactNode }) {
  return <View style={styles.questionPanel}>{children}</View>;
}

export function ModernOptionSelector({ options, selected, onToggle, multi }: { options: readonly string[]; selected: string[]; onToggle: (value: string) => void; multi?: boolean }) {
  return (
    <View style={styles.optionGrid}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable key={option} onPress={() => onToggle(option)} style={[styles.optionChip, active ? styles.optionChipActive : null]}>
            <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{option}</Text>
            {active ? (
              <View style={styles.optionCheck}>
                <MaterialIcons name={multi ? "check" : "radio-button-checked"} size={15} color="#fff" />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ModernTextInput({ required, value, onChangeText, multiline, placeholder }: { required: boolean; value: string; onChangeText: (value: string) => void; multiline?: boolean; placeholder: string }) {
  const baseHeight = multiline ? 96 : 68;
  const maxHeight = 180;
  const maxLength = 500;
  const [inputHeight, setInputHeight] = useState(baseHeight);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(baseHeight);
  const didDragResize = useRef(false);

  const startResize = (event: GestureResponderEvent) => {
    dragStartY.current = event.nativeEvent.pageY;
    dragStartHeight.current = inputHeight;
    didDragResize.current = false;
  };

  const resize = (event: GestureResponderEvent) => {
    const delta = event.nativeEvent.pageY - dragStartY.current;
    if (Math.abs(delta) > 2) didDragResize.current = true;
    const nextHeight = Math.min(maxHeight, Math.max(baseHeight, dragStartHeight.current + delta));
    setInputHeight(nextHeight);
  };

  const finishResize = () => {
    if (didDragResize.current) return;
    setInputHeight((height) => (height >= maxHeight - 1 ? baseHeight : maxHeight));
  };

  return (
    <View style={styles.inputCard}>
      <View style={styles.inputHeader}>
        <Text style={styles.inputLabel}>{required ? "其他说明（必填）" : "补充说明（选填）"}</Text>
        <Text style={[styles.inputCount, value.length >= maxLength ? styles.inputCountWarn : null]}>{value.length}/{maxLength}</Text>
      </View>
      <View style={styles.inputResizeWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={maxLength}
          placeholder={placeholder}
          placeholderTextColor="#9AA4B5"
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          style={[styles.input, styles.inputMulti, { height: inputHeight }, { outlineStyle: "none" } as never]}
        />
        <View
          style={styles.resizeHandle}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={startResize}
          onResponderMove={resize}
          onResponderRelease={finishResize}
        >
          <MaterialIcons name="drag-handle" size={16} color="#7B8AA3" />
        </View>
      </View>
    </View>
  );
}

export function NextHint({ text }: { text: string }) {
  return (
    <View style={styles.nextHint}>
      <Image source={hintIcon} style={styles.hintImage} resizeMode="contain" />
      <Text style={styles.hintText}>{text}</Text>
      <MaterialIcons name="chevron-right" size={24} color="#9AA4B5" />
    </View>
  );
}

export function SummarySheet({ visible, onClose, profile, mode }: { visible: boolean; onClose: () => void; profile: ExploreProfile; mode: "basic" | "experience" }) {
  const basicItems: SummaryItem[] = [
    { icon: "school", label: "当前阶段", value: profile.stage },
    { icon: "menu-book", label: "学历状态", value: profile.education },
    { icon: "work", label: "所学专业", value: profile.major },
    { icon: "favorite-border", label: "兴趣偏好", value: profile.interests },
    { icon: "stars", label: "工作偏好", value: profile.workPreferences },
    { icon: "my-location", label: "探索目标", value: profile.goal || "待补充" },
    { icon: "lock-outline", label: "现实约束", value: profile.constraints || "待补充" }
  ];

  const experienceItems: SummaryItem[] = [
    { icon: "school", label: "当前阶段", value: profile.stage },
    { icon: "favorite-border", label: "兴趣偏好", value: profile.interests },
    { icon: "stars", label: "工作偏好", value: profile.workPreferences },
    { icon: "inventory", label: "经历类型", value: profile.experiences },
    { icon: "hub", label: "做过的事情", value: profile.workTypes },
    { icon: "flag", label: "偏好工作状态", value: profile.preferredStates }
  ];

  return (
    <BottomSheet visible={visible} title="你的当前画像摘要" onClose={onClose}>
      <View style={styles.summaryList}>
        {(mode === "basic" ? basicItems : experienceItems).map((item) => (
          <SummaryRow key={item.label} item={item} />
        ))}
      </View>
      <View style={styles.closeHint}>
        <MaterialIcons name="unfold-more" size={18} color={colors.gray} />
        <Text style={styles.closeHintText}>下滑或点击关闭</Text>
      </View>
    </BottomSheet>
  );
}

function SummaryRow({ item }: { item: SummaryItem }) {
  const value = Array.isArray(item.value) ? item.value.filter(Boolean).join("、") : item.value || "待补充";
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryLabel}>
        <View style={styles.summaryIcon}>
          <MaterialIcons name={item.icon} size={20} color={colors.primary} />
        </View>
        <Text style={styles.summaryLabelText}>{item.label}</Text>
      </View>
      <Text style={styles.summaryValue}>{value || "待补充"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: { gap: spacing.xs },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  progressNumber: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  stepTrack: { flex: 1, flexDirection: "row", alignItems: "center", gap: 2 },
  progressSegment: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: "#DDE3EC" },
  progressSegmentActive: { backgroundColor: "#1062F7" },
  summaryButton: { minHeight: 20, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: "#c7c9d1", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.72)" },
  summaryButtonText: { color: "#000000", fontSize: 12, fontWeight: "400" },
  headerTitle: { color: "#0B1D3A", fontSize: 14, fontWeight: "700" ,marginTop: spacing.sm},
  questionPanel: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    width: "100%",
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#1F2937",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  chatBlock: { gap: spacing.md },
  explanationWrap: {
    width: "100%",
    alignSelf: "stretch",
    marginTop: 10,         // 往下移
    marginBottom: 2,     // 和下面问题面板的距离
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#1F2937",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  aiRow: { flexDirection: "row", alignItems: "flex-start" },
  aiBubble: { flex: 1, borderRadius: radius.lg, padding: spacing.md, backgroundColor: "#fff", borderWidth: 1, borderColor: "#EEF2F7", shadowColor: "#1F2937", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  aiBubbleText: { color: "#334155", fontSize: 14, lineHeight: 22, fontWeight: "400" },
  questionCard: { paddingVertical: 10,width: "100%",minHeight: 40,  borderRadius: radius.xl, padding: spacing.lg, backgroundColor: "#fff", borderWidth: 1, borderColor: "#EEF2F7", shadowColor: "#1F2937", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  questionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  questionIconImage: { width: 30, height: 30 },
  questionTitle: { flex: 1, color: "#0B1D3A", fontSize: 15, lineHeight: 28, fontWeight: "700" },
  optionGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "flex-start" },
  optionChip: { minHeight: 44, maxWidth: "100%", borderRadius: radius.pill, paddingLeft: spacing.lg, paddingRight: spacing.lg, paddingVertical: spacing.sm, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm, backgroundColor: "#fff", borderWidth: 1, borderColor: "#DCE3EC", shadowColor: "#0F172A", shadowOpacity: 0.025, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  optionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  optionText: { color: "#26354D", fontSize: 14, lineHeight: 20, fontWeight: "400", textAlign: "center" },
  optionTextActive: { color: "#fff", fontWeight: "400" },
  optionCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  inputCard: { width: "100%", alignSelf: "stretch", borderRadius: radius.lg, backgroundColor: "#fff", borderWidth: 1, borderColor: "#DCE3EC", padding: spacing.md, gap: spacing.sm },
  inputHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inputLabel: { color: "#1F2A37", fontSize: 14, fontWeight: "400" },
  inputCount: { color: colors.gray, fontSize: 12, fontWeight: "400" },
  inputCountWarn: { color: colors.warning },
  inputResizeWrap: { position: "relative", width: "100%" },
  input: { width: "100%", minHeight: 10, color: colors.text, fontSize: 15, lineHeight: 22, padding: 0, paddingRight: 32, paddingBottom: 24 },
  inputMulti: { textAlignVertical: "top" },
  resizeHandle: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF3FB",
    borderWidth: 1,
    borderColor: "#D8E1EE"
  },
  nextHint: { minHeight: 60,  width: "100%", alignSelf: "stretch", borderRadius: radius.lg, padding: 0, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#F3F0FF", borderWidth: 0, borderColor: "#E6DFFF" },
  hintImage: { width: 40, height: 40 },
  hintText: { flex: 1, color: "#536179", fontSize: 13, lineHeight: 20, fontWeight: "400" },
  summaryList: { gap: spacing.sm },
  summaryRow: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: "#E5EAF2", backgroundColor: "#fff", flexDirection: "row", overflow: "hidden" },
  summaryLabel: { width: 126, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#F7F9FD" },
  summaryIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF5FF" },
  summaryLabelText: { flex: 1, color: colors.muted, fontSize: 13, fontWeight: "400" },
  summaryValue: { flex: 1, paddingHorizontal: spacing.md, alignSelf: "center", color: "#0B1D3A", fontSize: 14, lineHeight: 20, fontWeight: "400" },
  closeHint: { marginTop: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  closeHintText: { color: colors.gray, fontSize: 13, fontWeight: "400" }
});
