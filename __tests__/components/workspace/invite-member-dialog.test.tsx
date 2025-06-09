import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog";
import { TestWrapper } from "@/__tests__/utils/test-wrapper";

// Convexのモック
vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => () => Promise.resolve({ exists: false })),
}));

// Clerkのモック
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({
    user: { id: "user_123" },
  })),
}));

const mockWorkspace = {
  _id: "workspace_123" as any,
  _creationTime: Date.now(),
  name: "Test Workspace",
  ownerId: "user_123",
  members: ["user_123"],
};

describe("InviteMemberDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("招待ダイアログが正しくレンダリングされる", () => {
    render(
      <TestWrapper>
        <InviteMemberDialog workspace={mockWorkspace} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole("button", {
      name: /メンバーを招待/,
    });
    expect(triggerButton).toBeInTheDocument();
  });

  test("ダイアログを開くとフォームが表示される", async () => {
    render(
      <TestWrapper>
        <InviteMemberDialog workspace={mockWorkspace} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole("button", {
      name: /メンバーを招待/,
    });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
      expect(screen.getByText(/役割/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /招待を送信/ })
      ).toBeInTheDocument();
    });
  });

  test("メールアドレス入力フィールドが正しく動作する", async () => {
    render(
      <TestWrapper>
        <InviteMemberDialog workspace={mockWorkspace} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole("button", {
      name: /メンバーを招待/,
    });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const emailInput = screen.getByLabelText(
        /メールアドレス/
      ) as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      expect(emailInput.value).toBe("test@example.com");
    });
  });

  test("役割選択フィールドが表示される", async () => {
    render(
      <TestWrapper>
        <InviteMemberDialog workspace={mockWorkspace} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole("button", {
      name: /メンバーを招待/,
    });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText(/役割/)).toBeInTheDocument();
    });
  });

  test("空のメールアドレスでは送信ボタンが無効", async () => {
    render(
      <TestWrapper>
        <InviteMemberDialog workspace={mockWorkspace} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole("button", {
      name: /メンバーを招待/,
    });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /招待を送信/ });
      expect(submitButton).toBeDisabled();
    });
  });

  test("有効なメールアドレスで送信ボタンが有効になる", async () => {
    render(
      <TestWrapper>
        <InviteMemberDialog workspace={mockWorkspace} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole("button", {
      name: /メンバーを招待/,
    });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/メールアドレス/);
      const submitButton = screen.getByRole("button", { name: /招待を送信/ });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      expect(submitButton).not.toBeDisabled();
    });
  });

  test("キャンセルボタンでダイアログが閉じる", async () => {
    render(
      <TestWrapper>
        <InviteMemberDialog workspace={mockWorkspace} />
      </TestWrapper>
    );

    const triggerButton = screen.getByRole("button", {
      name: /メンバーを招待/,
    });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const cancelButton = screen.getByRole("button", { name: /キャンセル/ });
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
    });

    // ダイアログが閉じることを確認（フォームが見えなくなる）
    await waitFor(() => {
      expect(screen.queryByLabelText(/メールアドレス/)).not.toBeInTheDocument();
    });
  });
});
