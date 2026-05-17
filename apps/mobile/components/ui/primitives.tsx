import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { ReactNode, useMemo } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";
import { colors, radius, spacing } from "@/constants/theme";
import { TaskStatus } from "@/types/domain";

type ScreenProps = {
  title?: string;
  subtitle?: string;
  navTitle?: string;
  activeTab?: "发现" | "路径" | "面试" | "我的";
  backTo?: string;
  close?: boolean;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  footerAboveTab?: boolean;
  footerTransparent?: boolean;
};

export function Screen({ title, subtitle, navTitle, activeTab, backTo, close, onClose, children, footer, footerAboveTab, footerTransparent }: ScreenProps) {
  const hasBottomArea = footer || activeTab;
  const floatingFooter = footer && footerTransparent;
  return (
    <View style={[styles.root, Platform.OS === "web" ? styles.webPhoneRoot : null]}>
      <TopNav title={navTitle ?? title ?? "AI职场导师"} backTo={backTo} close={close} onClose={onClose} />
      <ScrollView
        style={[styles.scroll, floatingFooter ? styles.scrollWithFloatingFooter : null, floatingFooter && footerAboveTab ? styles.scrollWithFloatingFooterAboveTab : null]}
        contentContainerStyle={[
          styles.content,
          hasBottomArea ? styles.contentWithFooter : null,
          footer && activeTab ? styles.contentWithFooterAndTab : null,
          floatingFooter ? styles.contentWithFloatingFooter : null
        ]}
      >
        {title ? <Text style={styles.pageTitle}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, footerAboveTab ? styles.footerAboveTab : null, footerTransparent ? styles.footerTransparent : null]}>{footer}</View> : null}
      {activeTab ? <BottomTab active={activeTab} /> : null}
    </View>
  );
}

