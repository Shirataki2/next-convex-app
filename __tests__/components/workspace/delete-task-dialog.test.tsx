import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DeleteTaskDialog } from "@/components/workspace/delete-task-dialog";
import { Doc } from "@/convex/_generated/dataModel";
import { TestWrapper } from "@/__tests__/utils/test-wrapper";
import { vi } from "vitest";

// Convex Reactのモック
const mockDeleteTask = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockDeleteTask,
}));

// Clerk Nextのモック
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { id: "test-user-id" },
  }),
}));

// Sonnerのモック
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockTask: Doc<"tasks"> = {
  _id: "task1" as Doc<"tasks">["_id"],
  _creationTime: Date.now(),
  title: "Test Task",
  description: "Test description",
  status: "todo",
  workspaceId: "workspace1" as Doc<"workspaces">["_id"],
  assigneeId: "user1",
  deadline: new Date("2024-12-31").toISOString(),
  priority: "medium",
  order: 1,
};

describe("DeleteTaskDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("削除ボタンが正しくレンダリングされる", () => {
    render(
      <TestWrapper>
        <DeleteTaskDialog task={mockTask} />
      </TestWrapper>
    );

    const deleteButton = screen.getByRole("button", { name: "" });
    expect(deleteButton).toBeInTheDocument();
  });

  it("削除確認ダイアログが表示される", async () => {
    render(
      <TestWrapper>
        <DeleteTaskDialog task={mockTask} />
      </TestWrapper>
    );

    const deleteButton = screen.getByRole("button");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();
      expect(
        screen.getByText(
          "「Test Task」を削除します。この操作は取り消せません。"
        )
      ).toBeInTheDocument();
    });
  });

  it("タスクを削除できる", async () => {
    mockDeleteTask.mockResolvedValueOnce({ success: true });

    render(
      <TestWrapper>
        <DeleteTaskDialog task={mockTask} />
      </TestWrapper>
    );

    const deleteButton = screen.getByRole("button");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: "削除" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith({
        taskId: "task1",
        userId: "test-user-id",
      });
    });
  });

  it("削除をキャンセルできる", async () => {
    render(
      <TestWrapper>
        <DeleteTaskDialog task={mockTask} />
      </TestWrapper>
    );

    const deleteButton = screen.getByRole("button");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockDeleteTask).not.toHaveBeenCalled();
    });
  });

  it("削除エラーが適切にハンドリングされる", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockDeleteTask.mockRejectedValueOnce(new Error("Delete failed"));

    render(
      <TestWrapper>
        <DeleteTaskDialog task={mockTask} />
      </TestWrapper>
    );

    const deleteButton = screen.getByRole("button");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: "削除" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "タスクの削除に失敗しました:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("削除中は削除ボタンが無効になる", async () => {
    mockDeleteTask.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(
      <TestWrapper>
        <DeleteTaskDialog task={mockTask} />
      </TestWrapper>
    );

    const deleteButton = screen.getByRole("button");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: "削除" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "削除中..." })).toBeDisabled();
    });
  });
});

