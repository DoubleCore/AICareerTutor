import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { AppButton, ConfirmDialog, Screen } from "@/components/ui/primitives";
import { AIQuestionCard, CollectionHeader, ModernOptionSelector, ModernTextInput, NextHint, QuestionExplanation, QuestionPanel, SummarySheet } from "@/components/explore/ProfileCollectionUI";
import { basicQuestions } from "@/data/mockData";
import { ApiError } from "@/services/apiClient";
import { submitBasicProfile } from "@/services/exploreApi";
import { useAppStore } from "@/store/useAppStore";
import { ExploreProfile } from "@/types/domain";

const arrayKeys: (keyof ExploreProfile)[] = ["interests", "workPreferences", "constraints"];

const exclusiveConstraintGroups = [
  ["能接受加班", "不能接受频繁加班"],
  ["能接受出差", "不能接受频繁出差"]
];

const normalizeConstraintSelection = (current: string[], value: string) => {
  if (value === "暂无特别限制") {
    return current.includes(value) ? [] : [value];
  }

  const withoutNoLimit = current.filter((item) => item !== "暂无特别限制");
  const isSelected = withoutNoLimit.includes(value);
  const toggled = isSelected ? withoutNoLimit.filter((item) => item !== value) : [...withoutNoLimit, value];
  const exclusiveGroup = exclusiveConstraintGroups.find((group) => group.includes(value));

  if (!exclusiveGroup || isSelected) return toggled;
  return toggled.filter((item) => item === value || !exclusiveGroup.includes(item));
};

const helperText = [
  "先从你当前所处阶段开始，我会用这个判断探索的起点。",
  "学历不是限制，只是帮我估算更现实的切入路径。",
  "专业背景会影响迁移能力，也会影响第一批推荐方向。",
  "兴趣偏好能帮我判断你更愿意长期投入哪类事情。",
  "再看看你希望未来的工作更接近什么样的状态。",
  "最后一个核心问题：这次探索里，你最希望我帮你解决什么。",
  "现实约束会影响职业选择，我们把边界提前纳入判断。"
];

export default function BasicProfile() {
  const [index, setIndex] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [supplements, setSupplements] = useState<Record<string, string>>({});
  const { profile, setProfileField } = useAppStore();
  const question = basicQuestions[index];
  const key = question.key as keyof ExploreProfile;
  const raw = profile[key];
  const selected = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  const supplement = supplements[String(key)] ?? "";
  const requiresOtherText = selected.includes("其他");
  const canGoNext = selected.length > 0 && (!requiresOtherText || supplement.trim().length > 0);

  const onToggle = (value: string) => {
    if (key === "constraints") {
      setProfileField(key, normalizeConstraintSelection(selected, value));
      return;
    }

    if (arrayKeys.includes(key)) {
      const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
      setProfileField(key, next);
    } else {
      setProfileField(key, value);
    }
  };

  const next = () => {
    if (!canGoNext) return;
    if (requiresOtherText) {
      const otherValue = `其他：${supplement.trim()}`;
      if (arrayKeys.includes(key)) {
        setProfileField(key, selected.map((item) => (item === "其他" ? otherValue : item)));
      } else {
        setProfileField(key, otherValue);
      }
    }
    if (index < basicQuestions.length - 1) setIndex(index + 1);
    else {
      // 探索链路做实:末步把累积画像提交后端落库(失败 console.warn 回退,不中断演示)。
      // 用 getState() 取最新 profile —— zustand set 同步,已含上面的「其他」转写。
      submitBasicProfile(useAppStore.getState().profile).catch((err: unknown) => {
        const reason = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
        console.warn("[basic-profile] 提交画像失败,继续流程:", reason);
      });
      router.push("/explore/experience");
    }
  };

  return (
    <>
      <Screen navTitle="发现" close onClose={() => setShowExit(true)} activeTab="发现">
        <CollectionHeader step={index + 1} total={basicQuestions.length} title="基础画像采集" onSummary={() => setShowSummary(true)} />
        <QuestionExplanation text={helperText[index] ?? "你的选择会帮助我判断更适合你的方向。"} />
        <QuestionPanel>
          <AIQuestionCard title={question.title} selectedSummary={selected} />
          <ModernOptionSelector options={question.options} selected={selected} onToggle={onToggle} multi={arrayKeys.includes(key)} />
          <ModernTextInput
            required={requiresOtherText}
            value={supplement}
            onChangeText={(value) => setSupplements((prev) => ({ ...prev, [String(key)]: value }))}
            placeholder={requiresOtherText ? "请填写你的具体情况" : "如果选项没有覆盖到，可以先简单补充"}
          />
        </QuestionPanel>
        {requiresOtherText && !canGoNext ? <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 20 }}>选择“其他”后，需要先填写补充说明。</Text> : null}
        <View style={{ gap: 14 }}>
          <NextHint text="后续还会继续了解：你这次最想解决的问题、哪些现实条件会影响你的职业选择。" />
          <AppButton title={index === basicQuestions.length - 1 ? "进入经历补充" : "下一步"} onPress={next} disabled={!canGoNext} style={{ marginTop: 0 }} />
        </View>
      </Screen>
      <SummarySheet visible={showSummary} onClose={() => setShowSummary(false)} profile={profile} mode="basic" />
      <ConfirmDialog visible={showExit} title="退出本次探索？" message="当前未确认内容将不会保留，退出后需要重新开始。" cancelText="继续探索" confirmText="退出" onCancel={() => setShowExit(false)} onConfirm={() => router.replace("/explore/intro")} />
    </>
  );
}
