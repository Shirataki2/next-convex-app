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

# コードフォーマット
yarn format

# フォーマットチェック
yarn format:check
```

### Convex開発

```bash
# Convex開発サーバーの起動（別ターミナルで実行）
npx convex dev

# Convexのデプロイ
npx convex deploy
```

### テスト

```bash
# テスト実行（全プロジェクト）
yarn test

# テスト監視モード
yarn test:watch

# カバレッジ測定
yarn test:coverage

# テストUI（ブラウザ）
yarn test:ui

# 特定プロジェクトのテスト実行
npx vitest --project=next.js    # Next.jsコンポーネント
npx vitest --project=convex     # Convex関数
```

## アーキテクチャ構造

### 技術スタック

- **Next.js 15.3.3**: App Router使用、React 19対応
- **Convex**: リアルタイムバックエンド、データベース、サーバーレス関数
- **Clerk**: 認証・ユーザー管理
- **shadcn/ui**: Radix UIベースのコンポーネントライブラリ
- **Tailwind CSS v4**: スタイリング
- **TypeScript**: 厳格モード有効
- **next-themes**: ダークモード対応
- **Prettier**: コードフォーマッター
- **Vitest + React Testing Library**: テストフレームワーク（プロジェクト分割設定）
- **convex-test**: Convex関数テスト（edge-runtime環境で動作）

### ディレクトリ構造

- `app/`: Next.js App Routerのページとレイアウト
  - `workspace/`: ワークスペース管理ページ
  - `dashboard/`: ダッシュボードページ
  - `login/`: 認証ページ
- `components/`: Reactコンポーネント
  - `ui/`: shadcn/uiコンポーネント（自動生成）
  - `layout/`: レイアウトコンポーネント
  - `workspace/`: ワークスペース関連コンポーネント
- `convex/`: Convexバックエンド関数とスキーマ
  - `_generated/`: 自動生成ファイル（編集不可）
  - `workspaces.ts`: ワークスペース管理関数
  - `tasks.ts`: タスク管理関数
- `hooks/`: カスタムReactフック
- `lib/`: ユーティリティ関数
- `__tests__/`: テストファイル
  - `convex/`: Convex関数テスト
  - `components/`: コンポーネントテスト
  - `lib/`: ユーティリティテスト
- `__mocks__/`: モックファイル

### 重要な設定

- **エイリアス**: `@/*` → プロジェクトルート
- **React**: v19（React Compilerに対応）
- **Tailwind**: v4（PostCSS設定使用）
- **テスト環境**: Vitest + プロジェクト分割（Next.js: jsdom環境、Convex: edge-runtime環境）
- **コードフォーマット**: Prettier（.prettierrc設定済み）
- **ダークモード**: next-themes + システム設定対応

### コーディング規約

- 関数コンポーネントを使用
- カスタムフックでロジックを分離
- ConvexのuseQuery/useMutationを適切に使用
- エラーハンドリングを必ず実装
- 技術スタックのバージョンは変更せず、必要があれば承認を得る
- UI/UXデザインの変更は事前承認が必要
- 新機能実装時は必ずユニットテストを作成
- Prettierでコードフォーマットを統一
- TypeScript厳格モードを遵守

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

### テスト環境の詳細

#### プロジェクト分割設定

Vitestはプロジェクト分割設定を使用し、異なる環境で実行されます：

1. **Next.jsプロジェクト**（`jsdom`環境）

   - Reactコンポーネントテスト
   - フックテスト
   - ユーティリティ関数テスト
   - 対象: `__tests__/app/`, `__tests__/components/`, `__tests__/lib/`, `__tests__/hooks/`

2. **Convexプロジェクト**（`edge-runtime`環境）
   - Convex関数テスト
   - スキーマ検証テスト
   - 対象: `__tests__/convex/`
   - 依存関係: `@edge-runtime/vm`, `convex-test`

#### テスト実行コマンド

```bash
# 全テスト実行
yarn test

# 特定プロジェクトのみ
npx vitest --project=next.js
npx vitest --project=convex

# 監視モード（特定プロジェクト）
npx vitest --project=next.js --watch
```

### 開発時の注意事項

- Convex開発サーバーは別ターミナルで常時起動しておく
- convex/\_generated/内のファイルは自動生成のため編集しない
- 新しいConvex関数を追加した場合は`npx convex dev`で再生成される
- ClerkとConvexの統合にはClerkのwebhookとConvexのHTTPエンドポイントを使用
- スキーマ変更時は`npx convex dev`で自動的に型定義が更新される
- テスト実行前にはコードフォーマットを実行（`yarn format`）
- 新機能のプルリクエスト前にテストが全て通ることを確認
- Convexテストは`edge-runtime`環境で実行されるため、Node.js固有のAPIは使用不可

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
