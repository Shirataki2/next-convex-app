# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: 最新のアップデート（2025年6月）

### ✅ 完了した主要機能

**リアルタイム同期システムの完全実装:**

- ☑️ Convex統合とClerk認証の修正
- ☑️ ファイル名規約の修正（conflict-resolution.ts → conflictResolution.ts）
- ☑️ データベースインデックスの最適化
- ☑️ ドラッグ&ドロップ機能のバグ修正
- ☑️ 楽観的更新（Optimistic Update）とリアルタイム同期の統合
- ☑️ リアルタイムプレゼンス機能
- ☑️ 競合検出・解決システム
- ☑️ 通知・アクティビティフィード
- ☑️ タスク詳細ダイアログとコメント機能
- ☑️ 包括的なテスト環境の構築

**技術的修正:**

- Convex-Clerk認証統合の修正（auth.config.js作成、ConvexProviderWithClerk導入）
- taskActivitiesテーブルのインデックス追加
- 全テーブルへの適切なインデックス設定
- 楽観的更新とリアルタイムデータの競合解決

**現在の状態:** 全ての主要機能が動作し、包括的なリアルタイム同期システムが完成しています。

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
  - **@clerk/nextjs**: Next.js統合
  - **@clerk/backend**: サーバーサイドユーザー情報取得
  - **@clerk/localizations**: 日本語化サポート（jaJP）
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
    - `[workspaceId]/`: ワークスペース詳細ページ（リアルタイム同期対応）
    - `[workspaceId]/members/`: メンバー管理ページ
  - `dashboard/`: ダッシュボードページ
  - `login/`: 認証ページ
  - `invite/[token]/`: 招待受け入れページ
- `components/`: Reactコンポーネント
  - `ui/`: shadcn/uiコンポーネント（自動生成）
  - `layout/`: レイアウトコンポーネント
  - `workspace/`: ワークスペース関連コンポーネント
    - `task-card.tsx`: ドラッグ可能なタスクカード（ユーザー情報表示対応、詳細ダイアログクリック対応）
    - `task-card-overlay.tsx`: ドラッグ中のオーバーレイ表示
    - `task-column.tsx`: ドロップ可能なカンバンカラム
    - `task-detail-dialog.tsx`: タスク詳細ダイアログ（ポップアップ形式、コメント機能付き）
    - `task-comments.tsx`: タスクコメント一覧・投稿コンポーネント（編集・削除機能付き）
    - `create-task-dialog.tsx`: タスク作成ダイアログ（ユーザー選択対応）
    - `edit-task-dialog.tsx`: タスク編集ダイアログ（ユーザー選択対応）
    - `delete-task-dialog.tsx`: タスク削除確認ダイアログ
    - `create-workspace-dialog.tsx`: ワークスペース作成ダイアログ
    - `invite-member-dialog.tsx`: メンバー招待ダイアログ
    - `invitation-list.tsx`: 招待一覧コンポーネント
    - `workspace-presence.tsx`: リアルタイムプレゼンス表示
    - `conflict-monitor.tsx`: 競合検出・解決監視コンポーネント
    - `conflict-resolution-dialog.tsx`: 競合解決ダイアログ
    - `notification-panel.tsx`: 通知パネル・アクティビティフィード（コメント通知対応）
- `convex/`: Convexバックエンド関数とスキーマ
  - `_generated/`: 自動生成ファイル（編集不可）
  - `workspaces.ts`: ワークスペース管理関数
  - `tasks.ts`: タスク管理関数
    - `getWorkspaceTasks`: ワークスペースのタスク一覧取得
    - `getWorkspaceTasksWithUsers`: ユーザー情報付きタスク一覧取得
    - `getWorkspaceTasksRealtime`: リアルタイムタスク一覧取得
    - `getWorkspaceMembersRealtime`: リアルタイムメンバー一覧取得
    - `getWorkspaceMembers`: ワークスペースメンバーのClerkユーザー情報取得
    - `createTask`, `updateTask`, `deleteTask`: タスクCRUD操作
    - `getWorkspaceActivities`: タスクアクティビティ履歴取得
  - `invitations.ts`: 招待管理関数
    - `createInvitation`: 招待作成
    - `acceptInvitation`: 招待受け入れ
    - `revokeInvitation`: 招待取り消し
    - `getInviterInfo`: 招待者情報取得
  - `presence.ts`: プレゼンス管理関数
    - `updatePresence`: ユーザープレゼンス更新
    - `setTaskLock`: タスクロック設定/解除
    - `getWorkspacePresence`: ワークスペースのプレゼンス情報取得
  - `conflictResolution.ts`: 競合検出・解決関数（※ファイル名をConvex規約に合わせて修正済み）
    - `checkForConflicts`: 競合検出
    - `resolveConflict`: 競合解決
    - `updateTaskWithConflictCheck`: 競合チェック付きタスク更新
    - `getConflictsWithUserInfo`: ユーザー情報付き競合一覧取得
  - `notifications.ts`: 通知管理関数
    - `createNotification`: 通知作成
    - `createTaskNotification`: タスク関連通知の自動作成
    - `getNotificationsWithUserInfo`: ユーザー情報付き通知取得
  - `comments.ts`: コメント管理関数
    - `createComment`: コメント作成（アクティビティ・通知自動作成）
    - `getTaskComments`: ユーザー情報付きコメント一覧取得
    - `updateComment`: コメント編集
    - `deleteComment`: コメント削除
    - `getCommentCount`: コメント数取得
