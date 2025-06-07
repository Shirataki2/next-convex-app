# Convex デプロイメント戦略

## 環境の分離

### 1. 開発環境（Development）

```bash
# 開発サーバーの起動
npx convex dev
```

### 2. ステージング環境（Staging）

```bash
# ステージング環境用のデプロイキーを設定
export CONVEX_DEPLOY_KEY=your_staging_deploy_key

# ステージングにデプロイ
npx convex deploy --cmd "yarn build"
```

### 3. 本番環境（Production）

```bash
# 本番環境へのデプロイ
npx convex deploy --cmd "yarn build"

# または、カスタム環境変数名を指定
npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd "yarn build"
```

## CI/CDパイプラインでの自動デプロイ

### GitHub Actions例

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: "yarn"

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Deploy Convex and Build
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
        run: npx convex deploy --cmd "yarn build"
```

## 環境変数の管理

### 本番環境での環境変数設定

```bash
# Convex環境変数の設定
npx convex env set API_KEY your-production-api-key
npx convex env set DATABASE_URL your-production-database-url

# 環境変数の確認
npx convex env list
```

### セキュリティ設定

- 本番環境ではすべてのAPIキーを環境変数として設定
- `.env.local`には本番のシークレットを直接記載しない
- CI/CDでのシークレット管理を使用

## トラブルシューティング

### よくある問題と解決方法

1. **CORS エラー**

   - Convex Dashboardでドメインを正しく設定
   - Clerk Dashboardで許可されたオリジンを追加

2. **認証エラー**

   - Clerkキーが本番用になっているか確認
   - ConvexとClerkの統合設定を確認

3. **環境変数が反映されない**
   - `npx convex deploy` でデプロイし直す
   - ブラウザのキャッシュをクリア
