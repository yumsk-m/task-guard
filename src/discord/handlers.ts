import { assessRisk, buildPriorityReasonText, resolveCalendarDate } from "../domain/risk.js";
import { renderTemplate } from "../domain/templates.js";
import { TaskDraft, TaskRecord, TemplateKind } from "../domain/types.js";
import { buildQuickResponse, buildReviewMessage, buildTodayMessage, buildWeeklyMessage } from "./formatters.js";
import { TaskService } from "../notion/taskService.js";
import { parseDateInput, toISODate, toISODateTime } from "../utils/date.js";

type InteractionOption = {
  name: string;
  type: number;
  value?: string;
};

export type InteractionCommandData = {
  name: string;
  options?: InteractionOption[];
};

function optionValue(data: InteractionCommandData, name: string): string | null {
  const value = data.options?.find((o) => o.name === name)?.value;
  return typeof value === "string" ? value : null;
}

function splitCommaText(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function estimateDueDateFromMemo(memo: string): string | null {
  const isoDateMatch = memo.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  if (memo.includes("今週中")) {
    const now = new Date();
    const day = now.getDay();
    const diffToFriday = day <= 5 ? 5 - day : 6;
    const friday = new Date(now.getTime() + diffToFriday * 24 * 60 * 60 * 1000);
    return toISODate(friday);
  }

  if (memo.includes("今日中")) {
    return toISODate(new Date());
  }

  return null;
}

export async function executeCommand(data: InteractionCommandData, taskService: TaskService): Promise<string> {
  const { name: commandName } = data;

  if (commandName === "quick") {
    const memo = optionValue(data, "memo");
    if (!memo) {
      return "memoが必要です。";
    }

    const dueDate = estimateDueDateFromMemo(memo);
    const draft: TaskDraft = {
      name: memo.slice(0, 80),
      status: "Inbox",
      rawMemo: memo,
      source: "Discord",
      dueDate,
      lastActionDate: toISODateTime(new Date()),
      communicationNeeded: false,
    };

    draft.calendarDate = resolveCalendarDate({ dueDate: draft.dueDate, nextCheckDate: draft.nextCheckDate });
    const risk = assessRisk(draft);
    draft.riskTags = risk.tags;
    draft.priorityLevel = risk.priorityLevel;
    draft.priorityReason = buildPriorityReasonText(risk.priorityReason);

    const created = await taskService.createTask(draft);
    return buildQuickResponse({
      tags: risk.tags,
      missing: risk.missing,
      nextActions: risk.nextActionSuggestions,
      taskName: created.name,
    });
  }

  if (commandName === "task") {
    const title = optionValue(data, "title");
    if (!title) {
      return "titleが必要です。";
    }

    const due = optionValue(data, "due");
    const stakeholderRaw = optionValue(data, "stakeholder");
    const nextAction = optionValue(data, "next");
    const completion = optionValue(data, "completion");
    const project = optionValue(data, "project");
    const type = optionValue(data, "type");
    const purpose = optionValue(data, "purpose");
    const dueDateParsed = due ? parseDateInput(due) : null;

    const draft: TaskDraft = {
      name: title,
      status: "Todo",
      dueDate: dueDateParsed ? toISODateTime(dueDateParsed) : null,
      stakeholders: splitCommaText(stakeholderRaw),
      nextAction,
      completionCriteria: completion,
      project,
      type,
      purpose,
      source: "Discord",
      lastActionDate: toISODateTime(new Date()),
      communicationNeeded: false,
    };

    draft.calendarDate = resolveCalendarDate({ dueDate: draft.dueDate, nextCheckDate: draft.nextCheckDate });
    const risk = assessRisk(draft);
    draft.riskTags = risk.tags;
    draft.priorityLevel = risk.priorityLevel;
    draft.priorityReason = buildPriorityReasonText(risk.priorityReason);

    await taskService.createTask(draft);
    return buildQuickResponse({
      tags: risk.tags,
      missing: risk.missing,
      nextActions: risk.nextActionSuggestions,
      taskName: title,
    });
  }

  if (commandName === "today") {
    const tasks = await taskService.listOpenTasks();
    return buildTodayMessage(tasks);
  }

  if (commandName === "review") {
    return buildReviewMessage();
  }

  if (commandName === "weekly") {
    const tasks = await taskService.listOpenTasks();
    return buildWeeklyMessage(tasks);
  }

  if (commandName === "template") {
    const kind = optionValue(data, "kind") as TemplateKind | null;
    const title = optionValue(data, "title");
    if (!kind || !title) {
      return "kind と title が必要です。";
    }
    return renderTemplate(kind, title);
  }

  if (commandName === "check") {
    const title = optionValue(data, "title");
    const dateText = optionValue(data, "datetime");

    if (!title || !dateText) {
      return "title と datetime が必要です。";
    }

    const parsed = parseDateInput(dateText);
    if (!parsed) {
      return "日時の形式が不正です。YYYY-MM-DD または ISO8601 で指定してください。";
    }

    const candidates = await taskService.findByNameContains(title);
    const openCandidates = candidates.filter((task) => task.status !== "Done" && task.status !== "Dropped");

    if (openCandidates.length === 0) {
      return "対象タスクが見つかりませんでした。";
    }

    const task = openCandidates[0];
    const nextCheckDate = toISODateTime(parsed);
    const calendarDate = resolveCalendarDate({
      nextCheckDate,
      dueDate: task.dueDate,
    });

    const updated: Partial<TaskRecord> = {
      nextCheckDate,
      calendarDate,
      lastActionDate: toISODateTime(new Date()),
    };

    const riskAfter = assessRisk({ ...task, ...updated });
    updated.riskTags = riskAfter.tags;
    updated.priorityLevel = riskAfter.priorityLevel;
    updated.priorityReason = buildPriorityReasonText(riskAfter.priorityReason);

    await taskService.updateTask(task.id, updated);

    return [
      `更新しました: ${task.name}`,
      `Next Check Date: ${nextCheckDate}`,
      `Calendar Date: ${calendarDate ?? "(空)"}`,
    ].join("\n");
  }

  return "未対応のコマンドです。";
}