- `hooks/`: カスタムReactフック
  - `use-realtime-tasks.ts`: リアルタイムタスクデータ管理
  - `use-optimistic-task-updates.ts`: 楽観的更新とエラー処理
  - `use-mobile.ts`: モバイル判定フック
  - `use-presence.ts`: リアルタイムプレゼンス・タスクロック管理
  - `use-conflict-resolution.ts`: 競合検出・解決処理
  - `use-notifications.ts`: 通知・アクティビティフィード管理
- `lib/`: ユーティリティ関数
- `__tests__/`: テストファイル
  - `convex/`: Convex関数テスト
    - `realtime-tasks.test.ts`: リアルタイム関数テスト
    - `invitations.test.ts`: 招待機能テスト
    - `presence.test.ts`: プレゼンス機能テスト
    - `conflictResolution.test.ts`: 競合解決機能テスト
    - `notifications.test.ts`: 通知機能テスト
  - `components/`: コンポーネントテスト
  - `hooks/`: カスタムフックテスト
  - `lib/`: ユーティリティテスト
- `__mocks__/`: モックファイル
- `tests-e2e/`: E2Eテスト（Playwright）
- `.github/workflows/`: CI/CDパイプライン

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

`convex/schema.ts`で定義されている主要なテーブル（全テーブルに最適化されたインデックスを追加済み）：

1. **workspaces**: ワークスペース管理

   - `name`: ワークスペース名
   - `ownerId`: オーナーのユーザーID（Clerk）
   - `members`: メンバーのユーザーID配列
   - **インデックス**: `by_owner`, `search_name`（全文検索）

2. **tasks**: タスク管理

   - `title`: タスクタイトル
   - `description`: タスク説明（オプション）
   - `status`: ステータス（todo/in_progress/done等）
   - `workspaceId`: 所属ワークスペース
   - `assigneeId`: 担当者ID（オプション）
   - `deadline`: 期限（オプション）
   - `order`: ステータス内での表示順序（ステータス別独立管理）
   - `priority`: 優先度（high/medium/low等）
   - **インデックス**: `by_workspace`, `by_workspace_status`, `by_workspace_status_order`, `by_assignee`, `by_status`, `by_priority`, `by_deadline`, `search_title`（全文検索）

3. **taskActivities**: タスクの活動履歴

   - `workspaceId`: ワークスペースID
   - `userId`: 実行ユーザーID
   - `taskId`: 対象タスクID
   - `action`: アクション種別
   - `timestamp`: タイムスタンプ
   - **インデックス**: `by_workspace`, `by_task`, `by_user`, `by_timestamp`

4. **workspaceInvitations**: ワークスペース招待

   - `workspaceId`: ワークスペースID
   - `email`: 招待先メールアドレス
   - `role`: 役割（member/admin）
   - `inviterUserId`: 招待者のユーザーID
   - `token`: 招待トークン
   - `status`: ステータス（pending/accepted/revoked/expired）
   - `createdAt`, `expiresAt`: 作成・有効期限
   - **インデックス**: `by_workspace`, `by_email`, `by_token`, `by_status`

5. **userPresence**: ユーザープレゼンス情報

   - `userId`: ユーザーID
   - `workspaceId`: ワークスペースID
   - `status`: ステータス（online/offline/away）
   - `lastSeen`: 最終確認時刻
   - `currentPage`: 現在のページ（オプション）
   - `isEditing`: 編集中のタスクID（オプション）
   - **インデックス**: `by_workspace`, `by_user`, `by_workspace_user`, `by_last_seen`

