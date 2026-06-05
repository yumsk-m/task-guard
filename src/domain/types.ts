export type TaskStatus = "Inbox" | "Todo" | "Doing" | "Waiting" | "Done" | "Dropped";

export type PriorityLevel = "Critical" | "High" | "Medium" | "Low";

export type TemplateKind = "stalled" | "delay" | "due" | "scope" | "decision";

export type TaskRecord = {
  id: string;
  name: string;
  status: TaskStatus;
  project: string | null;
  type: string | null;
  purpose: string | null;
  dueDate: string | null;
  nextCheckDate: string | null;
  calendarDate: string | null;
  completionCriteria: string | null;
  nextAction: string | null;
  stakeholders: string[];
  decisionMaker: string | null;
  shareTo: string | null;
  impactTarget: string | null;
  riskTags: string[];
  lastActionDate: string | null;
  priorityLevel: PriorityLevel | null;
  priorityReason: string | null;
  communicationNeeded: boolean;
  messageDraft: string | null;
  rawMemo: string | null;
  source: string | null;
};

export type RiskAssessment = {
  tags: string[];
  missing: string[];
  nextActionSuggestions: string[];
  priorityLevel: PriorityLevel;
  priorityReason: string[];
};

export type TaskDraft = Partial<Omit<TaskRecord, "id">> & {
  name: string;
  status: TaskStatus;
};
