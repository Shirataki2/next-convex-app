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
- **@dnd-kit**: ドラッグ&ドロップ機能（core, sortable, utilities）

### ディレクトリ構造

- `app/`: Next.js App Routerのページとレイアウト
  - `workspace/`: ワークスペース管理ページ
  - `dashboard/`: ダッシュボードページ
  - `login/`: 認証ページ
- `components/`: Reactコンポーネント
  - `ui/`: shadcn/uiコンポーネント（自動生成）
  - `layout/`: レイアウトコンポーネント
  - `workspace/`: ワークスペース関連コンポーネント
    - `task-card.tsx`: ドラッグ可能なタスクカード
    - `task-card-overlay.tsx`: ドラッグ中のオーバーレイ表示
    - `task-column.tsx`: ドロップ可能なカンバンカラム
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

### UI動作確認

新しいUI機能を追加した場合は、必ずPlaywright MCPを使用して動作確認を行ってください：

```bash
# Playwright MCPを使用してブラウザを操作
# localhost:3000にアクセスして動作確認
mcp__playwright__browser_navigate
mcp__playwright__browser_snapshot
mcp__playwright__browser_take_screenshot
```

#### 動作確認手順

1. **開発サーバーの起動**

   ```bash
   yarn dev
   npx convex dev  # 別ターミナル
   ```

2. **Playwright MCPでブラウザ操作**

   - `mcp__playwright__browser_navigate`で対象ページにアクセス
   - `mcp__playwright__browser_snapshot`でページ構造を確認
   - `mcp__playwright__browser_click`でUI要素をクリック
   - `mcp__playwright__browser_type`でフォーム入力をテスト
   - `mcp__playwright__browser_take_screenshot`でスクリーンショット取得

3. **確認項目**
   - UIコンポーネントの表示が正しいか
   - インタラクティブな要素が期待通り動作するか
   - レスポンシブデザインが適切か
   - エラー状態の表示が正しいか
   - アクセシビリティが保たれているか

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

### ドラッグ&ドロップ機能

#### 概要

@dnd-kitライブラリを使用して、カンバンボード上でタスクをドラッグ&ドロップできる機能を実装しています。

#### 主要コンポーネント

1. **DndContext**: ドラッグ&ドロップの環境を提供

   - マウス・タッチセンサーの設定
   - 衝突検出（closestCenter）
   - ドラッグ開始・終了・キャンセルイベントの処理

2. **TaskCard（useSortable）**: ドラッグ可能なタスクカード

   - ドラッグハンドル（GripVertical アイコン）
   - ドラッグ中の視覚的フィードバック（透明度変更）
   - データ属性：`{ type: 'task', status, taskId }`

3. **TaskColumn（useDroppable）**: ドロップ可能なカラム

   - SortableContextでソート機能を提供
   - ドロップ時の視覚的フィードバック（背景色変更）
   - データ属性：`{ type: 'column', status }`

4. **TaskCardOverlay**: ドラッグ中のオーバーレイ表示
   - DragOverlayで元カードとは独立して表示
   - ドラッグ中にタスクが見えなくなることを防止

#### ドロップ先判別ロジック

```javascript
if (over.data?.current?.type === "column") {
  // カラムにドロップ
  newStatus = over.data.current.status;
} else if (over.data?.current?.type === "task") {
  // タスクカードにドロップ（同じカラム内）
  newStatus = over.data.current.status;
}
```

#### 実装上の注意点

- 同じステータスへのドロップは無視（将来的に順序変更機能を実装予定）
- データ属性を使用してドロップ先を明確に識別
- リアルタイムでConvexデータベースに反映
- エラーハンドリングと詳細なデバッグログを実装

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
- UI機能を追加・変更した場合は、Playwright MCPを使用して必ず動作確認を実施
- Playwright MCPでの動作確認時は、開発サーバーが起動していることを確認

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
