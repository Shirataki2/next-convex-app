# TaskFlow

Next.js 15 + Convex + Clerk + shadcn/ui を使用したリアルタイムタスク管理アプリケーションです。

## 🚀 技術スタック

- **Next.js 15.3.3**: App Router、React 19対応
- **Convex**: リアルタイムバックエンド・データベース
- **Clerk**: 認証・ユーザー管理
- **shadcn/ui**: UIコンポーネントライブラリ
- **Tailwind CSS v4**: スタイリング
- **TypeScript**: 型安全な開発
- **next-themes**: ダークモード対応
- **Prettier**: コードフォーマッター
- **Jest + React Testing Library**: テストフレームワーク

## 📦 開発コマンド

```bash
# 開発サーバー起動
yarn dev

# Convex開発サーバー（別ターミナル）
npx convex dev

# テスト実行
yarn test
yarn test:watch     # 監視モード
yarn test:coverage  # カバレッジ測定

# コードフォーマット
yarn format
yarn format:check

# ビルド・デプロイ
yarn build
yarn start
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
- [x] Jest + React Testing Library 環境

### ✅ 認証・UI基盤

- [x] ランディングページ
- [x] Clerk認証フロー
- [x] ログインページ（catch-all route）
- [x] ダッシュボードページ
- [x] レスポンシブヘッダーコンポーネント
- [x] ダークモード切り替えUI

### ✅ ワークスペース機能

- [x] データベーススキーマ設計（workspaces, tasks, taskActivities）
- [x] ワークスペース作成・管理機能
- [x] メンバー管理（追加・削除・権限制御）
- [x] リアルタイムデータ同期
- [x] ワークスペース一覧ページ

### ✅ テスト環境

- [x] Jest設定（Next.js統合）
- [x] Convex関数ユニットテスト（31テストケース）
- [x] Reactコンポーネントテスト
- [x] ユーティリティ関数テスト
- [x] モック環境構築

## 🚧 開発中・予定機能

### 🔄 タスク管理機能

- [ ] 個別ワークスペース詳細ページ
- [ ] カンバンボードUI
- [ ] タスク作成・編集・削除UI
- [ ] ドラッグ&ドロップでのタスク移動
- [ ] タスクステータス管理
- [ ] 優先度・期限設定

### 🔄 協力機能

- [ ] リアルタイムコラボレーション
- [ ] アクティビティフィード
- [ ] メンバー招待システム
- [ ] 通知機能

### 🔄 テスト・品質

- [ ] E2Eテスト（Playwright）
- [ ] より高いテストカバレッジ
- [ ] パフォーマンステスト

### 🔄 デプロイ・運用

- [ ] Vercel デプロイ設定
- [ ] Convex 本番環境
- [ ] CI/CD パイプライン
- [ ] 監視・ログ設定

## 📁 プロジェクト構造

```
/
├── __tests__/          # テストファイル
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
└── lib/              # ユーティリティ
```

## 🎯 次のステップ

1. **カンバンボードUI実装** - タスクの可視化とドラッグ&ドロップ
2. **リアルタイム機能強化** - 同時編集・通知システム
3. **テストカバレッジ向上** - E2Eテスト追加
4. **本番デプロイ** - Vercel + Convex環境構築

---

詳細な開発ガイドは [CLAUDE.md](./CLAUDE.md) をご確認ください。
