import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, ImageSourcePropType, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ConfirmDialog, Screen } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { ApiError } from "@/services/apiClient";
import { uploadInterview } from "@/services/interviewApi";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const uploadIcon = require("../../img/8-1.png") as ImageSourcePropType;
const textInputFocusStyle = Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : null;

export default function InterviewUpload() {
  const [showExit, setShowExit] = useState(false);
  const [selected, setSelected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobTitle, setJobTitle] = useState("AI产品经理");
  const [company, setCompany] = useState("字节跳动");
  const [jd, setJd] = useState("负责 AI 产品需求分析、方案设计、跨团队协作和项目落地。");
  const [transcript, setTranscript] = useState("面试中主要讲述了一段校园产品项目经历，但个人贡献和结果量化表达不够清晰。");
  const canSubmit = selected || transcript.trim().length > 0;

  // P1-04:真实提交上传,拿到后端生成的 sessionId 并透传给分析页;失败回退 mock-session 保证演示不中断。
  const handleStart = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { sessionId } = await uploadInterview({ jobTitle, company, jd, transcript });
      router.push(`/interview/analyzing?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (err: unknown) {
      const reason = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
      console.warn("[upload] 上传失败,回退 mock-session:", reason);
      router.push("/interview/analyzing?sessionId=mock-session");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Screen
        navTitle="面试复盘与分析"
        close
        onClose={() => setShowExit(true)}
        activeTab="面试"
        footerAboveTab
        footer={<StartButton enabled={canSubmit && !submitting} onPress={handleStart} />}
      >
        <View style={styles.hero}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>上传面试相关资料</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>必填</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>上传面试录音、转录文本或你的面试记录，AI 会结合岗位要求帮你生成复盘报告。</Text>
        </View>

        <UploadPanel selected={selected} onPress={() => setSelected(true)} />

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="groups" size={22} color={colors.accent} />
            </View>
            <Text style={styles.cardTitle}>补充岗位信息</Text>
          </View>
          <IconInput icon="business-center" placeholder="岗位名称" value={jobTitle} onChangeText={setJobTitle} />
          <IconInput icon="apartment" placeholder="公司名称" value={company} onChangeText={setCompany} />
          <IconInput icon="description" placeholder="岗位 JD（可粘贴岗位职责、任职要求等）" value={jd} onChangeText={setJd} multiline countLimit={2000} />
          <IconInput icon="notes" placeholder="面试转写文本 / 面试笔记（没有文件时可直接粘贴）" value={transcript} onChangeText={setTranscript} multiline countLimit={2000} />
          <View style={styles.infoLine}>
            <MaterialIcons name="info-outline" size={18} color={colors.muted} />
            <Text style={styles.infoText}>补充信息将帮助 AI 更精准地结合岗位要求进行分析（非必填）。</Text>
          </View>
        </View>
      </Screen>
      <ConfirmDialog visible={showExit} title="退出本次复盘？" message="当前未提交内容将不会保留。" cancelText="继续填写" confirmText="退出" onCancel={() => setShowExit(false)} onConfirm={() => router.replace("/(tabs)/discover")} />
    </>
  );
}

function UploadPanel({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  return (
    <View style={styles.uploadShell}>
      <Pressable onPress={onPress} style={[styles.uploadDropzone, selected ? styles.uploadDropzoneSelected : null]}>
        <View style={styles.cloudWrap}>
          <View style={styles.cloudSparkOne} />
          <View style={styles.cloudSparkTwo} />
          <Image source={uploadIcon} style={styles.uploadIconImage} resizeMode="contain" />
        </View>
        <Text style={[styles.uploadTitle, selected ? styles.uploadTitleSelected : null]}>{selected ? "已选择 mock_interview_note.txt" : "上传音频或文本"}</Text>
        <Text style={styles.uploadSubtitle}>( 支持 MP3、WAV、M4A、TXT、DOCX、PDF )</Text>
        <View style={styles.fileButton}>
          <MaterialIcons name="folder-open" size={24} color="#fff" />
          <Text style={styles.fileButtonText}>{selected ? "重新选择文件" : "选择文件"}</Text>
        </View>
        <View style={styles.privacyLine}>
          <MaterialIcons name="verified-user" size={17} color="#8B96AA" />
          <Text style={styles.privacyText}>文件仅用于本次复盘分析，严格保密</Text>
        </View>
      </Pressable>
    </View>
  );
}

function IconInput({ icon, placeholder, value, onChangeText, multiline, countLimit }: { icon: IconName; placeholder: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; countLimit?: number }) {
  return (
    <View style={[styles.inputWrap, multiline ? styles.inputWrapMulti : null]}>
      <MaterialIcons name={icon} size={24} color="#778095" />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8B96AA" selectionColor={colors.primary} multiline={multiline} style={[styles.input, textInputFocusStyle, multiline ? styles.inputMulti : null]} />
      {countLimit ? <Text style={styles.countText}>{value.length}/{countLimit}</Text> : null}
    </View>
  );
}

function StartButton({ enabled, onPress }: { enabled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={enabled ? onPress : undefined} style={[styles.startButton, !enabled ? styles.startButtonDisabled : null]}>
      <Text style={[styles.startButtonText, !enabled ? styles.startButtonTextDisabled : null]}>开始生成复盘报告</Text>
      {!enabled ? <Text style={styles.startButtonSubtext}>请先上传面试相关资料（必填）</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  title: {
    color: "#0B1D3A",
    fontSize: 25,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: 0
  },
  requiredBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: "#E2E7F4",
    borderWidth: 1,
    borderColor: "#C6CBEE"
  },
  requiredText: {
    color: "#6061E9",
    fontSize: 12,
    fontWeight: "700"
  },
  subtitle: {
    color: "#59677D",
    fontSize: 13,
    lineHeight: 22,
    fontWeight: "500"
  },
  uploadShell: {
    borderRadius: 28,
    padding: spacing.md,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6ECF5",
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  uploadDropzone: {
    minHeight: 200,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#76A7FF",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: "#F8FBFF"
  },
  uploadDropzoneSelected: {
    borderColor: "#76A7FF",
    backgroundColor: "#F8FBFF"
  },
  cloudWrap: {
    width: 120,
    height: 60,
    alignItems: "center",
    justifyContent: "center"
  },
  uploadIconImage: {
    width: 100,
    height: 100,
    transform: [{ translateY: 9 }]
  },
  cloudSparkOne: {
    position: "absolute",
    left: 14,
    top: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8DB8FF"
  },
  cloudSparkTwo: {
    position: "absolute",
    right: 12,
    top: 26,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#C6DAFF"
  },
  uploadTitle: {
    color: "#0B1D3A",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: -16
  },
  uploadTitleSelected: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700"
  },
  uploadSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 28,
    textAlign: "center",
    fontWeight: "400"
  },
  fileButton: {
    minHeight: 54,
    minWidth: 190,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: "#0B63F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowColor: "#0B63F6",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  fileButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500"
  },
  privacyLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  privacyText: {
    color: "#8B96AA",
    fontSize: 12,
    fontWeight: "500"
  },
  formCard: {
    borderRadius: 24,
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6ECF5",
    gap: spacing.md,
    shadowColor: "#1F2937",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2ECFF"
  },
  cardTitle: {
    color: "#0B1D3A",
    fontSize: 17,
    fontWeight: "600"
  },
  inputWrap: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#DCE3EC",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  inputWrapMulti: {
    minHeight: 88,
    alignItems: "flex-start",
    paddingTop: spacing.md,
    paddingBottom: spacing.md
  },
  input: {
    flex: 1,
    color: "#0B1D3A",
    fontSize: 14,
    fontWeight: "500",
    padding: 0
  },
  inputMulti: {
    minHeight: 58,
    lineHeight: 20,
    textAlignVertical: "top"
  },
  countText: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.sm,
    color: colors.gray,
    fontSize: 12,
    fontWeight: "400"
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  infoText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500"
  },
  startButton: {
    minHeight: 58,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B63F6",
    shadowColor: "#0B63F6",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  startButtonDisabled: {
    backgroundColor: "#C8D0DE",
    shadowOpacity: 0
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
  },
  startButtonTextDisabled: {
    color: "#7F8A9E"
  },
  startButtonSubtext: {
    marginTop: 3,
    color: "#7F8A9E",
    fontSize: 12,
    fontWeight: "700"
  }
});