6. **taskLocks**: タスク編集ロック情報

   - `taskId`: タスクID
   - `userId`: ロックしているユーザーID
   - `workspaceId`: ワークスペースID
   - `lockedAt`: ロック開始時刻
   - `lockType`: ロック種別（editing/viewing）
   - **インデックス**: `by_task`, `by_user`, `by_workspace`, `by_locked_at`

7. **taskConflicts**: タスク競合情報

   - `conflictId`: 競合ID
   - `taskId`: タスクID
   - `workspaceId`: ワークスペースID
   - `conflictType`: 競合種別（simultaneous_edit/stale_data/permission_denied）
   - `initiatingUserId`, `conflictingUserId`: 競合に関わるユーザーID
   - `timestamp`: 競合検出時刻
   - `isResolved`: 解決済みフラグ
   - `resolution`: 解決方法（オプション）
   - `initiatingVersion`, `conflictingVersion`: バージョン情報
   - `metadata`: メタデータ（オプション）
   - **インデックス**: `by_task`, `by_workspace`, `by_conflict_id`, `by_timestamp`, `by_resolved`

8. **notifications**: 通知情報
   - `workspaceId`: ワークスペースID
   - `targetUserId`: 通知対象ユーザーID
   - `senderUserId`: 送信者ユーザーID
   - `type`: 通知タイプ（task_created/task_updated/task_assigned/task_completed/comment_added/user_joined）
   - `title`: 通知タイトル
   - `message`: 通知メッセージ
   - `priority`: 優先度（low/medium/high/urgent）
   - `relatedTaskId`: 関連タスクID（オプション）
   - `relatedUserId`: 関連ユーザーID（オプション）
   - `metadata`: メタデータ（オプション）
   - `isRead`: 既読フラグ
   - `createdAt`: 作成時刻
   - **インデックス**: `by_target_user`, `by_workspace`, `by_created_at`, `by_unread`, `by_type`

9. **taskComments**: タスクコメント情報
   - `taskId`: タスクID
   - `workspaceId`: ワークスペースID
   - `userId`: コメント投稿者ID
   - `content`: コメント内容
   - `createdAt`: 作成時刻
   - `updatedAt`: 更新時刻
   - `isEdited`: 編集済みフラグ
   - **インデックス**: `by_task`, `by_workspace`, `by_user`, `by_created_at`, `by_task_created`

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

#### 順序変更機能の実装詳細

**同一ステータス内の順序変更:**

- タスクを同じカラム内の別のタスクの上にドロップして順序変更
- `@dnd-kit/sortable`の`arrayMove`を使用した滑らかなアニメーション
- 楽観的更新で即座にUIに反映

**異なるステータス間の移動:**

- 移動先ステータスの末尾に配置（最大order値+1）
- ステータス変更と同時に適切なorder値を自動設定

**ステータス別order管理:**

- 各ステータス（todo/in_progress/done）で独立したorder値
- 新規タスク作成時は該当ステータス内の最大order+1を設定
- 順序変更時は該当ステータス内のタスクのみ影響

#### 実装上の注意点

- データ属性を使用してドロップ先を明確に識別
- 楽観的更新（Optimistic Update）でスムーズなUX実現
- リアルタイムでConvexデータベースに反映
- エラーハンドリングと詳細なデバッグログを実装
- 最小限のバックエンド更新で効率的な同期

### リアルタイム同期機能

#### 概要

ConvexのuseQueryフックを使用して、タスクの変更がリアルタイムで全ユーザーに同期される機能を実装しています。

#### 主要コンポーネント

1. **useRealtimeTasks**: リアルタイムタスクデータ管理

   - Convex useQueryでタスクとメンバー情報を取得
   - ユーザー情報のキャッシュ機能
   - ステータス別のタスクグループ化
   - 統計情報の自動計算

2. **useOptimisticTaskUpdates**: 楽観的更新とエラー処理
   - タスクステータス・順序・内容の更新
   - バッチ更新サポート
   - エラーハンドリングとロールバック
   - ローディング状態管理

#### リアルタイムデータフロー

```javascript
// リアルタイムタスク取得
const tasks = useQuery(api.tasks.getWorkspaceTasksRealtime, { workspaceId });

// メンバー情報取得
const members = useQuery(api.tasks.getWorkspaceMembersRealtime, {
  workspaceId,
});

// ユーザー情報統合
const tasksWithUsers = tasks.map((task) => ({
  ...task,
  assigneeUser: userCache.get(task.assigneeId),
}));
```

