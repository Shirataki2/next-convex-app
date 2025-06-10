# TaskFlow

Next.js 15 + Convex + Clerk + shadcn/ui を使用したリアルタイムタスク管理アプリケーションです。

## 🚀 技術スタック

- **Next.js 15.3.3**: App Router、React 19対応
- **Convex**: リアルタイムバックエンド・データベース
- **Clerk**: 認証・ユーザー管理（日本語化対応、@clerk/backend、@clerk/localizations）
- **shadcn/ui**: UIコンポーネントライブラリ
- **Tailwind CSS v4**: スタイリング
- **TypeScript**: 型安全な開発
- **next-themes**: ダークモード対応
- **@dnd-kit**: ドラッグ&ドロップ機能
- **Prettier**: コードフォーマッター
- **Vitest + React Testing Library**: テストフレームワーク（Jest互換・高速・プロジェクト分割対応）

## 📦 開発コマンド

```bash
# 開発サーバー起動
yarn dev

# Convex開発サーバー（別ターミナル）
npx convex dev

# テスト実行（Vitest）
yarn test                        # 全テスト実行
yarn test:watch                  # 監視モード
yarn test:coverage               # カバレッジ測定
yarn test:ui                     # ブラウザUI

# プロジェクト別テスト実行
npx vitest --project=next.js     # Next.jsコンポーネント
npx vitest --project=convex      # Convex関数

# コードフォーマット
yarn format
yarn format:check

# E2Eテスト（Playwright）
yarn test:e2e                   # E2Eテスト実行
yarn test:e2e:ui                # UIモードで実行
yarn test:e2e:headed            # ブラウザ表示で実行
yarn test:e2e:debug             # デバッグモード

# ビルド・デプロイ
yarn build                      # プロダクションビルド
yarn start                      # プロダクションサーバー

# Convex本番デプロイ
npx convex deploy               # 本番環境デプロイ
npx convex deploy --cmd "yarn build"  # フロントエンド込みデプロイ
```

## 🏗️ 実装済み機能

### ✅ インフラ・環境

- [x] プロジェクトの初期構成
- [x] Next.js 15 + App Router設定
- [x] Convex バックエンドセットアップ
- [x] Clerk 認証統合
- [x] shadcn/ui コンポーネント導入
- [x] ダークモード対応（next-themes）
- [x] Prettier コードフォーマット
- [x] Vitest + React Testing Library 環境（Jest移行済み）

### ✅ 認証・UI基盤

- [x] ランディングページ
- [x] Clerk認証フロー（日本語化対応）
- [x] ログインページ（catch-all route）
- [x] ダッシュボードページ
- [x] レスポンシブヘッダーコンポーネント
- [x] ダークモード切り替えUI
- [x] Clerkユーザー情報取得・表示機能

### ✅ ワークスペース機能

- [x] データベーススキーマ設計（workspaces, tasks, taskActivities, invitations）
- [x] ワークスペース作成・管理機能
- [x] メンバー管理（追加・削除・権限制御）
- [x] **メンバー招待システム（新機能）**
  - メール招待機能
  - 招待トークン生成・管理
  - 招待受け入れページ
  - 招待取り消し機能
- [x] リアルタイムデータ同期
- [x] ワークスペース一覧ページ

### ✅ タスク管理機能

- [x] 個別ワークスペース詳細ページ
- [x] カンバンボードUI（Todo/進行中/完了）
- [x] タスク作成機能（ダイアログ形式、ユーザー選択対応）
- [x] タスクカードコンポーネント（ユーザー名・アバター表示）
- [x] 優先度・期限・担当者設定
- [x] ステータス別タスク表示
- [x] **リアルタイム同期システム（完全実装）**
  - Convex useQueryを使用したリアルタイムデータ取得
  - タスクの作成・更新・削除が即座に全ユーザーに反映
  - 楽観的更新（Optimistic Update）とリアルタイム同期の統合
  - カスタムフック（useRealtimeTasks, useOptimisticTaskUpdates）
  - データベースインデックス最適化
- [x] ドラッグ&ドロップによるタスクステータス変更（dnd-kit使用）
- [x] カンバン内でのタスク順序変更（ドラッグ&ドロップ、arrayMove使用）
- [x] ステータス別独立したorder管理で柔軟な順序変更
- [x] **リアルタイムプレゼンス機能**
  - ユーザーのオンライン状態表示
  - 編集中タスクのロック機能
  - ハートビート機能（30秒間隔の自動更新）
- [x] **競合検出・解決システム**
  - 同時編集の競合検出
  - バージョン追跡とロック機能
  - 競合解決ダイアログ（強制保存/マージ/破棄/再読み込み）
- [x] **通知・アクティビティフィード**
  - タスク関連の自動通知作成
  - ブラウザ通知機能
  - 時系列アクティビティフィード
  - 未読通知バッジ表示
- [x] タスク編集機能（ダイアログ形式、ユーザー選択対応）
- [x] タスク削除機能（確認ダイアログ付き）
- [x] 担当者選択でのユーザー名・アバター表示機能
- [x] Clerkユーザー情報統合（ID表示からユーザー名表示への改善）

