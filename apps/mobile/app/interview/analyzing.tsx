import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { Card, Screen, uiStyles } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { ApiError } from "@/services/apiClient";
import { analyzeInterview } from "@/services/interviewApi";

const reportTitleIcon = require("../../img/4-1.png") as ImageSourcePropType;
const tipIconImage = require("../../img/9-1.png") as ImageSourcePropType;
const stepAdvanceMs = 1250;

const steps = [
  ["读取面试资料", "已完成"],
  ["提取岗位信息", "已完成"],
  ["分析回答逻辑", "分析中"],
  ["识别 STAR 结构", "待进行"],
  ["生成面试官视角与训练建议", "待进行"]
] as const;

const materials = [
  ["graphic-eq", "面试资料", "面试记录 1 份"],
  ["business-center", "岗位名称", "AI产品经理"],
  ["apartment", "公司名称", "字节跳动"],
  ["description", "岗位 JD", "已补充"]
] as const;

const getStepStatus = (index: number, activeStep: number) => {
  if (index < activeStep) return "已完成";
  if (index === activeStep) return "分析中";
  return "待进行";
};

function AnalysisStatusTag({ label }: { label: string }) {
  const tagStyle =
    label === "分析中"
      ? styles.analysisTagActive
      : label === "已完成"
        ? styles.analysisTagDone
        : styles.analysisTagTodo;
  const textStyle =
    label === "分析中"
      ? styles.analysisTagTextActive
      : label === "已完成"
        ? styles.analysisTagTextDone
        : styles.analysisTagTextTodo;

  return (
    <View style={[styles.analysisTag, tagStyle]}>
      <Text style={[styles.analysisTagText, textStyle]}>{label}</Text>
    </View>
  );
}

function AnalysisLoadingDots() {
  const dotAnimations = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
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
  }, [dotAnimations]);

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
    <>
      <Animated.View style={[styles.dot, styles.dotStrong, animatedDotStyle(dotAnimations[0])]} />
      <Animated.View style={[styles.dot, styles.dotMid, animatedDotStyle(dotAnimations[1])]} />
      <Animated.View style={[styles.dot, styles.dotLight, animatedDotStyle(dotAnimations[2])]} />
    </>
  );
}

function StepRow({ index, title, status }: { index: number; title: string; status: string }) {
  const done = status === "已完成";
  const active = status === "分析中";
  const checkAnim = useRef(new Animated.Value(done ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!done) {
      checkAnim.setValue(0);
      return;
    }

    Animated.spring(checkAnim, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true
    }).start();
  }, [checkAnim, done]);

  useEffect(() => {
    if (!active) {
      pulseAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true
        })
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [active, pulseAnim]);

  const checkStyle = {
    opacity: checkAnim,
    transform: [
      {
        scale: checkAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.45, 1]
        })
      }
    ]
  };
  const pulseStyle = {
    opacity: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 0]
    }),
    transform: [
      {
        scale: pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.9]
        })
      }
    ]
  };

  return (
    <View style={styles.stepRow}>
      <View style={styles.timeline}>
        <Animated.View style={[styles.stepDot, done ? styles.stepDotDone : active ? styles.stepDotActive : styles.stepDotTodo]}>
          {active ? <Animated.View style={[styles.stepPulse, pulseStyle]} /> : null}
          {done ? (
            <Animated.View style={checkStyle}>
              <MaterialIcons name="check" size={14} color="#fff" />
            </Animated.View>
          ) : active ? (
            <View style={styles.stepActiveCore} />
          ) : null}
        </Animated.View>
        {index < steps.length - 1 ? <View style={[styles.stepLine, done ? styles.stepLineDone : null]} /> : null}
      </View>
      <Text style={[styles.stepTitle, active ? styles.stepTitleActive : null]}>{index + 1}. {title}</Text>
      <AnalysisStatusTag label={status} />
    </View>
  );
}

