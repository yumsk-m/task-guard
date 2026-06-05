import { TemplateKind } from "./types.js";

const templates: Record<TemplateKind, (taskName: string) => string> = {
  stalled: (taskName) =>
    `【${taskName}】\n本件、まだ着手できていないため、先に状況のみ共有します。\n現時点では〇日頃に着手予定です。\n優先度を上げる必要があれば調整しますので、ご指摘ください。`,
  delay: (taskName) =>
    `【${taskName}】\n本件、対応が遅れており申し訳ありません。\n現在、〇〇の理由により当初想定より時間がかかっています。\n\n〇日までに対応方針または着手見込みをご共有します。\n急ぎ度が高い場合は、優先順位を調整したいためご指摘ください。`,
  due: (taskName) =>
    `【${taskName}】\n本件、対応期限の認識を確認させてください。\n現時点では〇日頃に確認する想定ですが、希望の期限や確認タイミングがあればご教示ください。`,
  scope: (taskName) =>
    `【${taskName}】\nまずは〇〇が判断できる粒度で整理する想定です。\n詳細な調査まで行うと時間がかかるため、いったんこの粒度で進めて問題ないでしょうか。`,
  decision: (taskName) =>
    `【${taskName}】\n〇〇について確認させてください。\n\n現在、〇〇までは確認できていますが、□□の判断で迷っています。\n選択肢としてはA案/B案があり、私は〇〇の理由でA案がよいと考えています。\n\nこの方針で進めて問題ないでしょうか。`,
};

export function renderTemplate(kind: TemplateKind, taskName: string): string {
  return templates[kind](taskName);
}