function BottomTab({ active }: { active: NonNullable<ScreenProps["activeTab"]> }) {
  const tabs = [
    { label: "发现", icon: "explore", href: "/(tabs)/discover" },
    { label: "路径", icon: "route", href: "/(tabs)/path" },
    { label: "面试", icon: "work", href: "/(tabs)/interview" },
    { label: "我的", icon: "person", href: "/(tabs)/me" }
  ] as const;

  return (
    <View style={styles.bottomTab}>
      {tabs.map((tab) => {
        const isActive = tab.label === active;
        return (
          <Pressable key={tab.label} onPress={() => router.replace(tab.href as never)} style={styles.bottomTabItem}>
            <MaterialIcons name={tab.icon} size={24} color={isActive ? colors.primary : colors.gray} />
            <Text style={[styles.bottomTabText, isActive ? styles.bottomTabTextActive : null]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TopNav({ title, backTo, close, onClose }: { title: string; backTo?: string; close?: boolean; onClose?: () => void }) {
  const goBack = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (backTo) {
      router.replace(backTo as never);
      return;
    }
    router.back();
  };

  return (
    <View style={styles.nav}>
      {backTo || close || onClose ? (
        <Pressable onPress={goBack} style={styles.navButton}>
          {close ? <Text style={styles.navCloseText}>关闭</Text> : <MaterialIcons name="chevron-left" size={24} color="#fff" />}
        </Pressable>
      ) : (
        <View style={styles.navButton} />
      )}
      <Text style={styles.navTitle}>{title}</Text>
      <View style={styles.navButton} />
    </View>
  );
}

export function Card({ children, accent, style }: { children: ReactNode; accent?: boolean; style?: object }) {
  return <View style={[styles.card, accent ? styles.cardAccent : null, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppButton({
  title,
  onPress,
  variant = "primary",
  disabled,
  style
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[styles.button, styles[`button_${variant}`], disabled ? styles.buttonDisabled : null, style]}>
      <Text style={[styles.buttonText, variant !== "primary" ? styles.buttonTextSecondary : null, disabled ? styles.buttonTextDisabled : null]}>{title}</Text>
    </Pressable>
  );
}

export function SmallActionButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.smallAction}>
      <Text style={styles.smallActionText}>{title}</Text>
    </Pressable>
  );
}

export function StatusTag({ label }: { label: string }) {
  const tagStyle =
    label === "未开始"
      ? { backgroundColor: "#F7F9FC", borderColor: "#E3E8F1", color: "#8A96A8" }
      : label === "进行中"
        ? { backgroundColor: "#EDF4FF", borderColor: "#A9C8FF", color: "#2F6BFF" }
        : label === "已完成"
          ? { backgroundColor: "#ECFBF1", borderColor: "#A8E0BC", color: "#22A45A" }
          : label === "低"
      ? { backgroundColor: "#EEF1F6", borderColor: "transparent", borderWidth: 0, color: colors.warning }
      : label === "中"
        ? { backgroundColor: "#FFF2D9", borderColor: "transparent", borderWidth: 0, color: colors.warning }
        : label === "高"
          ? { backgroundColor: "#E7F8EC", borderColor: "transparent", borderWidth: 0, color: colors.warning }
      : label === "较高"
        ? { backgroundColor: "#EEF4FF", borderColor: "#AFC7FF", color: "#4D82FF" }
        : label === "可尝试"
          ? { backgroundColor: "#FFF2E6", borderColor: "#FFC58F", color: "#FF9A38" }
          : null;
  const color = label.includes("高") || label === "已完成" || label === "较强" ? colors.success : label === "进行中" || label === "中" || label === "一般" ? colors.primary : label.includes("弱") || label.includes("风险") ? colors.warning : colors.gray;
  return (
    <View style={[styles.tag, tagStyle ? { backgroundColor: tagStyle.backgroundColor, borderColor: tagStyle.borderColor, borderWidth: tagStyle.borderWidth ?? 1 } : { backgroundColor: `${color}18`, borderColor: `${color}55` }]}>
      <Text style={[styles.tagText, { color: tagStyle?.color ?? color }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressFill, { width: `${Math.min(100, (value / total) * 100)}%` }]} />
    </View>
  );
}

export function TagSelector({ options, selected, onToggle, multi = true }: { options: string[]; selected: string[]; onToggle: (value: string) => void; multi?: boolean }) {
  return (
    <View style={styles.tags}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Pressable key={option} onPress={() => onToggle(option)} style={[styles.option, isSelected ? styles.optionSelected : null]}>
            <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TextField({ label, value, onChangeText, multiline, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; placeholder?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} multiline={multiline} style={[styles.input, multiline ? styles.inputMulti : null]} placeholderTextColor={colors.gray} />
    </View>
  );
}

export function SegmentedTabs({ items, value, onChange }: { items: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.segment}>
      {items.map((item) => (
        <Pressable key={item} onPress={() => onChange(item)} style={[styles.segmentItem, item === value ? styles.segmentItemActive : null]}>
          <Text style={[styles.segmentText, item === value ? styles.segmentTextActive : null]}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function BottomSheet({ visible, title, children, onClose }: { visible: boolean; title: string; children: ReactNode; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalFrame, Platform.OS === "web" ? styles.webModalFrame : null]}>
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <SectionHeader title={title} action="关闭" onAction={onClose} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function ConfirmDialog({ visible, title, message, confirmText, cancelText, onConfirm, onCancel }: { visible: boolean; title: string; message: string; confirmText: string; cancelText: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.dialogFrame, Platform.OS === "web" ? styles.webModalFrame : null]}>
        <View style={styles.dialogOverlay}>
          <Card style={styles.dialog}>
            <Text style={styles.dialogTitle}>{title}</Text>
            <Text style={styles.dialogText}>{message}</Text>
            <View style={styles.dialogActions}>
              <View style={styles.dialogActionButton}>
                <AppButton title={cancelText} variant="secondary" onPress={onCancel} />
              </View>
              <View style={styles.dialogActionButton}>
                <AppButton title={confirmText} onPress={onConfirm} />
              </View>
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

export function TaskCard({ title, description, status, onNext }: { title: string; description?: string; status: TaskStatus; onNext?: () => void }) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={styles.itemTitle}>{title}</Text>
        <StatusTag label={status} />
      </View>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
      {status !== "已完成" && onNext ? <AppButton title={status === "未开始" ? "去完成" : "继续完成"} variant="secondary" onPress={onNext} /> : null}
    </Card>
  );
}

export function UploadCard({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card accent>
        <View style={styles.uploadIcon}>
          <MaterialIcons name={selected ? "check-circle" : "cloud-upload"} size={32} color={colors.primary} />
        </View>
        <Text style={styles.itemTitle}>{selected ? "已选择 mock_interview_note.txt" : "上传音频或文本"}</Text>
        <Text style={styles.muted}>支持 MP3、WAV、M4A、TXT、DOCX、PDF</Text>
        <AppButton title={selected ? "重新选择" : "选择文件"} variant="secondary" onPress={onPress} />
      </Card>
    </Pressable>
  );
}

export function AbilityRadarChart({ values = [78, 72, 70, 64, 68] }: { values?: number[] }) {
  const points = useMemo(() => {
    const center = 70;
    const max = 55;
    return values
      .map((value, index) => {
        const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
        const scale = value / 100;
        return `${center + Math.cos(angle) * max * scale},${center + Math.sin(angle) * max * scale}`;
      })
      .join(" ");
  }, [values]);
  const axes = [0, 1, 2, 3, 4].map((index) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    return <Line key={index} x1="70" y1="70" x2={70 + Math.cos(angle) * 55} y2={70 + Math.sin(angle) * 55} stroke={colors.border} />;
  });
  return (
    <Svg width={150} height={150} viewBox="0 0 140 140">
      <Circle cx="70" cy="70" r="55" stroke={colors.border} fill="none" />
      <Circle cx="70" cy="70" r="36" stroke={colors.border} fill="none" />
      <Circle cx="70" cy="70" r="18" stroke={colors.border} fill="none" />
      {axes}
      <Polygon points={points} fill={`${colors.primary}35`} stroke={colors.primary} strokeWidth="2" />
    </Svg>
  );
}

export function KeyValue({ label, value }: { label: string; value: string | string[] }) {
  return (
    <View style={styles.keyValue}>
      <Text style={styles.key}>{label}</Text>
      <Text style={styles.value}>{Array.isArray(value) ? value.join("、") : value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  webPhoneRoot: {
    width: "100%",
    maxWidth: 390,
    alignSelf: "center",
    minHeight: "100%",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    shadowColor: "#111827",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 }
  },
  nav: { height: 72, paddingTop: 22, paddingHorizontal: spacing.md, backgroundColor: colors.nav, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navButton: { width: 56, height: 42, alignItems: "center", justifyContent: "center" },
  navCloseText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  navTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollWithFloatingFooter: { marginBottom: 128 },
  scrollWithFloatingFooterAboveTab: { marginBottom: 200 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  contentWithFooter: { paddingBottom: 110 },
  contentWithFooterAndTab: { paddingBottom: 190 },
  contentWithFloatingFooter: { paddingBottom: 5 },
  pageTitle: { color: colors.text, fontSize: 24, fontWeight: "800", lineHeight: 32 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: "rgba(247,248,250,0.96)" },
  footerTransparent: { paddingTop: 0, paddingBottom: spacing.md, backgroundColor: "transparent" },
  footerAboveTab: { bottom: 72 },
  bottomTab: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 72, paddingTop: 8, paddingBottom: 10, paddingHorizontal: 12, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border, flexDirection: "row" },
  bottomTabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  bottomTabText: { color: colors.gray, fontSize: 12, fontWeight: "700" },
  bottomTabTextActive: { color: colors.primary },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: "#111827", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  cardAccent: { borderColor: "#BFDBFE", backgroundColor: "#F8FBFF" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sectionAction: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  button: { minHeight: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: "#BFDBFE" },
  button_ghost: { backgroundColor: "transparent" },
  buttonDisabled: { backgroundColor: "#E5E7EB", borderColor: "#E5E7EB" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  buttonTextSecondary: { color: colors.primary },
  buttonTextDisabled: { color: colors.gray },
  smallAction: { minHeight: 34, borderRadius: radius.pill, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border },
  smallActionText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  tag: { minWidth: 52, height: 24, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 0, borderWidth: 1, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  tagText: { fontSize: 12, lineHeight: 24, fontWeight: "700", textAlignVertical: "center" },
  progressWrap: { height: 8, borderRadius: radius.pill, backgroundColor: "#E5E7EB", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: colors.border },
  optionSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  optionText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  optionTextSelected: { color: colors.primary },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, color: colors.text, fontWeight: "700" },
  input: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", paddingHorizontal: spacing.md, color: colors.text },
  inputMulti: { minHeight: 92, paddingTop: spacing.md, textAlignVertical: "top" },
  segment: { flexDirection: "row", backgroundColor: "#EEF2F7", padding: 4, borderRadius: radius.pill, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.pill },
  segmentItemActive: { backgroundColor: "#0766FD" },
  segmentText: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  segmentTextActive: { color: "#FFFFFF" },
  modalFrame: { flex: 1, width: "100%", position: "relative" },
  webModalFrame: { maxWidth: 430, alignSelf: "center" },
  modalOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(17,24,39,0.28)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "72%", padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, gap: spacing.md },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: radius.pill, backgroundColor: "#D1D5DB" },
  dialogFrame: { flex: 1, width: "100%", alignSelf: "center" },
  dialogOverlay: { flex: 1, backgroundColor: "rgba(17,24,39,0.35)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  dialog: { width: "86%", alignSelf: "center", padding: 0, overflow: "hidden", gap: 0 },
  dialogTitle: { fontSize: 20, fontWeight: "900", color: colors.text, textAlign: "center", paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  dialogText: { fontSize: 14, color: colors.muted, lineHeight: 21, textAlign: "center", paddingTop: spacing.sm, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  dialogActions: { flexDirection: "row", gap: spacing.md, borderTopWidth: 1, borderColor: colors.border, padding: spacing.md },
  dialogActionButton: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, alignItems: "center" },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  uploadIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  keyValue: { gap: 3 },
  key: { color: colors.muted, fontSize: 12 },
  value: { color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 21 }
});

export const uiStyles = styles;
