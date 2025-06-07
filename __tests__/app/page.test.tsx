import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, jest } from "@jest/globals";
import Page from "@/app/page";

// Mock Clerk components
jest.mock("@clerk/nextjs", () => ({
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

// Mock Next.js Link
jest.mock("next/link", () => {
  return function MockedLink({
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
  };
});

// Mock components
jest.mock("@/components/layout/landing-header", () => ({
  LandingHeader: () => <header data-testid="landing-header">Header</header>,
}));

describe("ランディングページ", () => {
  it("基本的な要素が表示される", () => {
    render(<Page />);

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

    // 機能紹介セクションの確認
    expect(
      screen.getByRole("heading", { level: 2, name: /主な機能/ })
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole("heading", { level: 3, name: /⚡ リアルタイム同期/ })
    ).toBeInTheDocument();

    // ドラッグ&ドロップ
    expect(
      screen.getByRole("heading", { level: 3, name: /🎯 ドラッグ&ドロップ/ })
    ).toBeInTheDocument();

    // セキュアな認証
    expect(
      screen.getByRole("heading", { level: 3, name: /🔒 セキュアな認証/ })
    ).toBeInTheDocument();
  });

  it("CTAボタンが表示される", () => {
    render(<Page />);

    // サインイン済みユーザー向けのボタン
    const dashboardLink = screen.getByRole("link", {
      name: /ダッシュボードへ/,
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
    expect(mainContainer).toHaveClass("bg-slate-50");
    expect(mainContainer).toHaveClass("dark:bg-slate-900");
  });

  it("機能説明が正しく表示される", () => {
    render(<Page />);

    // リアルタイム同期の説明
    expect(
      screen.getByText(/チームメンバーとリアルタイムでタスクを同期/)
    ).toBeInTheDocument();

    // ドラッグ&ドロップの説明
    expect(
      screen.getByText(/直感的な操作でタスクを簡単に管理/)
    ).toBeInTheDocument();

    // セキュアな認証の説明
    expect(
      screen.getByText(/Clerkによる安全なユーザー管理/)
    ).toBeInTheDocument();
  });

  it("カードホバー効果のクラスが適用されている", () => {
    render(<Page />);

    const featureCards = screen.getAllByRole("generic").filter((element) =>
      element.className?.includes("hover:shadow-lg")
    );

    expect(featureCards.length).toBeGreaterThan(0);
  });
});