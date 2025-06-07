# 本番環境デプロイメントガイド

## 必要なGitHub Secrets設定

GitHub Repository > Settings > Secrets and variables > Actions で以下を設定：

### **Repository Secrets**

| シークレット名 | 説明 | 取得方法 |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | Convex本番デプロイキー | Convex Dashboard > Settings > Deploy Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk本番Publishable Key | Clerk Dashboard > API Keys |
| `CLERK_SECRET_KEY` | Clerk本番Secret Key | Clerk Dashboard > API Keys |
| `VERCEL_TOKEN` | Vercel デプロイトークン (任意) | Vercel Dashboard > Settings > Tokens |
| `VERCEL_ORG_ID` | Vercel組織ID (任意) | Vercel CLI: `vercel env pull` |
| `VERCEL_PROJECT_ID` | VercelプロジェクトID (任意) | Vercel CLI: `vercel env pull` |

### **Repository Variables**

| 変数名 | 説明 | 値例 |
|---|---|---|
| `DEPLOY_TO_VERCEL` | Vercel自動デプロイの有効化 | `true` または `false` |
| `RUN_E2E_TESTS` | E2Eテストの実行 | `true` または `false` |
| `NEXT_PUBLIC_CONVEX_URL` | 本番ConvexURL | `https://your-app.convex.cloud` |

## デプロイメント手順

### 1. **初回セットアップ**

```bash
# 1. Convexにログイン
npx convex login

# 2. 新しいプロジェクトを作成（既存の場合はスキップ）
npx convex dev
# プロジェクト名を入力（例: next-convex-app-prod）

# 3. 本番環境にデプロイ
npx convex deploy
```

### 2. **Clerk認証の設定**

1. **Clerk Dashboard**で本番環境を設定：
   - Production instanceを作成
   - Domain settingsで本番ドメインを追加
   - API Keysから本番用キーを取得

2. **GitHubシークレット**に本番用キーを設定

### 3. **環境変数の管理**

```bash
# Convex環境変数の設定
npx convex env set VARIABLE_NAME value

# 環境変数の確認
npx convex env list

# 本番環境での確認
npx convex env list --prod
```

### 4. **継続的デプロイ**

mainブランチにpushすると自動的に：
1. テストが実行される
2. Convexバックエンドがデプロイされる
3. フロントエンドがビルドされる
4. （設定により）Vercelにデプロイされる
5. （設定により）E2Eテストが実行される

### 5. **手動デプロイ**

```bash
# Convexのみデプロイ
npx convex deploy

# Convex + フロントエンドビルド
npx convex deploy --cmd "yarn build"

# ステージング環境へのデプロイ
CONVEX_DEPLOY_KEY=staging_key npx convex deploy
```

## トラブルシューティング

### **よくある問題**

1. **CONVEX_DEPLOY_KEY が見つからない**
   - Convex Dashboard > Settings > Deploy Keys でキーを生成
   - GitHubシークレットに正しく設定されているか確認

2. **Clerk認証エラー**
   - 本番用キー（pk_live_, sk_live_）を使用しているか確認
   - Clerk Dashboardで許可ドメインが設定されているか確認

3. **ビルドエラー**
   - 環境変数が正しく設定されているか確認
   - `yarn test` と `yarn lint` がローカルで通るか確認

4. **デプロイが失敗する**
   - GitHub Actionsのログを確認
   - Convex Dashboardでデプロイメント履歴を確認

### **ロールバック方法**

```bash
# 前のバージョンにロールバック
npx convex rollback

# 特定のバージョンを指定
npx convex rollback --to-version VERSION_NUMBER
```

## 監視とログ

### **Convexログの確認**

```bash
# リアルタイムログ
npx convex logs

# 本番環境のログ
npx convex logs --prod

# 特定の関数のログ
npx convex logs --function-name functionName
```

### **パフォーマンス監視**

- Convex Dashboard > Analytics で使用状況を確認
- 関数の実行時間とエラー率を監視
- データベースクエリのパフォーマンスを確認

## セキュリティ対策

1. **環境変数の管理**
   - 本番のシークレットをソースコードに含めない
   - 定期的にAPIキーをローテーション

2. **アクセス制御**
   - Convex関数での適切な認証チェック
   - Clerkでのユーザー権限管理

3. **監査ログ**
   - 重要な操作のログ記録
   - 異常なアクセスパターンの監視