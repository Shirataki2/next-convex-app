# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Next.js 15 + Convex + Clerk + shadcn/ui を使用したプロジェクトです。

## 開発コマンド

### 基本コマンド

```bash
# 開発サーバーの起動（Turbopack使用）
yarn dev

# ビルド
yarn build

# プロダクションサーバーの起動
yarn start

# リンターの実行
yarn lint
```

### Convex開発

```bash
# Convex開発サーバーの起動（別ターミナルで実行）
npx convex dev

# Convexのデプロイ
npx convex deploy
```

## アーキテクチャ構造

### 技術スタック

- **Next.js 15.3.3**: App Router使用、React 19対応
- **Convex**: リアルタイムバックエンド、データベース、サーバーレス関数
- **Clerk**: 認証・ユーザー管理
- **shadcn/ui**: Radix UIベースのコンポーネントライブラリ
- **Tailwind CSS v4**: スタイリング
- **TypeScript**: 厳格モード有効

### ディレクトリ構造

- `app/`: Next.js App Routerのページとレイアウト
- `components/ui/`: shadcn/uiコンポーネント（自動生成）
- `convex/`: Convexバックエンド関数とスキーマ
  - `_generated/`: 自動生成ファイル（編集不可）
- `hooks/`: カスタムReactフック
- `lib/`: ユーティリティ関数

### 重要な設定

- **エイリアス**: `@/*` → プロジェクトルート
- **React**: v19（React Compilerに対応）
- **Tailwind**: v4（PostCSS設定使用）

### コーディング規約（Cursorルールより）

- 関数コンポーネントを使用
- カスタムフックでロジックを分離
- ConvexのuseQuery/useMutationを適切に使用
- エラーハンドリングを必ず実装
- 技術スタックのバージョンは変更せず、必要があれば承認を得る
- UI/UXデザインの変更は事前承認が必要

### データベーススキーマ

`convex/schema.ts`で定義されている主要なテーブル：

1. **workspaces**: ワークスペース管理

   - `name`: ワークスペース名
   - `ownerId`: オーナーのユーザーID（Clerk）
   - `members`: メンバーのユーザーID配列

2. **tasks**: タスク管理

   - `title`: タスクタイトル
   - `description`: タスク説明（オプション）
   - `status`: ステータス（todo/in_progress/done等）
   - `workspaceId`: 所属ワークスペース
   - `assigneeId`: 担当者ID（オプション）
   - `deadline`: 期限（オプション）
   - `order`: 表示順序
   - `priority`: 優先度（high/medium/low等）

3. **taskActivities**: タスクの活動履歴
   - `workspaceId`: ワークスペースID
   - `userId`: 実行ユーザーID
   - `taskId`: 対象タスクID
   - `action`: アクション種別
   - `timestamp`: タイムスタンプ

### 開発時の注意事項

- Convex開発サーバーは別ターミナルで常時起動しておく
- convex/\_generated/内のファイルは自動生成のため編集しない
- 新しいConvex関数を追加した場合は`npx convex dev`で再生成される
- ClerkとConvexの統合にはClerkのwebhookとConvexのHTTPエンドポイントを使用
- スキーマ変更時は`npx convex dev`で自動的に型定義が更新される

### Cursorルール

プロジェクトには`.cursor/rules/`ディレクトリに以下のルールファイルがあります：

1. **00_general.mdc**: 一般的な開発ルール
2. **01_application.mdc**: アプリケーション固有のルール
3. **02_Convex Rules.mdc**: Convexの使用に関する詳細なガイドライン
   - 新しい関数構文の使用方法
   - HTTPエンドポイントの定義
   - バリデーターの使用方法
   - 関数登録と呼び出しのパターン
   - ページネーション実装
   - スキーマ定義のベストプラクティス
   - TypeScriptの型定義
   - ファイルストレージの扱い方

これらのルールに従って開発を行ってください。
