import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, ImageSourcePropType, LayoutChangeEvent, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ConfirmDialog, Screen } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { ApiError } from "@/services/apiClient";
import { generateFollowup } from "@/services/exploreApi";
import { useAppStore } from "@/store/useAppStore";
import { ExploreProfile } from "@/types/domain";

const minInputHeight = 34;
const maxInputHeight = 132;
const studyIconImage = require("../../img/5-1.png") as ImageSourcePropType;
const progressGradientStyle =
  Platform.OS === "web"
    ? ({
        backgroundImage: "linear-gradient(90deg, #EEF3FF 0%, #CFE0FF 18%, #71A7FF 45%, #3B82F6 72%, #A884FF 100%)"
      } as never)
    : null;

const listText = (value: string | string[]) => (Array.isArray(value) ? value.filter(Boolean).join("、") : value || "未填写");

const estimateInputHeight = (text: string) => {
  const visualLines = text.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 18)), 0);
  return Math.min(maxInputHeight, Math.max(minInputHeight, visualLines * 22 + 12));
};

const buildFollowupPrompt = (profile: ExploreProfile) => `
你是一名温和、敏锐的 AI 职业探索教练。请先学习用户已经填写的画像信息，再只提出必要的动态追问。

已知画像：
- 当前阶段：${profile.stage || "未填写"}
- 学历状态：${profile.education || "未填写"}
- 专业背景：${profile.major || "未填写"}
- 兴趣偏好：${listText(profile.interests)}
- 工作偏好：${listText(profile.workPreferences)}
- 探索目标：${profile.goal || "未填写"}
- 现实约束：${listText(profile.constraints)}
- 经历类型：${listText(profile.experiences)}
- 做过的事情：${listText(profile.workTypes)}
- 偏好工作状态：${listText(profile.preferredStates)}

追问要求：
1. 不重复询问已经明确的信息。
2. 优先追问能帮助判断职业方向的证据，例如成就感来源、可迁移能力、现实约束边界。
3. 每次只问一个问题，语气像自然对话，不要像表格问卷。
4. 问题不超过 40 个中文字符。
5. 如果信息已经足够，请直接返回“不需要继续追问”。
`.trim();

const createProfileAwareQuestions = (profile: ExploreProfile) => {
  const questions: { id: string; question: string }[] = [];
  const workTypes = profile.workTypes.filter(Boolean);
  const experiences = profile.experiences.filter(Boolean);
  const preferredStates = profile.preferredStates.filter(Boolean);
  const constraints = profile.constraints.filter(Boolean);

  if (workTypes.length > 0) {
    questions.push({
      id: "work-proof",
      question: `你前面提到${workTypes.slice(0, 3).join("、")}，其中哪一类最让你有成就感？`
    });
  }

  if (experiences.length > 0) {
    questions.push({
      id: "experience-detail",
      question: `在${experiences.slice(0, 2).join("、")}里，有没有一个你最想展开讲的具体经历？`
    });
  }

  if (preferredStates.length > 0) {
    questions.push({
      id: "state-preference",
      question: `你更偏好的${preferredStates.slice(0, 2).join("、")}，通常出现在哪类任务里？`
    });
  }

  if (constraints.length > 0 && !constraints.includes("暂无特别限制")) {
    questions.push({
      id: "constraint-boundary",
      question: `关于${constraints.slice(0, 2).join("、")}，你最不能妥协的边界是什么？`
    });
  }

  if (profile.goal) {
    questions.push({
      id: "goal-priority",
      question: `围绕“${profile.goal}”，你最希望我优先帮你判断哪一点？`
    });
  }

  return questions.slice(0, 3);
};

function ProfileStudyCard({ ready, progress }: { ready: boolean; progress: Animated.Value }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progressWidth = trackWidth
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [8, trackWidth]
      })
    : 8;
  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.studyCard}>
      <View style={styles.studyHeader}>
        <View style={styles.studyIcon}>
          <Image source={studyIconImage} style={styles.studyIconImage} resizeMode="contain" />
        </View>
        <View style={styles.studyCopy}>
          <Text style={styles.studyTitle}>{ready ? "已经完成学习你的画像" : "正在学习你的画像"}</Text>
          <Text style={styles.studyText}>{ready ? "我会根据画像判断是否需要继续追问。" : "正在整理你的基础信息、经历偏好和现实约束。"}</Text>
        </View>
      </View>
      <View style={styles.studyTrack} onLayout={handleTrackLayout}>
        <Animated.View style={[styles.studyProgressFill, progressGradientStyle, { width: progressWidth }]} />
      </View>
    </View>
  );
}