#### 楽観的更新（Optimistic Update）

ドラッグ&ドロップ操作やタスク編集では、ユーザー体験向上のため楽観的更新を実装：

##### ステータス変更時

```javascript
// 1. 新しいステータスの最大orderを計算
const newStatusTasks = tasks.filter((task) => task.status === newStatus);
const maxOrder = Math.max(...newStatusTasks.map((task) => task.order), 0);

// 2. 即座にローカル状態を更新
const updatedTasks = tasks.map((task) =>
  task._id === taskId
    ? { ...task, status: newStatus, order: maxOrder + 1 }
    : task
);
setTasks(updatedTasks);

// 3. バックエンド更新（非同期）
try {
  await updateTask({
    taskId,
    updates: { status: newStatus, order: maxOrder + 1 },
    userId,
  });
  await fetchTasksWithUsers(); // 最新データと同期
} catch (error) {
  setTasks(originalTasks); // エラー時はロールバック
  alert("タスクの更新に失敗しました。再試行してください。");
}
```

##### 同一ステータス内順序変更時

```javascript
// 1. arrayMoveで順序変更
const sortedStatusTasks = arrayMove(statusTasks, oldIndex, newIndex);

// 2. 順序を再計算
const updatedStatusTasks = sortedStatusTasks.map((task, index) => ({
  ...task,
  order: index + 1,
}));

// 3. 他のステータスのタスクと結合してローカル状態更新
const allUpdatedTasks = [...otherTasks, ...updatedStatusTasks];
setTasks(allUpdatedTasks);

// 4. 変更されたタスクのみバックエンド更新
const tasksToUpdate = updatedStatusTasks.filter((task, index) => {
  const originalTask = statusTasks[index];
  return originalTask && originalTask.order !== task.order;
});

await Promise.all(
  tasksToUpdate.map((task) =>
    updateTask({ taskId: task._id, updates: { order: task.order }, userId })
  )
);
```

**利点:**

- ドラッグ終了と同時にUIが更新される
- ネットワーク待機時間によるUX悪化を防止
- エラー時は自動でロールバック処理
- 同一ステータス内での直感的な順序変更
- ステータス別の独立したorder管理で柔軟性向上

### Clerk統合とユーザー情報表示

#### 日本語化対応

Clerkの認証UIは日本語化されています：

```tsx
// app/providers.tsx
import { jaJP } from "@clerk/localizations";

export function Providers({ children }: { children: ReactNode }) {
  return <ClerkProvider localization={jaJP}>{/* ... */}</ClerkProvider>;
}
```

#### ユーザー情報表示機能

タスクカードや担当者選択で、ClerkユーザーIDではなく実際のユーザー名・アバターを表示：

##### 1. サーバーサイドユーザー情報取得

```typescript
// convex/tasks.ts
export const getWorkspaceMembers = action({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }): Promise<WorkspaceMemberInfo[]> => {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const members = await Promise.all(
      allMemberIds.map(async (memberId) => {
        const user = await clerk.users.getUser(memberId);
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          username: user.username,
          emailAddress: user.emailAddresses?.[0]?.emailAddress,
        };
      })
    );

    return members;
  },
});
```

##### 2. UI表示

- **TaskCard**: 担当者のアバターと名前を表示
- **CreateTaskDialog/EditTaskDialog**: 担当者選択時にユーザー名とアバター表示
- **フォールバック**: ユーザー情報取得失敗時はIDを表示

##### 3. ユーザー名表示ロジック

```typescript
const getUserDisplayName = (member: WorkspaceMember) => {
  if (member.firstName && member.lastName) {
    return `${member.firstName} ${member.lastName}`;
  }
  return member.username || member.emailAddress || "Unknown User";
};
```

**特徴:**

- Clerkのプロフィール情報（名前、アバター、ユーザー名）を活用
- サーバーサイドで情報を取得してセキュリティを確保
- エラー時の適切なフォールバック処理
- ローディング状態の表示とUX向上

### リアルタイムプレゼンス機能

#### 概要

ワークスペース内のユーザーのオンライン状態や編集中のタスクをリアルタイムで表示する機能です。

#### 主要機能

1. **ユーザープレゼンス表示**

   - オンライン/オフライン/離席状態の表示
   - 現在閲覧中のページ情報
   - アバターとステータスアイコンの表示