### ✅ テスト環境

- [x] Vitest設定（Jest互換・高速実行・プロジェクト分割）
- [x] 基本テストスイート（100+テストケース実行中）
- [x] Reactコンポーネントテスト（React Testing Library・jsdom環境）
- [x] ユーティリティ関数テスト
- [x] Convex関数テスト（edge-runtime環境で有効化）
- [x] カスタムフックテスト（useRealtimeTasks, useOptimisticTaskUpdates）
- [x] リアルタイム機能テスト（presence, conflictResolution, notifications）
- [x] Convex認証統合テスト
- [x] モック環境構築・移行完了
- [x] Playwright E2Eテスト環境構築
- [x] GitHub Actions CI/CD（テスト自動実行）

### ✅ 本番環境・デプロイ

- [x] Convex本番デプロイ環境構築
- [x] GitHub Actions CI/CD（本番自動デプロイ）
- [x] 環境変数管理設定
- [x] Playwright E2E本番テスト環境
- [x] デプロイメントドキュメント整備

## 🚧 今後の拡張予定

### 🔄 タスク管理機能拡張

- [ ] タスク詳細ビュー・モーダル
- [ ] サブタスク機能
- [ ] タスクテンプレート機能
- [ ] タスクの一括操作（複数選択・削除など）
- [ ] カスタムステータス・優先度設定
- [ ] タスクのコメント・ファイル添付機能

### 🔄 コラボレーション機能拡張

- [ ] メンション機能（@ユーザー名）
- [ ] タスクコメント・ディスカッション
- [ ] ワークスペース内チャット機能
- [ ] リアルタイム編集の視覚的フィードバック強化
- [ ] プッシュ通知のカスタマイズ設定

### 🔄 分析・レポート

- [ ] タスク完了率ダッシュボード
- [ ] チームパフォーマンス分析
- [ ] 時間追跡機能
- [ ] プロジェクト進捗レポート

### 🔄 運用・最適化

- [ ] パフォーマンス監視
- [ ] エラートラッキング
- [ ] キャッシュ最適化
- [ ] SEO対応

## 🧪 UI動作確認（Playwright MCP）

新しいUI機能を追加した際は、Playwright MCPを使用して動作確認を行います：

### 使用方法

```bash
# 開発サーバー起動
yarn dev
npx convex dev  # 別ターミナル

# Playwright MCPでの動作確認例
mcp__playwright__browser_navigate  # localhost:3000にアクセス
mcp__playwright__browser_snapshot  # ページ構造確認
mcp__playwright__browser_click     # UI要素クリック
mcp__playwright__browser_type      # フォーム入力
mcp__playwright__browser_take_screenshot  # スクリーンショット取得
```

### 確認項目

- UIコンポーネントの表示
- インタラクティブ要素の動作
- レスポンシブデザイン
- エラー状態の表示
- アクセシビリティ

## 📁 プロジェクト構造

```
/
├── __tests__/          # ユニットテスト
├── tests-e2e/         # E2Eテスト（Playwright）
├── .github/workflows/ # CI/CDパイプライン
├── app/               # Next.js App Router
│   ├── workspace/     # ワークスペース管理
│   ├── dashboard/     # ダッシュボード
│   └── login/         # 認証ページ
├── components/        # Reactコンポーネント
│   ├── ui/            # shadcn/ui
│   ├── layout/        # レイアウト
│   └── workspace/     # ワークスペース関連
├── convex/           # Convexバックエンド
│   ├── workspaces.ts # ワークスペース関数
│   ├── tasks.ts      # タスク管理関数
│   └── schema.ts     # DBスキーマ
├── lib/              # ユーティリティ
├── DEPLOYMENT.md     # デプロイメントガイド
├── deploy-scripts.md # デプロイ戦略
└── playwright.config.ts # E2E設定
```

## 🎯 次のステップ

**✅ リアルタイム機能は完全に実装済み**です。以下は今後の拡張予定：

1. **タスク管理機能拡張** - タスク詳細ビュー、サブタスク機能、コメント機能
2. **コラボレーション強化** - メンション機能、チャット、視覚的フィードバック
3. **分析ダッシュボード** - パフォーマンス・進捗レポート・時間追跡
4. **本番運用最適化** - 監視・エラートラッキング・パフォーマンス向上・SEO対応

## 🏆 現在の完成度

- **基本機能**: 100% 完成
- **リアルタイム同期**: 100% 完成
- **認証・ユーザー管理**: 100% 完成
- **ドラッグ&ドロップ**: 100% 完成
- **プレゼンス機能**: 100% 完成
- **競合解決**: 100% 完成
- **通知システム**: 100% 完成
- **テスト環境**: 100% 完成

## 📚 ドキュメント

- [CLAUDE.md](./CLAUDE.md) - 開発ガイド・技術仕様
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 本番環境デプロイメントガイド
- [deploy-scripts.md](./deploy-scripts.md) - デプロイメント戦略

---

詳細な開発ガイドは [CLAUDE.md](./CLAUDE.md) をご確認ください。