function ThinkingStatus({ ready, hasQuestions }: { ready: boolean; hasQuestions: boolean }) {
  const dotAnimations = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    if (ready && hasQuestions) return;

    const loops = dotAnimations.map((animation, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(animation, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 420,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.delay((2 - index) * 160)
        ])
      )
    );

    Animated.parallel(loops).start();
    return () => loops.forEach((loop) => loop.stop());
  }, [dotAnimations, hasQuestions, ready]);

  if (ready && hasQuestions) return null;

  const animatedDotStyle = (animation: Animated.Value) => ({
    opacity: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 1]
    }),
    transform: [
          {
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -2]
            })
          },
          {
            scale: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.94, 1.08]
            })
          }
    ]
  });

  return (
    <View style={styles.thinkingRow}>
      <Animated.View style={[styles.thinkingDot, styles.thinkingDotStrong, animatedDotStyle(dotAnimations[0])]} />
      <Animated.View style={[styles.thinkingDot, styles.thinkingDotMid, animatedDotStyle(dotAnimations[1])]} />
      <Animated.View style={[styles.thinkingDot, styles.thinkingDotLight, animatedDotStyle(dotAnimations[2])]} />
      <Text style={styles.thinkingText}>
        {ready ? "当前信息已经足够，我会直接进入信息确认页，帮你整理职业画像。" : "正在生成个性化追问..."}
      </Text>
    </View>
  );
}

function ChatMessage({ from, children }: { from: "ai" | "user"; children: React.ReactNode }) {
  const isUser = from === "user";
  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : null]}>
      <View style={[styles.messageBody, isUser ? styles.userBubble : styles.aiMessage]}>{children}</View>
    </View>
  );
}

