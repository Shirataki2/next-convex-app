import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "@/app/page";

// Mock Clerk components
vi.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-in">{children}</div>
  ),
  SignedOut: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-out">{children}</div>
  ),
  useUser: () => ({
    user: null,
    isLoaded: true,
    isSignedIn: false,
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock the ClerkProvider globally for tests
const MockClerkProvider = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

// Wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MockClerkProvider>{children}</MockClerkProvider>
);

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: function MockedLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock components
vi.mock("@/components/layout/landing-header", () => ({
  LandingHeader: () => <header data-testid="landing-header">Header</header>,
}));

describe("ランディングページ", () => {
  it("基本的な要素が表示される", () => {
    render(
      <TestWrapper>
        <Page />
      </TestWrapper>
    );

    // メインヘッダーの確認
    expect(screen.getByTestId("landing-header")).toBeInTheDocument();

    // メインタイトルの確認
    expect(
      screen.getByRole("heading", { level: 1, name: /効率的な タスク管理/ })
    ).toBeInTheDocument();

    // サブタイトルの確認
    expect(
      screen.getByText(
        /チームでのタスク管理を簡単に。リアルタイム同期でみんなの進捗を共有し/
      )
    ).toBeInTheDocument();

    // 機能カードの確認（CardTitleとして表示される）
    expect(screen.getByText("リアルタイム同期")).toBeInTheDocument();
  });

  it("SignedInとSignedOutが正しく表示される", () => {
    render(<Page />);

    // Signed In セクション
    const signedInSection = screen.getByTestId("signed-in");
    expect(signedInSection).toBeInTheDocument();

    // Signed Out セクション
    const signedOutSection = screen.getByTestId("signed-out");
    expect(signedOutSection).toBeInTheDocument();
  });

  it("機能カードが表示される", () => {
    render(<Page />);

    // リアルタイム同期
    expect(screen.getByText("🚀")).toBeInTheDocument();
    expect(screen.getByText("リアルタイム同期")).toBeInTheDocument();

    // セキュアな認証
    expect(screen.getByText("🔒")).toBeInTheDocument();
    expect(screen.getByText("セキュアな認証")).toBeInTheDocument();

    // 直感的なUI
    expect(screen.getByText("🎨")).toBeInTheDocument();
    expect(screen.getByText("直感的なUI")).toBeInTheDocument();
  });

  it("CTAボタンが表示される", () => {
    render(<Page />);

    // サインイン済みユーザー向けのボタン
    const dashboardLink = screen.getByRole("link", {
      name: /ダッシュボードへ移動/,
    });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    // 未サインインユーザー向けのボタン
    const getStartedLink = screen.getByRole("link", { name: /今すぐ始める/ });
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink).toHaveAttribute("href", "/login");
  });

  it("ダークモード対応のクラスが適用されている", () => {
    render(<Page />);

    const mainContainer = screen.getByRole("main").parentElement;
    expect(mainContainer).toHaveClass("min-h-screen");
    expect(mainContainer).toHaveClass("bg-gradient-to-br");
    expect(mainContainer).toHaveClass("dark:from-slate-900");
  });

  it("機能説明が正しく表示される", () => {
    render(<Page />);

    // リアルタイム同期の説明
    expect(
      screen.getByText(/チームメンバーの変更がリアルタイムで反映されます/)
    ).toBeInTheDocument();

    // 直感的なUIの説明
    expect(
      screen.getByText(/使いやすいドラッグ&ドロップインターフェース/)
    ).toBeInTheDocument();

    // セキュアな認証の説明
    expect(
      screen.getByText(/Clerkによる安全なユーザー管理/)
    ).toBeInTheDocument();
  });

  it("機能カードが正しく表示される", () => {
    render(<Page />);

    // Card要素が存在することを確認
    const cards = screen.getAllByText(/^🚀|🔒|🎨$/);
    expect(cards).toHaveLength(3);
  });
});
