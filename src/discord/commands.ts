const STR = 3;

export const slashCommandJson = [
  {
    name: "quick",
    description: "雑にタスクを登録します",
    options: [{ type: STR, name: "memo", description: "雑メモ", required: true }],
  },
  {
    name: "task",
    description: "構造化したタスクを登録します",
    options: [
      { type: STR, name: "title", description: "タスク名", required: true },
      { type: STR, name: "due", description: "期限 (YYYY-MM-DD or ISO8601)", required: false },
      { type: STR, name: "stakeholder", description: "関係者 (カンマ区切り)", required: false },
      { type: STR, name: "next", description: "次アクション", required: false },
      { type: STR, name: "completion", description: "完了条件", required: false },
      { type: STR, name: "project", description: "案件名・活動名", required: false },
      { type: STR, name: "type", description: "種別", required: false },
      { type: STR, name: "purpose", description: "目的", required: false },
    ],
  },
  { name: "today", description: "今日の要対応タスクを表示します" },
  { name: "review", description: "終業前レビューを表示します" },
  { name: "weekly", description: "週次棚卸しを表示します" },
  {
    name: "template",
    description: "連絡テンプレを表示します",
    options: [
      {
        type: STR,
        name: "kind",
        description: "テンプレ種別",
        required: true,
        choices: [
          { name: "stalled", value: "stalled" },
          { name: "delay", value: "delay" },
          { name: "due", value: "due" },
          { name: "scope", value: "scope" },
          { name: "decision", value: "decision" },
        ],
      },
      { type: STR, name: "title", description: "対象タスク名", required: true },
    ],
  },
  {
    name: "check",
    description: "次回確認日を設定します",
    options: [
      { type: STR, name: "title", description: "対象タスク名(部分一致)", required: true },
      { type: STR, name: "datetime", description: "日時 (YYYY-MM-DD or ISO8601)", required: true },
    ],
  },
];