export default function Followup() {
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [inputHeight, setInputHeight] = useState(minInputHeight);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [completingFollowup, setCompletingFollowup] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const recognitionRef = useRef<any>(null);
  const studyProgress = useRef(new Animated.Value(0.03)).current;
  const { profile, addFollowup } = useAppStore();
  const initialFollowupCount = useRef(profile.followups.length).current;

  const followupPrompt = useMemo(() => buildFollowupPrompt(profile), [profile]);

  const generatedQuestions = useMemo(() => {
    const missingSignals = [
      profile.workTypes.length < 2,
      profile.preferredStates.length < 2,
      profile.experiences.length === 0,
      profile.goal.includes("其他") || profile.constraints.includes("其他")
    ].filter(Boolean).length;

    if (initialFollowupCount >= 3) return [];
    const count = missingSignals > 0 ? Math.min(3, missingSignals + 1) : 2;
    return createProfileAwareQuestions(profile).slice(0, count);
  }, [followupPrompt, initialFollowupCount, profile]);

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    studyProgress.setValue(0.03);
    const animation = Animated.sequence([
      Animated.timing(studyProgress, { toValue: 0.28, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(studyProgress, { toValue: 0.58, duration: 950, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(studyProgress, { toValue: 0.82, duration: 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(studyProgress, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: false })
    ]);
    animation.start(({ finished }) => {
      if (!finished) return;
      setReady(true);
      // 探索链路做实:学习动画结束即把画像提交后端落库(核心收益:后续结果基于落库画像)。
      // 问题文案仍用客户端 generatedQuestions 作离线来源(后端当前为通用 mock);失败 console.warn 不中断。
      generateFollowup(useAppStore.getState().profile).catch((err: unknown) => {
        const reason = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
        console.warn("[followup] 提交画像/取追问失败,沿用本地追问:", reason);
      });
      if (generatedQuestions.length === 0 && !completingFollowup) {
        redirectTimer = setTimeout(() => {
          router.replace({ pathname: "/explore/confirm", params: { skipOrganizing: "1" } });
        }, 1600);
      }
    });
    return () => {
      animation.stop();
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [completingFollowup, generatedQuestions.length, studyProgress]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const stopVoiceInput = () => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const toggleVoiceInput = () => {
    if (!ready || generatedQuestions.length === 0) return;

    if (isListening) {
      stopVoiceInput();
      setVoiceStatus("语音输入已结束，你可以继续编辑回答。");
      return;
    }

    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("当前环境暂不支持语音识别，请使用键盘输入。");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "zh-CN";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus("正在听，你可以直接说出回答。");
      };
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i += 1) {
          transcript += event.results[i][0]?.transcript ?? "";
        }
        setAnswer(transcript.trimStart());
        setInputHeight(estimateInputHeight(transcript));
      };
      recognition.onerror = () => {
        setIsListening(false);
        setVoiceStatus("没有识别到清晰语音，可以再试一次或直接输入。");
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceStatus("语音识别启动失败，请使用键盘输入。");
    }
  };

  const send = () => {
    const trimmed = answer.trim();
    if (!ready || !trimmed || generatedQuestions.length === 0) return;
    stopVoiceInput();
    const isLastQuestion = index >= generatedQuestions.length - 1;
    if (isLastQuestion) {
      setCompletingFollowup(true);
    }
    addFollowup(trimmed);
    setAnswers((current) => [...current, trimmed]);
    setAnswer("");
    setInputHeight(minInputHeight);
    setInputExpanded(false);
    setVoiceStatus("");
    if (!isLastQuestion) {
      setIndex(index + 1);
    } else {
      router.replace({ pathname: "/explore/confirm", params: { skipOrganizing: "0", fromFollowup: "1", t: String(Date.now()) } });
    }
  };

  const canSend = ready && generatedQuestions.length > 0 && answer.trim().length > 0;
  const showStudyCard = !completingFollowup && (!ready || generatedQuestions.length === 0);

  return (
    <>
      <Screen
        navTitle="发现"
        close
        onClose={() => setShowExit(true)}
        footer={
          <View style={styles.footerWrap}>
            <View style={styles.inputBar}>
              <Pressable onPress={toggleVoiceInput} style={[styles.voiceButton, isListening ? styles.voiceButtonActive : null]}>
                <MaterialIcons name={isListening ? "graphic-eq" : "mic-none"} size={19} color={isListening ? "#fff" : colors.muted} />
              </Pressable>
              <TextInput
                value={answer}
                onChangeText={(value) => {
                  setAnswer(value);
                  setInputHeight(estimateInputHeight(value));
                }}
                editable={ready && generatedQuestions.length > 0}
                multiline
                onContentSizeChange={(event) => setInputHeight(Math.min(maxInputHeight, Math.max(minInputHeight, event.nativeEvent.contentSize.height)))}
                placeholder={ready && generatedQuestions.length > 0 ? "输入回答，也可以语音补充" : "AI 正在判断是否需要追问"}
                placeholderTextColor={colors.gray}
                cursorColor={colors.primary}
                selectionColor={colors.primary}
                textAlignVertical="top"
                style={[styles.chatInput, { height: inputHeight }, { outlineStyle: "none" } as never]}
              />
              <Pressable onPress={send} style={[styles.sendButton, canSend ? styles.sendButtonActive : styles.sendButtonDisabled]}>
                <MaterialIcons name="arrow-upward" size={20} color="#fff" />
              </Pressable>
              <Pressable onPress={() => setInputExpanded(true)} style={styles.expandButton}>
                <MaterialIcons name="open-in-full" size={16} color={colors.gray} />
              </Pressable>
            </View>
            {voiceStatus ? <Text style={styles.voiceStatus}>{voiceStatus}</Text> : null}
          </View>
        }
      >
        <Text style={styles.pageTitle}>动态深入了解</Text>
        <Text style={styles.pageSubtitle}>我会根据你前面的回答，判断是否需要补充追问。</Text>
        {showStudyCard ? <ProfileStudyCard ready={ready} progress={studyProgress} /> : null}

        {!completingFollowup ? <ThinkingStatus ready={ready} hasQuestions={generatedQuestions.length > 0} /> : null}

        {ready && generatedQuestions.length > 0 && !completingFollowup ? (
          <>
            {generatedQuestions.slice(0, index + 1).map((question, questionIndex) => (
              <View key={question.id} style={styles.thread}>
                <ChatMessage from="ai">
                  <Text style={styles.bubbleMeta}>补充问题 {questionIndex + 1}/{generatedQuestions.length}</Text>
                  <Text style={styles.bubbleTitle}>{question.question}</Text>
                </ChatMessage>
                {answers[questionIndex] ? (
                  <ChatMessage from="user">
                    <Text style={[styles.bubbleText, styles.userBubbleText]}>{answers[questionIndex]}</Text>
                  </ChatMessage>
                ) : null}
              </View>
            ))}
          </>
        ) : null}
      </Screen>
      <Modal visible={inputExpanded} transparent animationType="fade" onRequestClose={() => setInputExpanded(false)}>
        <View style={styles.expandedOverlay}>
          <View style={styles.expandedEditor}>
            <Pressable onPress={() => setInputExpanded(false)} style={styles.collapseButton}>
              <MaterialIcons name="close-fullscreen" size={22} color={colors.gray} />
            </Pressable>
            <TextInput
              value={answer}
              onChangeText={(value) => {
                setAnswer(value);
                setInputHeight(estimateInputHeight(value));
              }}
              editable={ready && generatedQuestions.length > 0}
              multiline
              autoFocus
              placeholder={ready && generatedQuestions.length > 0 ? "输入你的回答，也可以补充更多经历细节" : "AI 正在判断是否需要追问"}
              placeholderTextColor={colors.gray}
              cursorColor={colors.primary}
              selectionColor={colors.primary}
              textAlignVertical="top"
              style={[styles.expandedInput, { outlineStyle: "none" } as never]}
            />
            <Pressable onPress={send} style={[styles.expandedSendButton, canSend ? styles.sendButtonActive : styles.sendButtonDisabled]}>
              <MaterialIcons name="arrow-upward" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
      <ConfirmDialog visible={showExit} title="退出本次探索？" message="当前未确认内容将不会保留，退出后需要重新开始。" cancelText="继续探索" confirmText="退出" onCancel={() => setShowExit(false)} onConfirm={() => router.replace("/explore/intro")} />
    </>
  );
}

const styles = StyleSheet.create({
  pageTitle: { color: colors.text, fontSize: 24, fontWeight: "700", lineHeight: 32 },
  pageSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  messageRow: { width: "100%", flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
  messageRowUser: { justifyContent: "flex-end" },
  messageBody: { maxWidth: "100%", gap: spacing.xs },
  aiMessage: { width: "100%", padding: spacing.lg, borderRadius: radius.xl, backgroundColor: "#F4F5F7", borderWidth: 1, borderColor: "#EEF0F4" },
  userBubble: { maxWidth: "86%", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 22, backgroundColor: "#0EA5FF" },
  bubbleMeta: { color: colors.muted, fontSize: 12, fontWeight: "400" },
  bubbleTitle: { color: colors.text, fontSize: 16, fontWeight: "400", lineHeight: 24 },
  bubbleText: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  userBubbleText: { color: "#fff" },
  thread: { gap: spacing.xs },
  studyCard: { marginTop: spacing.lg, marginHorizontal: -spacing.xs, minHeight: 156, borderRadius: radius.xl, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.lg, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6ECF5", shadowColor: "#1F2937", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  studyHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  studyIcon: { width: 68, height: 68, alignItems: "center", justifyContent: "center" },
  studyIconImage: { width: 68, height: 68 },
  studyCopy: { flex: 1, gap: spacing.xs },
  studyTitle: { color: colors.text, fontSize: 18, lineHeight: 25, fontWeight: "700" },
  studyText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  studyTrack: { height: 7, borderRadius: radius.pill, overflow: "hidden", backgroundColor: "#E8EEF8" },
  studyProgressFill: { height: "100%", minWidth: 8, borderRadius: radius.pill, overflow: "hidden", backgroundColor: "#3B82F6" },
  thinkingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 28, paddingHorizontal: spacing.sm },
  thinkingDot: { width: 8, height: 8, borderRadius: 4, shadowColor: "#3B82F6", shadowOpacity: 0.24, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  thinkingDotStrong: { backgroundColor: "#3B82F6" },
  thinkingDotMid: { backgroundColor: "#78A9FF" },
  thinkingDotLight: { backgroundColor: "#B8CBFF" },
  thinkingText: { flex: 1, marginLeft: spacing.xs, color: colors.muted, fontSize: 14, lineHeight: 21 },
  footerWrap: { gap: spacing.xs },
  inputBar: { position: "relative", minHeight: 56, borderRadius: 28, padding: 7, paddingLeft: spacing.sm, flexDirection: "row", gap: spacing.sm, alignItems: "flex-end", backgroundColor: "#fff", borderWidth: 1, borderColor: "#E7EAF0", shadowColor: "#111827", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  voiceButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" },
  voiceButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chatInput: { flex: 1, minWidth: 0, color: colors.text, fontSize: 14, lineHeight: 20, paddingLeft: 0, paddingRight: 22, paddingTop: 6, paddingBottom: 6, borderWidth: 0, minHeight: minInputHeight, maxHeight: maxInputHeight },
  expandButton: { position: "absolute", right: 52, top: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.9)" },
  sendButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sendButtonActive: { backgroundColor: colors.primary },
  sendButtonDisabled: { backgroundColor: colors.gray },
  voiceStatus: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingHorizontal: spacing.md },
  expandedOverlay: { flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: "rgba(0,0,0,0.32)" },
  expandedEditor: { width: "100%", maxWidth: 390, minHeight: "78%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 58, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: -8 }, elevation: 8 },
  collapseButton: { position: "absolute", right: spacing.xl, top: spacing.xl, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  expandedInput: { flex: 1, color: colors.text, fontSize: 18, lineHeight: 28, padding: 0, borderWidth: 0 },
  expandedSendButton: { position: "absolute", right: spacing.xl, bottom: spacing.xl, width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" }
});
