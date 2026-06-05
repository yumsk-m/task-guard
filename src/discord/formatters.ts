import { assessRisk } from "../domain/risk.js";
import { TaskRecord } from "../domain/types.js";
import { isSameDate, isWithinDays } from "../utils/date.js";

function summarizeTask(task: TaskRecord): string {
  const risk = assessRisk(task);
  const tags = risk.tags.slice(0, 3).map((t) => `#${t}`).join(" ") || "#要確認";
  const suggestion = risk.nextActionSuggestions[0] ?? "次アクションを明文化";
  return `- ${task.name}\n  ${tags}\n  推奨: ${suggestion}`;
}

export function buildQuickResponse(params: {
  tags: string[];
  missing: string[];
  nextActions: string[];
  taskName: string;
}): string {
  const tagLine = params.tags.map((tag) => `#${tag}`).join(" ") || "なし";
  const missingLine = params.missing.length > 0 ? params.missing.map((m) => `- ${m}`).join("\n") : "- なし";
  const nextLine = params.nextActions.length > 0 ? params.nextActions.map((n) => `- ${n}`).join("\n") : "- なし";

  return [
    `Notionに登録しました: ${params.taskName}`,
    "",
    `推定タグ:\n${tagLine}`,
    "",
    `不足:\n${missingLine}`,
    "",
    `次アクション候補:\n${nextLine}`,
  ].join("\n");
}

export function buildTodayMessage(tasks: TaskRecord[], now: Date = new Date()): string {
  const target = tasks.filter((task) => {
    const risk = assessRisk(task, now);
    return (
      isSameDate(task.calendarDate, now) ||
      isWithinDays(task.dueDate, 2, now) ||
      risk.tags.some((tag) => ["停滞", "期限不明", "完了条件不明", "関係者不明"].includes(tag)) ||
      task.communicationNeeded
    );
  });

  if (target.length === 0) {
    return "今日の要対応タスクは見つかりませんでした。";
  }

  const lines = target.slice(0, 10).map((task, index) => `${index + 1}. ${summarizeTask(task)}`);
  return ["今日の要対応です。", "", ...lines].join("\n");
}

export function buildReviewMessage(): string {
  return [
    "終業前チェックです。",
    "",
    "- 今日、自分のところで止めたものはありますか？",
    "- 期限が分からないまま持っているものはありますか？",
    "- 誰に共有すべきか曖昧なものはありますか？",
    "- 完了条件が曖昧なまま進めているものはありますか？",
    "- 作り込みすぎているものはありますか？",
  ].join("\n");
}

export function buildWeeklyMessage(tasks: TaskRecord[]): string {
  const groups: Record<string, string[]> = {
    停滞: [],
    期限不明: [],
    完了条件不明: [],
  };

  for (const task of tasks) {
    const risk = assessRisk(task);
    if (risk.tags.includes("停滞")) {
      groups["停滞"].push(task.name);
    }
    if (risk.tags.includes("期限不明")) {
      groups["期限不明"].push(task.name);
    }
    if (risk.tags.includes("完了条件不明")) {
      groups["完了条件不明"].push(task.name);
    }
  }

  const section = (title: string, names: string[]) => {
    if (names.length === 0) {
      return `#${title}\n- 該当なし`;
    }
    return `#${title}\n${names.slice(0, 10).map((name) => `- ${name}`).join("\n")}`;
  };

  return [
    "週次棚卸しです。",
    "",
    section("停滞", groups["停滞"]),
    "",
    section("期限不明", groups["期限不明"]),
    "",
    section("完了条件不明", groups["完了条件不明"]),
    "",
    "確認観点:",
    "- 似た事故パターンが他にもないか",
    "- 1週間動いていないものは状況共有したか",
    "- 期限不明のものに次回確認日を入れたか",
  ].join("\n");
}
