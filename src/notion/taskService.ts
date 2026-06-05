import { TaskDraft, TaskRecord, TaskStatus } from "../domain/types.js";

type NotionPage = {
  id: string;
  properties: Record<string, any>;
};

function textToRichText(value: string): Array<{ type: "text"; text: { content: string } }> {
  return [{ type: "text", text: { content: value } }];
}

function readTitle(prop: any): string {
  const values = prop?.title;
  if (!Array.isArray(values) || values.length === 0) {
    return "(無題)";
  }
  return values.map((v) => v.plain_text ?? "").join("").trim() || "(無題)";
}

function readRichText(prop: any): string | null {
  const values = prop?.rich_text;
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const text = values.map((v) => v.plain_text ?? "").join("").trim();
  return text.length > 0 ? text : null;
}

function readSelect(prop: any): string | null {
  return prop?.select?.name ?? null;
}

function readMultiSelect(prop: any): string[] {
  if (!Array.isArray(prop?.multi_select)) {
    return [];
  }
  return prop.multi_select.map((v: any) => v.name).filter((v: unknown): v is string => typeof v === "string");
}

function readDate(prop: any): string | null {
  return prop?.date?.start ?? null;
}

function readCheckbox(prop: any): boolean {
  return Boolean(prop?.checkbox);
}

function toTaskRecord(page: NotionPage): TaskRecord {
  const p = page.properties;
  const status = (readSelect(p["Status"]) ?? "Inbox") as TaskStatus;

  return {
    id: page.id,
    name: readTitle(p["Name"]),
    status,
    project: readSelect(p["Project"]) ?? readRichText(p["Project"]),
    type: readSelect(p["Type"]),
    purpose: readRichText(p["Purpose"]),
    dueDate: readDate(p["Due Date"]),
    nextCheckDate: readDate(p["Next Check Date"]),
    calendarDate: readDate(p["Calendar Date"]),
    completionCriteria: readRichText(p["Completion Criteria"]),
    nextAction: readRichText(p["Next Action"]),
    stakeholders: readMultiSelect(p["Stakeholders"]),
    decisionMaker: readRichText(p["Decision Maker"]),
    shareTo: readRichText(p["Share To"]),
    impactTarget: readRichText(p["Impact Target"]),
    riskTags: readMultiSelect(p["Risk Tags"]),
    lastActionDate: readDate(p["Last Action Date"]),
    priorityLevel: (readSelect(p["Priority Level"]) as TaskRecord["priorityLevel"]) ?? null,
    priorityReason: readRichText(p["Priority Reason"]),
    communicationNeeded: readCheckbox(p["Communication Needed"]),
    messageDraft: readRichText(p["Message Draft"]),
    rawMemo: readRichText(p["Raw Memo"]),
    source: readSelect(p["Source"]),
  };
}

