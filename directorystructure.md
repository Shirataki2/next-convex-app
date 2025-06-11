# ディレクトリ構成

```
/
├── .claude/
│   └── settings.local.json                    # Claude Code設定
├── .cursor/
│   ├── mcp.json                              # MCP設定
│   └── rules/
│       ├── 00_general.mdc                    # 一般的な開発ルール
│       ├── 01_application.mdc                # アプリケーション固有のルール
│       └── 02_Convex Rules.mdc              # Convex使用ガイドライン
├── __mocks__/                                # テスト用モックファイル
│   ├── fileMock.js                          # 静的ファイルモック
│   └── styleMock.js                         # CSSモック
├── __tests__/                               # テストファイル
│   ├── app/
│   │   └── page.test.tsx                    # ランディングページテスト
│   ├── components/
│   │   └── workspace/
│   │       ├── create-workspace-dialog.test.tsx # ワークスペース作成ダイアログテスト
│   │       ├── edit-task-dialog.test.tsx        # タスク編集ダイアログテスト
│   │       ├── delete-task-dialog.test.tsx      # タスク削除ダイアログテスト
│   │       ├── task-detail-dialog.test.tsx      # タスク詳細ダイアログテスト
│   │       ├── task-comments.test.tsx           # タスクコメントコンポーネントテスト
│   │       ├── invite-member-dialog.test.tsx    # メンバー招待ダイアログテスト
│   │       ├── task-drag-drop.test.tsx          # ドラッグ&ドロップテスト
│   │       └── workspace-presence.test.tsx      # プレゼンス機能テスト
│   ├── convex/
│   │   ├── tasks.test.ts                    # タスク関数テスト
│   │   ├── workspaces.test.ts               # ワークスペース関数テスト
│   │   ├── realtime-tasks.test.ts           # リアルタイム関数テスト
│   │   ├── invitations.test.ts              # 招待機能テスト
│   │   ├── presence.test.ts                 # プレゼンス機能テスト
│   │   ├── conflict-resolution.test.ts      # 競合解決機能テスト
│   │   ├── notifications.test.ts            # 通知機能テスト
│   │   └── comments.test.ts                 # コメント機能テスト
│   ├── hooks/
│   │   ├── use-realtime-tasks.test.ts       # リアルタイムタスクフックテスト
│   │   ├── use-optimistic-task-updates.test.ts # 楽観的更新フックテスト
│   │   ├── use-presence.test.ts             # プレゼンスフックテスト
│   │   ├── use-conflict-resolution.test.ts  # 競合解決フックテスト
│   │   ├── use-notifications.test.ts        # 通知フックテスト
│   │   └── task-comments.test.ts            # タスクコメントフックテスト
│   └── lib/
│       └── utils.test.ts                    # ユーティリティ関数テスト
├── app/                                      # Next.js App Router
│   ├── dashboard/
│   │   └── page.tsx                         # ダッシュボードページ
│   ├── invite/
│   │   └── [token]/
│   │       └── page.tsx                     # 招待受け入れページ
│   ├── login/
│   │   └── [[...rest]]/
│   │       └── page.tsx                     # ログインページ（Clerk対応）
│   ├── workspace/
│   │   ├── [workspaceId]/
│   │   │   ├── page.tsx                     # ワークスペース詳細ページ（リアルタイム対応）
│   │   │   ├── page-old.tsx                 # 旧版ワークスペースページ（参考）
│   │   │   └── members/
│   │   │       └── page.tsx             # メンバー管理ページ
│   │   └── page.tsx                         # ワークスペース一覧ページ
│   ├── favicon.ico                          # ファビコン
│   ├── globals.css                          # グローバルスタイル
│   ├── layout.tsx                           # ルートレイアウト
│   ├── page.tsx                             # ランディングページ
│   └── providers.tsx                        # プロバイダー設定
├── components/                              # Reactコンポーネント
│   ├── layout/                              # レイアウトコンポーネント
│   │   ├── header.tsx                       # ヘッダーコンポーネント
│   │   └── landing-header.tsx               # ランディングページヘッダー
│   ├── workspace/                           # ワークスペース関連コンポーネント
│   │   ├── task-card.tsx                    # ドラッグ可能タスクカード
│   │   ├── task-card-overlay.tsx            # ドラッグ中オーバーレイ
│   │   ├── task-column.tsx                  # カンバンカラム
│   │   ├── create-task-dialog.tsx           # タスク作成ダイアログ
│   │   ├── edit-task-dialog.tsx             # タスク編集ダイアログ
│   │   ├── delete-task-dialog.tsx           # タスク削除ダイアログ
│   │   ├── task-detail-dialog.tsx           # タスク詳細ダイアログ（ポップアップ形式）
│   │   ├── task-comments.tsx                # タスクコメント機能
│   │   ├── create-workspace-dialog.tsx     # ワークスペース作成ダイアログ
│   │   ├── invite-member-dialog.tsx         # メンバー招待ダイアログ
│   │   ├── invitation-list.tsx              # 招待一覧コンポーネント
│   │   ├── workspace-presence.tsx           # リアルタイムプレゼンス表示
│   │   ├── conflict-monitor.tsx             # 競合検出・監視コンポーネント
│   │   ├── conflict-resolution-dialog.tsx   # 競合解決ダイアログ
│   │   ├── notification-panel.tsx           # 通知パネル・アクティビティフィード
│   │   └── task-lock-indicator.tsx          # タスクロック表示
│   └── ui/                                  # shadcn/uiコンポーネント
│       ├── accordion.tsx
│       ├── alert-dialog.tsx
│       ├── alert.tsx
│       ├── aspect-ratio.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── breadcrumb.tsx
│       ├── button.tsx
│       ├── calendar.tsx
│       ├── card.tsx
│       ├── carousel.tsx
│       ├── chart.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── command.tsx
│       ├── context-menu.tsx
│       ├── dialog.tsx
│       ├── drawer.tsx
│       ├── dropdown-menu.tsx
│       ├── form.tsx
│       ├── hover-card.tsx
│       ├── input-otp.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── menubar.tsx
│       ├── navigation-menu.tsx
│       ├── pagination.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── resizable.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── slider.tsx
│       ├── sonner.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── theme-toggle.tsx                 # ダークモード切り替え
│       ├── toggle-group.tsx
│       ├── toggle.tsx
│       └── tooltip.tsx
├── convex/                                  # Convex バックエンド
│   ├── _generated/                          # 自動生成ファイル（編集不可）
│   │   ├── api.d.ts                        # API型定義
│   │   ├── api.js                          # API実装
│   │   ├── dataModel.d.ts                  # データモデル型定義
│   │   ├── server.d.ts                     # サーバー型定義
│   │   └── server.js                       # サーバー実装
│   ├── auth.config.js                      # Convex-Clerk認証設定
│   ├── schema.ts                           # データベーススキーマ定義（インデックス最適化済み）
│   ├── tasks.ts                            # タスク管理関数（リアルタイム対応）
│   ├── workspaces.ts                       # ワークスペース管理関数
│   ├── invitations.ts                      # 招待管理関数
│   ├── presence.ts                         # プレゼンス管理関数
│   ├── conflictResolution.ts               # 競合検出・解決関数
│   ├── notifications.ts                    # 通知管理関数
│   └── comments.ts                         # コメント管理関数
├── hooks/                                   # カスタムフック
│   ├── use-mobile.ts                       # モバイル判定フック
│   ├── use-realtime-tasks.ts               # リアルタイムタスクデータ管理（楽観的更新統合）
│   ├── use-optimistic-task-updates.ts      # 楽観的更新とエラー処理
│   ├── use-presence.ts                     # リアルタイムプレゼンス・タスクロック管理
│   ├── use-conflict-resolution.ts          # 競合検出・解決処理
│   └── use-notifications.ts                # 通知・アクティビティフィード管理
├── lib/                                     # ユーティリティ
│   └── utils.ts                            # 共通ユーティリティ関数
├── public/                                  # 静的ファイル
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── .prettierignore                         # Prettierが除外するファイル
├── .prettierrc                             # Prettier設定
├── CLAUDE.md                               # Claude Code プロジェクト設定
├── README.md                               # プロジェクト概要
├── components.json                         # shadcn/ui設定
├── directorystructure.md                   # このファイル
├── vitest.config.ts                        # Vitest設定
├── vitest.setup.ts                         # Vitestセットアップ
├── middleware.ts                           # Next.js ミドルウェア（Clerk認証）
├── next-env.d.ts                          # Next.js 型定義
├── next.config.ts                         # Next.js設定
├── package.json                           # npm設定
├── postcss.config.mjs                     # PostCSS設定
├── tsconfig.json                          # TypeScript設定
├── tests-e2e/                              # E2Eテスト（Playwright）
│   ├── example.spec.ts                     # サンプルE2Eテスト
│   └── workspace.spec.ts                   # ワークスペースE2Eテスト
├── .github/
│   └── workflows/                          # GitHub Actions
│       ├── ci.yml                           # CIパイプライン
│       ├── e2e.yml                         # E2Eテスト
│       └── production-deploy.yml            # 本番デプロイ
├── DEPLOYMENT.md                           # デプロイメントガイド
├── deploy-scripts.md                       # デプロイ戦略
├── playwright.config.ts                    # Playwright設定
└── yarn.lock                              # 依存関係ロック
```