export default function InterviewAnalyzing() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const session = sessionId ?? "mock-session";
  const [activeStep, setActiveStep] = useState(0);

  // P1-04:真实触发后端分析,完成后带 sessionId 跳转复盘页;失败也跳转(overview 自带 mock 回退)。
  // 同时保证至少展示约 10s 动画,避免后端秒回时动画一闪而过。
  useEffect(() => {
    let navigated = false;
    const go = () => {
      if (navigated) return;
      navigated = true;
      router.replace(`/interview/overview?sessionId=${encodeURIComponent(session)}`);
    };

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 10000));
    const analyzed = analyzeInterview(session).catch((err: unknown) => {
      const reason = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
      console.warn("[analyzing] 分析失败,仍进入复盘页(走 mock 回退):", reason);
    });

    let cancelled = false;
    Promise.all([minDelay, analyzed]).then(() => {
      if (!cancelled) go();
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (activeStep >= steps.length) return;

    const timer = setTimeout(() => {
      setActiveStep((step) => step + 1);
    }, stepAdvanceMs);

    return () => clearTimeout(timer);
  }, [activeStep]);

  return (
    <Screen navTitle="面试分析中" activeTab="面试">
      <Card style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View style={styles.heroText}>
            <View style={styles.heroTitleRow}>
              <Image source={reportTitleIcon} style={styles.heroTitleIcon} resizeMode="contain" />
              <Text style={styles.heroTitle} numberOfLines={1}>
                正在生成你的复盘报告
              </Text>
            </View>
            <Text style={styles.heroDescription}>我会结合你的面试内容和岗位信息，从回答逻辑、STAR结构、风险点和面试官视角等方面进行分析。</Text>
            <View style={styles.loadingRow}>
              <Text style={uiStyles.muted}>AI 分析中</Text>
              <AnalysisLoadingDots />
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="timeline" size={18} color={colors.primary} />
          </View>
          <Text style={uiStyles.sectionTitle}>正在进行的分析步骤</Text>
        </View>
        <View style={styles.steps}>
          {steps.map(([title], index) => {
            const status = getStepStatus(index, activeStep);
            return <StepRow key={title} index={index} title={title} status={status} />;
          })}
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="assignment" size={18} color={colors.primary} />
          </View>
          <Text style={uiStyles.sectionTitle}>本次分析资料</Text>
        </View>
        <View style={styles.materialBox}>
          {materials.map(([icon, label, value], index) => (
            <View key={label} style={[styles.materialRow, index === materials.length - 1 ? styles.materialRowLast : null]}>
              <View style={styles.materialIcon}>
                <MaterialIcons name={icon} size={19} color={colors.primary} />
              </View>
              <Text style={styles.materialLabel}>{label}</Text>
              <Text style={styles.materialValue}>{value}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.tipCard}>
        <View style={styles.tipIcon}>
          <Image source={tipIconImage} style={styles.tipIconImage} resizeMode="contain" />
        </View>
        <Text style={styles.tipText}>这不是简单打分，我更关注你卡在哪里，以及下一步怎么提升。</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: spacing.xl
  },
  heroContent: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: spacing.md
  },
  heroText: {
    flex: 1,
    gap: spacing.md
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "nowrap"
  },
  heroTitleIcon: {
    width: 30,
    height: 30,
    alignSelf: "center"
  },
  heroTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
    textAlignVertical: "center"
  },
  heroDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 24
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.24,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  dotStrong: {
    backgroundColor: "#3B82F6"
  },
  dotMid: {
    backgroundColor: "#78A9FF"
  },
  dotLight: {
    backgroundColor: "#B8CBFF"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  steps: {
    gap: 0
  },
  stepRow: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  timeline: {
    width: 22,
    alignItems: "center",
    alignSelf: "stretch"
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    borderWidth: 2,
    overflow: "visible"
  },
  stepDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  stepDotActive: {
    backgroundColor: "#fff",
    borderColor: "#307DFC",
    shadowColor: "#307DFC",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
  stepDotTodo: {
    backgroundColor: "#fff",
    borderColor: colors.border
  },
  stepPulse: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#307DFC"
  },
  stepActiveCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#307DFC"
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border
  },
  stepLineDone: {
    backgroundColor: colors.primary
  },
  stepTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "400"
  },
  stepTitleActive: {
    color: colors.primary,
    fontWeight: "600"
  },
  analysisTag: {
    minWidth: 52,
    height: 24,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  analysisTagActive: {
    backgroundColor: "#DEE9FE"
  },
  analysisTagDone: {
    backgroundColor: "#ECFBF1"
  },
  analysisTagTodo: {
    backgroundColor: "#F7F9FC"
  },
  analysisTagText: {
    fontSize: 12,
    lineHeight: 24,
    fontWeight: "700"
  },
  analysisTagTextActive: {
    color: "#307DFC"
  },
  analysisTagTextDone: {
    color: "#22A45A"
  },
  analysisTagTextTodo: {
    color: "#8A96A8"
  },
  materialBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: "#fff"
  },
  materialRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  materialRowLast: {
    borderBottomWidth: 0
  },
  materialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  materialLabel: {
    width: 84,
    color: colors.text,
    fontSize: 14,
    fontWeight: "400"
  },
  materialValue: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "400"
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F2FE",
    borderWidth: 0
  },
  tipIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center"
  },
  tipIconImage: {
    width: 42,
    height: 42
  },
  tipText: {
    flex: 1,
    color: "#767C98",
    fontSize: 15,
    lineHeight: 24
  }
});
