import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { AppButton, ConfirmDialog, Screen } from "@/components/ui/primitives";
import { AIQuestionCard, CollectionHeader, ModernOptionSelector, ModernTextInput, NextHint, QuestionExplanation, QuestionPanel, SummarySheet } from "@/components/explore/ProfileCollectionUI";
import { experienceQuestions } from "@/data/mockData";
import { useAppStore } from "@/store/useAppStore";
import { ExploreProfile } from "@/types/domain";

const helperText = [
  "基础画像已经完成了。接下来我会看你已有经历里，哪些能力可以迁移。",
  "不一定是正式工作，项目、比赛、实习、社团都可以算作素材。",
  "最后看看你更偏好的工作状态，这会影响推荐方向的稳定性。"
];

const noTypicalExperience = "暂无特别典型的经历";

export default function Experience() {
  const [index, setIndex] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [supplements, setSupplements] = useState<Record<string, string>>({});
  const { profile, setProfileField } = useAppStore();
  const question = experienceQuestions[index];
  const key = question.key as keyof ExploreProfile;
  const selected = Array.isArray(profile[key]) ? (profile[key] as string[]) : [];
  const supplement = supplements[String(key)] ?? "";
  const requiresOtherText = selected.includes("其他");
  const canGoNext = selected.length > 0 && (!requiresOtherText || supplement.trim().length > 0);

  const onToggle = (value: string) => {
    if (key === "experiences") {
      if (value === noTypicalExperience) {
        setProfileField(key, selected.includes(value) ? [] : [value]);
        return;
      }

      const withoutNoTypical = selected.filter((item) => item !== noTypicalExperience);
      const next = withoutNoTypical.includes(value) ? withoutNoTypical.filter((item) => item !== value) : [...withoutNoTypical, value];
      setProfileField(key, next);
      return;
    }

    const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
    setProfileField(key, next);
  };

  const next = () => {
    if (!canGoNext) return;
    if (requiresOtherText) {
      setProfileField(key, selected.map((item) => (item === "其他" ? `其他：${supplement.trim()}` : item)));
    }
    if (index < experienceQuestions.length - 1) setIndex(index + 1);
    else router.push("/explore/followup");
  };

  return (
    <>
      <Screen navTitle="发现" close onClose={() => setShowExit(true)} activeTab="发现">
        <CollectionHeader step={index + 8} total={10} title="经历与能力补充" onSummary={() => setShowSummary(true)} />
        <QuestionExplanation text={helperText[index] ?? "我会结合这些信息判断你的可迁移能力。"} />
        <QuestionPanel>
          <AIQuestionCard title={question.title} selectedSummary={selected} />
          <ModernOptionSelector options={question.options} selected={selected} onToggle={onToggle} multi />
          <ModernTextInput
            required={requiresOtherText}
            value={supplement}
            onChangeText={(value) => setSupplements((prev) => ({ ...prev, [String(key)]: value }))}
            multiline
            placeholder={requiresOtherText ? "请填写你的具体经历或状态" : "例如：在产品实习中负责需求整理和竞品分析"}
          />
        </QuestionPanel>
        {requiresOtherText && !canGoNext ? <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 20 }}>选择“其他”后，需要先填写补充说明。</Text> : null}
        <View style={{ gap: 14 }}>
          <NextHint text="我会根据你的经历、偏好和现实约束，判断是否还需要继续动态追问。" />
          <AppButton title={index === experienceQuestions.length - 1 ? "进入动态追问" : "下一步"} onPress={next} disabled={!canGoNext} style={{ marginTop: 0 }} />
        </View>
      </Screen>
      <SummarySheet visible={showSummary} onClose={() => setShowSummary(false)} profile={profile} mode="experience" />
      <ConfirmDialog visible={showExit} title="退出本次探索？" message="当前未确认内容将不会保留，退出后需要重新开始。" cancelText="继续探索" confirmText="退出" onCancel={() => setShowExit(false)} onConfirm={() => router.replace("/explore/intro")} />
    </>
  );
}
