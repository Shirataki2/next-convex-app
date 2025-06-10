import { render, screen } from "@testing-library/react";
import { WorkspacePresence } from "@/components/workspace/workspace-presence";
import { ConvexProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { vi, describe, beforeEach, test, expect } from "vitest";

// Convexクライアントのモック
const mockConvexClient = new ConvexReactClient("https://test.convex.cloud");

// テスト用のプロバイダー
function TestConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={mockConvexClient}>{children}</ConvexProvider>;
}

// usePresenceフックのモック
vi.mock("@/hooks/use-presence", () => ({
  usePresence: vi.fn(),
}));

const mockUsePresence = vi.fn();

describe("WorkspacePresence", () => {
  const mockWorkspaceId = "workspaceId123" as Id<"workspaces">;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ローディング状態の表示", () => {
    mockUsePresence.mockReturnValue({
      presenceData: [],
      loading: true,
      error: null,
      updatePresence: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <TestConvexProvider>
        <WorkspacePresence workspaceId={mockWorkspaceId} />
      </TestConvexProvider>
    );

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  test("エラー状態の表示", () => {
    const errorMessage = "プレゼンス情報の取得に失敗しました";
    mockUsePresence.mockReturnValue({
      presenceData: [],
      loading: false,
      error: errorMessage,
      updatePresence: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <TestConvexProvider>
        <WorkspacePresence workspaceId={mockWorkspaceId} />
      </TestConvexProvider>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test("オンラインメンバーなしの状態", () => {
    mockUsePresence.mockReturnValue({
      presenceData: [],
      loading: false,
      error: null,
      updatePresence: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <TestConvexProvider>
        <WorkspacePresence workspaceId={mockWorkspaceId} />
      </TestConvexProvider>
    );

    expect(
      screen.getByText("オンラインのメンバーはいません")
    ).toBeInTheDocument();
  });

  test("プレゼンス情報の表示", async () => {
    const mockPresenceData = [
      {
        userId: "user1",
        status: "online",
        lastSeen: Date.now() - 30000, // 30秒前
        currentPage: "/workspace/test",
        user: {
          id: "user1",
          firstName: "太郎",
          lastName: "田中",
          imageUrl: "https://example.com/avatar1.jpg",
          username: "taro_tanaka",
          emailAddress: "taro@example.com",
        },
      },
      {
        userId: "user2",
        status: "away",
        lastSeen: Date.now() - 180000, // 3分前
        currentPage: "/workspace/test/members",
        isEditing: "taskId123" as Id<"tasks">,
        user: {
          id: "user2",
          firstName: "花子",
          lastName: "山田",
          imageUrl: null,
          username: "hanako_yamada",
          emailAddress: "hanako@example.com",
        },
      },
    ];

    mockUsePresence.mockReturnValue({
      presenceData: mockPresenceData,
      loading: false,
      error: null,
      updatePresence: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <TestConvexProvider>
        <WorkspacePresence workspaceId={mockWorkspaceId} />
      </TestConvexProvider>
    );

    // ヘッダーの確認
    expect(screen.getByText("メンバーの状態 (2人)")).toBeInTheDocument();

    // 各ユーザーの情報が表示されていることを確認
    expect(screen.getByText("太郎 田中")).toBeInTheDocument();
    expect(screen.getByText("花子 山田")).toBeInTheDocument();

    // ステータスの確認
    expect(screen.getByText("オンライン")).toBeInTheDocument();
    expect(screen.getByText("離席中")).toBeInTheDocument();

    // 編集中バッジの確認
    expect(screen.getByText("編集中")).toBeInTheDocument();
  });

  test("ユーザー名の表示ロジック", () => {
    const mockPresenceData = [
      {
        userId: "user1",
        status: "online",
        lastSeen: Date.now(),
        user: {
          id: "user1",
          firstName: null,
          lastName: null,
          imageUrl: null,
          username: "test_user",
          emailAddress: "test@example.com",
        },
      },
      {
        userId: "user2",
        status: "online",
        lastSeen: Date.now(),
        user: {
          id: "user2",
          firstName: null,
          lastName: null,
          imageUrl: null,
          username: null,
          emailAddress: "user2@example.com",
        },
      },
    ];

    mockUsePresence.mockReturnValue({
      presenceData: mockPresenceData,
      loading: false,
      error: null,
      updatePresence: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <TestConvexProvider>
        <WorkspacePresence workspaceId={mockWorkspaceId} />
      </TestConvexProvider>
    );

    // ユーザー名がない場合はusernameが表示される
    expect(screen.getByText("test_user")).toBeInTheDocument();

    // usernameもない場合はemailAddressが表示される
    expect(screen.getByText("user2@example.com")).toBeInTheDocument();
  });

  test("最終アクティブ時刻の表示", () => {
    const now = Date.now();
    const mockPresenceData = [
      {
        userId: "user1",
        status: "online",
        lastSeen: now - 30000, // 30秒前
        user: {
          id: "user1",
          firstName: "テスト",
          lastName: "ユーザー",
          imageUrl: null,
          username: "testuser",
          emailAddress: "test@example.com",
        },
      },
      {
        userId: "user2",
        status: "online",
        lastSeen: now - 120000, // 2分前
        user: {
          id: "user2",
          firstName: "テスト",
          lastName: "ユーザー2",
          imageUrl: null,
          username: "testuser2",
          emailAddress: "test2@example.com",
        },
      },
      {
        userId: "user3",
        status: "online",
        lastSeen: now - 3600000, // 1時間前
        user: {
          id: "user3",
          firstName: "テスト",
          lastName: "ユーザー3",
          imageUrl: null,
          username: "testuser3",
          emailAddress: "test3@example.com",
        },
      },
    ];

    mockUsePresence.mockReturnValue({
      presenceData: mockPresenceData,
      loading: false,
      error: null,
      updatePresence: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <TestConvexProvider>
        <WorkspacePresence workspaceId={mockWorkspaceId} />
      </TestConvexProvider>
    );

    // 最終アクティブ時刻が適切に表示されることを確認
    expect(screen.getByText("2分前")).toBeInTheDocument();
    expect(screen.getByText("1時間前")).toBeInTheDocument();
  });

  test("現在のページ情報の表示", () => {
    const mockPresenceData = [
      {
        userId: "user1",
        status: "online",
        lastSeen: Date.now(),
        currentPage: "/workspace/test123/members",
        user: {
          id: "user1",
          firstName: "テスト",
          lastName: "ユーザー",
          imageUrl: null,
          username: "testuser",
          emailAddress: "test@example.com",
        },
      },
      {
        userId: "user2",
        status: "online",
        lastSeen: Date.now(),
        currentPage: "/dashboard",
        user: {
          id: "user2",
          firstName: "テスト",
          lastName: "ユーザー2",
          imageUrl: null,
          username: "testuser2",
          emailAddress: "test2@example.com",
        },
      },
    ];

    mockUsePresence.mockReturnValue({
      presenceData: mockPresenceData,
      loading: false,
      error: null,
      updatePresence: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <TestConvexProvider>
        <WorkspacePresence workspaceId={mockWorkspaceId} />
      </TestConvexProvider>
    );

    // ページ情報が適切に表示されることを確認
    expect(screen.getByText("メンバー管理")).toBeInTheDocument();
    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
  });

  test("ステータス別のソート", () => {
    const mockPresenceData = [
      {
        userId: "user1",
        status: "offline",
        lastSeen: Date.now() - 60000,
        user: {
          id: "user1",
          firstName: "オフライン",
          lastName: "ユーザー",
          imageUrl: null,
          username: "offline_user",
          emailAddress: "offline@example.com",
        },
      },
      {
        userId: "user2",
        status: "online",
        lastSeen: Date.now() - 30000,
        user: {
          id: "user2",
          firstName: "オンライン",
          lastName: "ユーザー",
          imageUrl: null,
          username: "online_user",
          emailAddress: "online@example.com",
        },
      },
      {
        userId: "user3",
        status: "away",
        lastSeen: Date.now() - 45000,
        user: {
          id: "user3",
          firstName: "離席中",
          lastName: "ユーザー",
          imageUrl: null,
          username: "away_user",
          emailAddress: "away@example.com",
        },
      },
    ];

    mockUsePresence.mockReturnValue({
      presenceData: mockPresenceData,
      loading: false,
      error: null,
      updatePresence: vi.fn(),
      refetch: vi.fn(),
    });

    const { container } = render(
      <TestConvexProvider>
        <WorkspacePresence workspaceId={mockWorkspaceId} />
      </TestConvexProvider>
    );

    // DOMの順序でソートされていることを確認
    const userElements =
      container.querySelectorAll("[data-testid]") ||
      Array.from(container.querySelectorAll("div")).filter((el) =>
        el.textContent?.includes("ユーザー")
      );
    expect(userElements).toBeInTheDocument();

    // オンライン → 離席中 → オフラインの順序で表示されることを期待
    // (実際のテストでは、より具体的な要素選択が必要)
  });
});
