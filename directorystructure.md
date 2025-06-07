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
├── app/                                      # Next.js App Router
│   ├── dashboard/
│   │   └── page.tsx                         # ダッシュボードページ
│   ├── login/
│   │   └── page.tsx                         # ログインページ
│   ├── favicon.ico                          # ファビコン
│   ├── globals.css                          # グローバルスタイル
│   ├── layout.tsx                           # ルートレイアウト
│   ├── page.tsx                             # ランディングページ
│   └── providers.tsx                        # プロバイダー設定
├── components/                              # shadcn/ui コンポーネント
│   └── ui/
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
│   └── schema.ts                           # データベーススキーマ定義
├── hooks/                                   # カスタムフック
│   └── use-mobile.ts                       # モバイル判定フック
├── lib/                                     # ユーティリティ
│   └── utils.ts                            # 共通ユーティリティ関数
├── public/                                  # 静的ファイル
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── CLAUDE.md                               # Claude Code プロジェクト設定
├── README.md                               # プロジェクト概要
├── components.json                         # shadcn/ui設定
├── directorystructure.md                   # このファイル
├── middleware.ts                           # Next.js ミドルウェア（Clerk認証）
├── next-env.d.ts                          # Next.js 型定義
├── next.config.ts                         # Next.js設定
├── package.json                           # npm設定
├── postcss.config.mjs                     # PostCSS設定
├── tsconfig.json                          # TypeScript設定
└── yarn.lock                              # 依存関係ロック
```

## 主要なディレクトリの説明

### `/app` - Next.js App Router
- **`page.tsx`**: ランディングページ（TaskFlow紹介）
- **`login/page.tsx`**: 専用ログインページ
- **`dashboard/page.tsx`**: ダッシュボード（要認証）
- **`layout.tsx`**: アプリ全体のレイアウト
- **`providers.tsx`**: ClerkProvider + ConvexProvider

### `/convex` - Convexバックエンド
- **`schema.ts`**: データベーススキーマ（workspaces, tasks, taskActivities）
- **`_generated/`**: Convexが自動生成するファイル群（編集禁止）

### `/components/ui` - shadcn/ui
- 再利用可能なUIコンポーネント群
- Radix UIベースのアクセシブルなコンポーネント

### 設定ファイル
- **`middleware.ts`**: Clerk認証ミドルウェア
- **`components.json`**: shadcn/ui設定
- **`CLAUDE.md`**: Claude Code用プロジェクト設定
- **`.cursor/rules/`**: Cursor IDE用開発ルール

## 技術スタック
- **Next.js 15.3.3**: React フレームワーク
- **Convex**: リアルタイムバックエンド・データベース
- **Clerk**: 認証・ユーザー管理
- **shadcn/ui**: UIコンポーネントライブラリ
- **Tailwind CSS v4**: スタイリング
- **TypeScript**: 型安全な開発