## 主要なディレクトリの説明

### `/app` - Next.js App Router

- **`page.tsx`**: ランディングページ（TaskFlow紹介）
- **`login/[[...rest]]/page.tsx`**: Clerk認証ページ（catch-all route）
- **`dashboard/page.tsx`**: ダッシュボード（要認証）
- **`workspace/page.tsx`**: ワークスペース一覧ページ
- **`workspace/[workspaceId]/page.tsx`**: ワークスペース詳細ページ（リアルタイム同期対応、タスク詳細ダイアログ統合）
- **`workspace/[workspaceId]/members/page.tsx`**: メンバー管理ページ
- **`invite/[token]/page.tsx`**: 招待受け入れページ
- **`layout.tsx`**: アプリ全体のレイアウト
- **`providers.tsx`**: ClerkProvider + ConvexProvider + ThemeProvider

### `/convex` - Convexバックエンド

- **`auth.config.js`**: Convex-Clerk認証統合設定
- **`schema.ts`**: データベーススキーマ（全テーブルにインデックス最適化済み）
- **`workspaces.ts`**: ワークスペース関連のquery/mutation関数
- **`tasks.ts`**: タスク管理関連のquery/mutation関数（リアルタイム対応）
- **`invitations.ts`**: メンバー招待管理関数
- **`presence.ts`**: リアルタイムプレゼンス・タスクロック管理関数
- **`conflictResolution.ts`**: 競合検出・解決関数（ファイル名修正済み）
- **`notifications.ts`**: 通知・アクティビティフィード管理関数
- **`comments.ts`**: タスクコメント管理関数（CRUD操作、通知・アクティビティ統合）
- **`_generated/`**: Convexが自動生成するファイル群（編集禁止）