function buildProperties(draft: Partial<TaskDraft | TaskRecord>): Record<string, any> {
  const props: Record<string, any> = {};

  if (draft.name != null) {
    props["Name"] = { title: textToRichText(draft.name) };
  }
  if (draft.status != null) {
    props["Status"] = { select: { name: draft.status } };
  }
  if (draft.project != null) {
    props["Project"] = { select: { name: draft.project } };
  }
  if (draft.type != null) {
    props["Type"] = { select: { name: draft.type } };
  }
  if (draft.purpose != null) {
    props["Purpose"] = { rich_text: textToRichText(draft.purpose) };
  }
  if (draft.dueDate != null) {
    props["Due Date"] = { date: draft.dueDate ? { start: draft.dueDate } : null };
  }
  if (draft.nextCheckDate != null) {
    props["Next Check Date"] = { date: draft.nextCheckDate ? { start: draft.nextCheckDate } : null };
  }
  if (draft.calendarDate != null) {
    props["Calendar Date"] = { date: draft.calendarDate ? { start: draft.calendarDate } : null };
  }
  if (draft.completionCriteria != null) {
    props["Completion Criteria"] = { rich_text: textToRichText(draft.completionCriteria) };
  }
  if (draft.nextAction != null) {
    props["Next Action"] = { rich_text: textToRichText(draft.nextAction) };
  }
  if (draft.stakeholders != null) {
    props["Stakeholders"] = { multi_select: draft.stakeholders.map((name) => ({ name })) };
  }
  if (draft.decisionMaker != null) {
    props["Decision Maker"] = { rich_text: textToRichText(draft.decisionMaker) };
  }
  if (draft.shareTo != null) {
    props["Share To"] = { rich_text: textToRichText(draft.shareTo) };
  }
  if (draft.impactTarget != null) {
    props["Impact Target"] = { rich_text: textToRichText(draft.impactTarget) };
  }
  if (draft.riskTags != null) {
    props["Risk Tags"] = { multi_select: draft.riskTags.map((name) => ({ name })) };
  }
  if (draft.lastActionDate != null) {
    props["Last Action Date"] = { date: draft.lastActionDate ? { start: draft.lastActionDate } : null };
  }
  if (draft.priorityLevel != null) {
    props["Priority Level"] = { select: { name: draft.priorityLevel } };
  }
  if (draft.priorityReason != null) {
    props["Priority Reason"] = { rich_text: textToRichText(draft.priorityReason) };
  }
  if (draft.communicationNeeded != null) {
    props["Communication Needed"] = { checkbox: draft.communicationNeeded };
  }
  if (draft.messageDraft != null) {
    props["Message Draft"] = { rich_text: textToRichText(draft.messageDraft) };
  }
  if (draft.rawMemo != null) {
    props["Raw Memo"] = { rich_text: textToRichText(draft.rawMemo) };
  }
  if (draft.source != null) {
    props["Source"] = { select: { name: draft.source } };
  }

  return props;
}

export class TaskService {
  constructor(
    private readonly notionToken: string,
    private readonly databaseId: string,
  ) {}

  private async notion<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`https://api.notion.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Notion API error ${response.status}: ${body}`);
    }

    return (await response.json()) as T;
  }

  async createTask(draft: TaskDraft): Promise<TaskRecord> {
    const page = await this.notion<NotionPage>("/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: this.databaseId },
        properties: buildProperties(draft),
      }),
    });
    return toTaskRecord(page as unknown as NotionPage);
  }

  async updateTask(id: string, patch: Partial<TaskRecord>): Promise<void> {
    await this.notion(`/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: buildProperties(patch),
      }),
    });
  }

  async listOpenTasks(): Promise<TaskRecord[]> {
    const pages = await this.queryAll({
      and: [
        { property: "Status", select: { does_not_equal: "Done" } },
        { property: "Status", select: { does_not_equal: "Dropped" } },
      ],
    });
    return pages.map(toTaskRecord);
  }

  async findByNameContains(query: string): Promise<TaskRecord[]> {
    const pages = await this.queryAll({
      and: [
        { property: "Name", title: { contains: query } },
        { property: "Status", select: { does_not_equal: "Dropped" } },
      ],
    });
    return pages.map(toTaskRecord);
  }

  private async queryAll(filter?: Record<string, any>): Promise<NotionPage[]> {
    const results: NotionPage[] = [];
    let cursor: string | undefined;

    while (true) {
      const response = await this.notion<{
        results: NotionPage[];
        has_more: boolean;
        next_cursor: string | null;
      }>(`/databases/${this.databaseId}/query`, {
        method: "POST",
        body: JSON.stringify({
          page_size: 100,
          start_cursor: cursor,
          filter,
        }),
      });

      for (const row of response.results) {
        if ((row as any).properties) {
          results.push(row as unknown as NotionPage);
        }
      }

      if (!response.has_more || !response.next_cursor) {
        break;
      }
      cursor = response.next_cursor;
    }

    return results;
  }
}
