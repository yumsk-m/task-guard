# Task Guard

Notion DBを正本にし、Discordから登録・診断・通知・テンプレ生成を行うTask Guard Botです。

実行基盤はCloudflare Workersです。DiscordのInteractionsをHTTPで受け、定期通知はWorkers Cron Triggersで実行します。

このリポジトリはMVPとして以下を実装しています。

- `/quick`: 雑メモをInbox登録
- `/task`: 構造化タスク登録
- `/today`: 今日の要対応タスク表示
- `/review`: 終業前レビュー表示
- `/weekly`: 週次棚卸し表示
- `/template`: 連絡テンプレ生成
- `/check`: Next Check Date更新とCalendar Date反映
- 朝・終業前・週次の定期通知（任意）

## 1. アーキテクチャ

```text
Discord Slash Commands
	-> Task Guard Worker (Cloudflare Workers)
	-> Notion API
	-> Notion Tasks DB
	-> Notion Calendar (Calendar Date)
```

## 2. 前提

- Node.js 20+
- Cloudflareアカウント
- Discord Botアプリ作成済み
- Notion Integration作成済み
- 対象Notion DBにIntegration接続済み

## 3. セットアップ

```bash
npm install
cp .dev.vars.example .dev.vars
```

`.dev.vars`に値を設定してください。

```env
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_NOTIFICATION_CHANNEL_ID=
NOTION_TOKEN=
NOTION_DATABASE_ID=
```

`register:commands`用に`.env`も設定します。

```env
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_GUILD_ID=
```

## 4. Discordコマンド登録

開発中は`DISCORD_GUILD_ID`を設定してギルドコマンド登録を推奨します。

```bash
npm run register:commands
```

## 5. Worker起動

```bash
npm run dev
```

`wrangler dev`で起動後、`/interactions`エンドポイントURLをDiscord Developer PortalのInteraction Endpoint URLに設定してください。

例:

```text
https://<your-worker-subdomain>.workers.dev/interactions
```

本番ビルド:

```bash
npm run build
npm run deploy
```

## 6. Cron通知

通知時刻は`wrangler.toml`の`[triggers].crons`で管理します。

- `0 9 * * 1-5`: 朝通知
- `30 18 * * 1-5`: 終業前通知
- `0 10 * * 1`: 週次通知

Cronの文字列に応じて通知内容を切り替える実装です。変更する場合は`wrangler.toml`と`src/index.ts`の分岐を合わせて更新してください。

## 7. Notion DBプロパティ

この実装は以下のプロパティ名を前提にしています（要件md準拠）。

- `Name` (Title)
- `Status` (Select)
- `Project` (Select)
- `Type` (Select)
- `Purpose` (Text)
- `Due Date` (Date)
- `Next Check Date` (Date)
- `Calendar Date` (Date)
- `Completion Criteria` (Text)
- `Next Action` (Text)
- `Stakeholders` (Multi-select)
- `Decision Maker` (Text)
- `Share To` (Text)
- `Impact Target` (Text)
- `Risk Tags` (Multi-select)
- `Last Action Date` (Date)
- `Priority Level` (Select)
- `Priority Reason` (Text)
- `Communication Needed` (Checkbox)
- `Message Draft` (Text)
- `Raw Memo` (Text)
- `Source` (Select)

注意:

- `Project`や`Stakeholders`をRelation運用する場合、現実装では直接対応していません。
- まずは上記型でMVP運用し、Relation対応は次フェーズで追加してください。

## 8. リスク判定ロジック（実装済み）

- 期限不明: `Due Date`と`Next Check Date`が空
- 関係者不明: `Stakeholders`が空、または確認/判断/承認系で`Decision Maker`空
- 完了条件不明: `Completion Criteria`空
- 停滞候補: `Last Action Date`から2日以上
- 停滞: `Last Action Date`から7日以上
- 次アクション不明: `Next Action`空（Done/Dropped除く）
- 期限近い: 期限が2日以内

`Calendar Date`は次の優先で更新されます。

1. `Next Check Date`
2. `Due Date`
3. どちらもなければ空

## 9. Publicリポジトリ運用の注意

- `.env`と`.dev.vars`はコミットしない（`.gitignore`設定済み）
- Notion Token / Discord TokenをIssue・PR・ログに貼らない
- 業務情報は匿名化する（顧客名、個人情報、機密情報を避ける）
- 監査しやすいよう、設定値は`.env.example`のみ共有

## 10. 現在の制約

- 営業日判定は未実装（暦日判定）
- `粒度過剰`は自動化していない（手動タグ前提）
- Relationプロパティへの自動マッピングは未対応

## 11. ディレクトリ構成

```text
src/
	index.ts
	domain/
		risk.ts
		templates.ts
		types.ts
	discord/
		commands.ts
		formatters.ts
		handlers.ts
	notion/
		taskService.ts
	scripts/
		registerCommands.ts
	utils/
		date.ts
```