import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("/");

  // ページタイトルが正しく表示されることを確認
  await expect(page).toHaveTitle(/Create Next App/);
});

test("landing page basic navigation", async ({ page }) => {
  await page.goto("/");

  // ランディングページの基本要素をチェック
  await expect(page.locator("h1")).toBeVisible();
});

test("login page accessible", async ({ page }) => {
  await page.goto("/login");

  // ログインページにアクセスできることを確認
  await expect(page).toHaveURL(/login/);
});

test("dashboard page redirects to login when not authenticated", async ({
  page,
}) => {
  // 認証なしでダッシュボードにアクセスすると、ログインページにリダイレクトされることを確認
  await page.goto("/dashboard");

  // ログインページまたは認証が必要なことを示すページにリダイレクトされるはず
  await expect(page).toHaveURL(/login/);
});

test("workspace page redirects to login when not authenticated", async ({
  page,
}) => {
  // 認証なしでワークスペースにアクセスすると、ログインページにリダイレクトされることを確認
  await page.goto("/workspace");

  // ログインページまたは認証が必要なことを示すページにリダイレクトされるはず
  await expect(page).toHaveURL(/login/);
});