2. **タスクロック機能**

   - タスク編集時の自動ロック
   - 他ユーザーによる編集中表示
   - ロック解除の自動処理

3. **ハートビート機能**
   - 定期的なプレゼンス更新（30秒間隔）
   - ページ非表示時の自動離席状態設定
   - ページ離脱時の自動クリーンアップ

#### 実装詳細

```typescript
// プレゼンス更新
const updatePresence = useMutation(api.presence.updatePresence);

// ハートビート処理
useEffect(() => {
  const interval = setInterval(() => {
    updatePresence({
      workspaceId,
      status: document.hidden ? "away" : "online",
      currentPage: location.pathname,
    });
  }, 30000);

  return () => clearInterval(interval);
}, [workspaceId, updatePresence]);
```

### 競合検出・解決機能

#### 概要

複数ユーザーが同じタスクを同時編集する際の競合を検出し、適切な解決方法を提供する機能です。

#### 競合検出方式

1. **バージョン追跡**

   - タスクの更新時刻を使用したバージョン管理
   - 楽観的ロッキングによる競合検出

2. **リアルタイム監視**
   - 定期的な競合チェック（15秒間隔）
   - タスク更新時の自動競合検出

#### 競合解決オプション

1. **強制保存**: 自分の変更を優先して保存
2. **マージ**: 両方の変更を統合
3. **破棄**: 自分の変更を破棄
4. **再読み込み**: 最新データで画面を更新

#### 実装例

```typescript
const checkForConflicts = useMutation(api.conflictResolution.checkForConflicts);

const handleTaskUpdate = async (taskId: Id<"tasks">, updates: any) => {
  const conflicts = await checkForConflicts({ taskId });

  if (conflicts.length > 0) {
    setConflictDialogOpen(true);
    setActiveConflicts(conflicts);
  } else {
    await updateTask({ taskId, updates });
  }
};
```

### 通知・アクティビティフィード機能

#### 概要

ワークスペース内のタスク関連活動を自動で通知し、アクティビティフィードとして表示する機能です。

#### 通知機能

1. **自動通知作成**

   - タスク作成・更新・完了時の自動通知
   - 担当者変更時の専用通知
   - ワークスペースメンバー参加通知

2. **通知タイプ**

   - `task_created`: タスク作成
   - `task_updated`: タスク更新
   - `task_assigned`: タスク割り当て
   - `task_completed`: タスク完了
   - `comment_added`: コメント追加
   - `user_joined`: メンバー参加

3. **優先度管理**
   - low/medium/high/urgent の4段階
   - 優先度に応じた色分け表示

#### ブラウザ通知

- Web Notifications APIを使用
- 許可申請とプライバシー配慮
- 新しい通知の自動表示

#### アクティビティフィード

- 時系列でのタスク活動表示
- ユーザーアバター・名前付き表示
- 相対時間表示（「3分前」「1時間前」等）

#### UI実装

```typescript
// 通知パネル
<NotificationPanel workspaceId={workspaceId} />

// 通知バッジ表示
{unreadCount > 0 && (
  <Badge variant="destructive">
    {unreadCount > 99 ? "99+" : unreadCount}
  </Badge>
)}
```

#### 通知の自動作成

```typescript
// タスク作成時
await ctx.runMutation(api.notifications.createTaskNotification, {
  taskId,
  workspaceId,
  type: "task_created",
  actionUserId,
  taskTitle,
});
```

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

### タスク詳細・コメント機能

#### 概要

タスクの詳細情報をポップアップダイアログで表示し、そこでコメントの投稿・編集・削除ができる機能です。

#### 主要機能

1. **タスク詳細ダイアログ**
   - ポップアップ形式でタスク詳細を表示
   - タスクカードをクリックして開く
   - ScrollAreaでコンテンツのスクロール対応
   - タスク編集・削除ボタン（権限のあるユーザーのみ）

2. **コメント機能**
   - コメント一覧表示（ユーザーアバター・名前付き）
   - 新規コメント投稿
   - コメント編集・削除（自分のコメントのみ）
   - リアルタイム更新

3. **通知・アクティビティ連携**
   - コメント投稿時の自動通知作成
   - アクティビティフィードでの表示
   - コメント数のバッジ表示

#### 実装構成

```typescript
// タスクカードからダイアログを開く
<TaskCard onTaskDetailClick={handleTaskDetailClick} />

// ダイアログ内でコメント機能を表示
<TaskDetailDialog>
  <TaskComments taskId={taskId} workspaceId={workspaceId} />
</TaskDetailDialog>
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
