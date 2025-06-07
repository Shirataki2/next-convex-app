import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}));

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
}));

// Mock API
vi.mock("@/convex/_generated/api", () => ({
  api: {
    workspaces: {
      createWorkspace: "workspaces:createWorkspace",
    },
  },
}));

import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";

const mockUseMutation = useMutation as ReturnType<typeof vi.fn>;
const mockUseUser = useUser as ReturnType<typeof vi.fn>;

describe("CreateWorkspaceDialog", () => {
  const mockCreateWorkspace = vi.fn();
  const mockUser = {
    id: "user123",
    firstName: "Test",
    lastName: "User",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(mockCreateWorkspace);
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    } as any);
  });

  it("ダイアログトリガーが正しく表示される", () => {
    render(<CreateWorkspaceDialog />);

    const triggerButton = screen.getByRole("button", {
      name: /新規ワークスペース/i,
    });
    expect(triggerButton).toBeInTheDocument();
  });

  it("カスタム子要素がトリガーとして表示される", () => {
    render(
      <CreateWorkspaceDialog>
        <button>カスタムボタン</button>
      </CreateWorkspaceDialog>
    );

    const customButton = screen.getByRole("button", {
      name: /カスタムボタン/i,
    });
    expect(customButton).toBeInTheDocument();
  });

  it("ダイアログが開いて閉じる", async () => {
    const user = userEvent.setup();

    render(<CreateWorkspaceDialog />);

    const triggerButton = screen.getByRole("button", {
      name: /新規ワークスペース/i,
    });

    // ダイアログを開く
    await user.click(triggerButton);

    expect(screen.getByText("新しいワークスペースを作成")).toBeInTheDocument();
    expect(
      screen.getByText("新しいプロジェクトのワークスペースを作成します。 後でメンバーを招待することができます。")
    ).toBeInTheDocument();

    // キャンセルボタンでダイアログを閉じる
    const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByText("新しいワークスペースを作成")
      ).not.toBeInTheDocument();
    });
  });

  it("フォームの入力と送信が正しく動作する", async () => {
    const user = userEvent.setup();
    mockCreateWorkspace.mockResolvedValue("workspace123");

    render(<CreateWorkspaceDialog />);

    const triggerButton = screen.getByRole("button", {
      name: /新規ワークスペース/i,
    });

    // ダイアログを開く
    await user.click(triggerButton);

    // 入力フィールドに値を入力
    const nameInput = screen.getByLabelText(/名前/i);
    await user.type(nameInput, "テストワークスペース");

    // 作成ボタンをクリック
    const createButton = screen.getByRole("button", { name: /^作成$/ });
    await user.click(createButton);

    // createWorkspace が正しい引数で呼ばれることを確認
    expect(mockCreateWorkspace).toHaveBeenCalledWith({
      name: "テストワークスペース",
      ownerId: "user123",
    });

    // ダイアログが閉じることを確認
    await waitFor(() => {
      expect(
        screen.queryByText("新しいワークスペースを作成")
      ).not.toBeInTheDocument();
    });
  });

  it("必須フィールドが空の場合、送信ボタンが無効になる", async () => {
    const user = userEvent.setup();

    render(<CreateWorkspaceDialog />);

    const triggerButton = screen.getByRole("button", {
      name: /新規ワークスペース/i,
    });

    // ダイアログを開く
    await user.click(triggerButton);

    const createButton = screen.getByRole("button", { name: /^作成$/ });

    // 初期状態では送信ボタンが無効
    expect(createButton).toBeDisabled();

    // 入力後は有効になる
    const nameInput = screen.getByLabelText(/名前/i);
    await user.type(nameInput, "テスト");

    expect(createButton).toBeEnabled();

    // 入力を削除すると再び無効になる
    await user.clear(nameInput);

    expect(createButton).toBeDisabled();
  });

  it("作成中は送信ボタンがローディング状態になる", async () => {
    const user = userEvent.setup();

    // Promise を手動で解決するためのセットアップ
    let resolveCreateWorkspace: (value: string) => void;
    const createWorkspacePromise = new Promise<string>((resolve) => {
      resolveCreateWorkspace = resolve;
    });
    mockCreateWorkspace.mockReturnValue(createWorkspacePromise);

    render(<CreateWorkspaceDialog />);

    const triggerButton = screen.getByRole("button", {
      name: /新規ワークスペース/i,
    });

    // ダイアログを開く
    await user.click(triggerButton);

    // 入力
    const nameInput = screen.getByLabelText(/名前/i);
    await user.type(nameInput, "テストワークスペース");

    // 作成ボタンをクリック
    const createButton = screen.getByRole("button", { name: /^作成$/ });
    await user.click(createButton);

    // ローディング状態を確認
    expect(screen.getByText("作成中...")).toBeInTheDocument();
    expect(createButton).toBeDisabled();

    // キャンセルボタンも無効になる
    const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
    expect(cancelButton).toBeDisabled();

    // Promise を解決
    resolveCreateWorkspace!("workspace123");

    // ローディング状態が終了することを確認
    await waitFor(() => {
      expect(screen.queryByText("作成中...")).not.toBeInTheDocument();
    });
  });

  it("ユーザーがサインインしていない場合、フォーム送信が実行されない", async () => {
    const user = userEvent.setup();

    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    } as any);

    render(<CreateWorkspaceDialog />);

    const triggerButton = screen.getByRole("button", {
      name: /新規ワークスペース/i,
    });

    // ダイアログを開く
    await user.click(triggerButton);

    const nameInput = screen.getByLabelText(/名前/i);
    await user.type(nameInput, "テストワークスペース");

    const createButton = screen.getByRole("button", { name: /^作成$/ });
    await user.click(createButton);

    // createWorkspace が呼ばれないことを確認
    expect(mockCreateWorkspace).not.toHaveBeenCalled();
  });

  it("フォームの入力値がトリムされる", async () => {
    const user = userEvent.setup();
    mockCreateWorkspace.mockResolvedValue("workspace123");

    render(<CreateWorkspaceDialog />);

    const triggerButton = screen.getByRole("button", {
      name: /新規ワークスペース/i,
    });

    // ダイアログを開く
    await user.click(triggerButton);

    // 前後にスペースを含む値を入力
    const nameInput = screen.getByLabelText(/名前/i);
    await user.type(nameInput, "  テストワークスペース  ");

    const createButton = screen.getByRole("button", { name: /^作成$/ });
    await user.click(createButton);

    // トリムされた値で呼ばれることを確認
    expect(mockCreateWorkspace).toHaveBeenCalledWith({
      name: "テストワークスペース",
      ownerId: "user123",
    });
  });

  it("エラーが発生した場合でもダイアログは開いたまま", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockCreateWorkspace.mockRejectedValue(new Error("作成に失敗しました"));

    render(<CreateWorkspaceDialog />);

    const triggerButton = screen.getByRole("button", {
      name: /新規ワークスペース/i,
    });

    // ダイアログを開く
    await user.click(triggerButton);

    const nameInput = screen.getByLabelText(/名前/i);
    await user.type(nameInput, "テストワークスペース");

    const createButton = screen.getByRole("button", { name: /^作成$/ });
    await user.click(createButton);

    // エラーが発生してもダイアログは開いたまま
    await waitFor(() => {
      expect(
        screen.getByText("新しいワークスペースを作成")
      ).toBeInTheDocument();
    });

    // エラーがコンソールに出力される
    expect(consoleSpy).toHaveBeenCalledWith(
      "ワークスペースの作成に失敗しました:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
