import { daysSince, isWithinDays, toISODate } from "../utils/date.js";
import { PriorityLevel, RiskAssessment, TaskDraft, TaskRecord } from "./types.js";

const DECISION_KEYWORDS = ["確認", "判断", "承認"];
const AMBIGUOUS_KEYWORDS = ["調査", "検討", "整理", "まとめ"];

export function resolveCalendarDate(input: {
  nextCheckDate?: string | null;
  dueDate?: string | null;
}): string | null {
  if (input.nextCheckDate) {
    return input.nextCheckDate;
  }
  if (input.dueDate) {
    return input.dueDate;
  }
  return null;
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function sanitizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function scoreToPriority(score: number): PriorityLevel {
  if (score >= 10) {
    return "Critical";
  }
  if (score >= 6) {
    return "High";
  }
  if (score >= 2) {
    return "Medium";
  }
  return "Low";
}

export function assessRisk(task: TaskDraft | TaskRecord, now: Date = new Date()): RiskAssessment {
  const tags = new Set<string>(task.riskTags ?? []);
  const missing: string[] = [];
  const nextActionSuggestions: string[] = [];
  const reasons: string[] = [];
  let score = 0;

  const name = sanitizeText(task.name);
  const rawMemo = sanitizeText(task.rawMemo);
  const completionCriteria = sanitizeText(task.completionCriteria);
  const textForKeyword = `${name}\n${rawMemo}`;

  if (!task.dueDate && !task.nextCheckDate) {
    tags.add("期限不明");
    missing.push("Due Date または Next Check Date");
    reasons.push("期限が不明");
    score += 3;
    nextActionSuggestions.push("期限か次回確認日を設定する");
  }

  if (!task.stakeholders || task.stakeholders.length === 0) {
    tags.add("関係者不明");
    missing.push("Stakeholders");
    reasons.push("関係者の確認が必要");
    score += 3;
    nextActionSuggestions.push("関係者と共有先を特定する");
  }

  if (!sanitizeText(task.decisionMaker) && includesAny(textForKeyword, DECISION_KEYWORDS)) {
    tags.add("関係者不明");
    reasons.push("判断者が未定");
    score += 3;
    nextActionSuggestions.push("判断者を明確にする");
  }

  if (!completionCriteria) {
    tags.add("完了条件不明");
    missing.push("Completion Criteria");
    reasons.push("完了条件が曖昧");
    score += 3;
    nextActionSuggestions.push("完了条件を1行で定義する");
  } else if (completionCriteria.length <= 12 && includesAny(textForKeyword, AMBIGUOUS_KEYWORDS)) {
    tags.add("完了条件不明候補");
    reasons.push("調査系だが完了条件が短い");
    score += 2;
  }

  const staleDays = daysSince(task.lastActionDate, now);
  if (staleDays != null) {
    if (staleDays >= 7) {
      tags.add("停滞");
      reasons.push("1週間以上更新なし");
      score += 4;
      nextActionSuggestions.push("状況共有メッセージを送る");
    } else if (staleDays >= 2) {
      tags.add("停滞候補");
      reasons.push(`${staleDays}日更新なし`);
      score += 2;
      nextActionSuggestions.push("次の着手日時を宣言する");
    }
  }

  if (!sanitizeText(task.nextAction) && task.status !== "Done" && task.status !== "Dropped") {
    tags.add("次アクション不明");
    missing.push("Next Action");
    reasons.push("次アクションが未定");
    score += 2;
    nextActionSuggestions.push("30分以内で終わる次アクションを書く");
  }

  if (task.dueDate && isWithinDays(task.dueDate, 2, now) && task.status !== "Done" && task.status !== "Dropped") {
    tags.add("期限近い");
    reasons.push("期限が近い");
    score += 4;
  }

  if (task.communicationNeeded) {
    tags.add("連絡必要");
    reasons.push("連絡が必要");
    score += 3;
  }

  if (task.impactTarget) {
    tags.add("他者影響あり");
    reasons.push("他者影響あり");
    score += 5;
  }

  if (task.status === "Inbox") {
    tags.add("Inbox未整理");
  }

  if ((task.status === "Done" || task.status === "Dropped") && tags.has("次アクション不明")) {
    tags.delete("次アクション不明");
  }

  const priorityLevel = scoreToPriority(score);
  const priorityReason = reasons.length > 0 ? reasons : ["現時点の明確な高リスク要因は少ない"];

  return {
    tags: [...tags],
    missing: [...new Set(missing)],
    nextActionSuggestions: [...new Set(nextActionSuggestions)],
    priorityLevel,
    priorityReason,
  };
}

export function buildPriorityReasonText(reasons: string[]): string {
  return reasons.map((r) => `- ${r}`).join("\n");
}

export function todayDateText(): string {
  return toISODate(new Date());
}