### `/components` - Reactコンポーネント

- **`ui/`**: shadcn/ui（再利用可能なUIコンポーネント群）
- **`layout/`**: レイアウト関連コンポーネント
- **`workspace/`**: ワークスペース機能コンポーネント（ドラッグ&ドロップ、招待管理、リアルタイム機能、タスク詳細・コメント機能含む）

### `/__tests__` - テストファイル

- **`convex/`**: Convex関数のユニットテスト（convex-test使用、リアルタイム・プレゼンス・競合・通知・コメント機能含む）
- **`components/`**: Reactコンポーネントテスト（React Testing Library、リアルタイム機能、タスク詳細・コメント機能含む）
- **`hooks/`**: カスタムフックテスト（リアルタイム、楽観的更新、プレゼンス、競合解決、通知、コメント機能）
- **`lib/`**: ユーティリティ関数テスト

### 設定ファイル

- **`middleware.ts`**: Clerk認証ミドルウェア
- **`components.json`**: shadcn/ui設定
- **`vitest.config.ts`**: Vitest設定（高速テスト実行）
- **`vitest.setup.ts`**: Vitest環境セットアップ
- **`.prettierrc`**: Prettierコードフォーマット設定
- **`CLAUDE.md`**: Claude Code用プロジェクト設定
- **`.cursor/rules/`**: Cursor IDE用開発ルール

## 技術スタック

- **Next.js 15.3.3**: React フレームワーク（App Router）
- **Convex**: リアルタイムバックエンド・データベース
- **Clerk**: 認証・ユーザー管理
- **shadcn/ui**: UIコンポーネントライブラリ
- **Tailwind CSS v4**: スタイリング
- **TypeScript**: 型安全な開発
- **next-themes**: ダークモード対応
- **@dnd-kit**: ドラッグ&ドロップ機能
- **Prettier**: コードフォーマッター
- **Vitest + React Testing Library**: テストフレームワーク（Jest互換・高速・プロジェクト分割）
- **convex-test**: Convex関数テスト（edge-runtime環境）
- **Playwright**: E2Eテストフレームワーク
