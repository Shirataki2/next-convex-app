import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { EditTaskDialog } from "@/components/workspace/edit-task-dialog";
import { Doc } from "@/convex/_generated/dataModel";
import { TestWrapper } from "@/__tests__/utils/test-wrapper";
import { vi } from "vitest";

// Convex Reactのモック
const mockUpdateTask = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateTask,
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

const mockWorkspace: Doc<"workspaces"> = {
  _id: "workspace1" as Doc<"workspaces">["_id"],
  _creationTime: Date.now(),
  name: "Test Workspace",
  ownerId: "owner1",
  members: ["member1", "member2"],
};

describe("EditTaskDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("編集ダイアログが正しくレンダリングされる", () => {
    render(
      <TestWrapper>
        <EditTaskDialog task={mockTask} workspace={mockWorkspace} />
      </TestWrapper>
    );

    const editButton = screen.getByRole("button", { name: "" });
    expect(editButton).toBeInTheDocument();
  });

  it("ダイアログを開いて既存のデータが表示される", async () => {
    render(
      <TestWrapper>
        <EditTaskDialog task={mockTask} workspace={mockWorkspace} />
      </TestWrapper>
    );

    const editButton = screen.getByRole("button");
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText("タスクを編集")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test Task")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test description")).toBeInTheDocument();
    });
  });

  it("タスクを更新できる", async () => {
    mockUpdateTask.mockResolvedValueOnce(undefined);

    render(
      <TestWrapper>
        <EditTaskDialog task={mockTask} workspace={mockWorkspace} />
      </TestWrapper>
    );

    const editButton = screen.getByRole("button");
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText("タスクを編集")).toBeInTheDocument();
    });

    // タイトルを変更
    const titleInput = screen.getByLabelText("タイトル");
    fireEvent.change(titleInput, { target: { value: "Updated Task" } });

    // フォームを送信
    const updateButton = screen.getByRole("button", { name: "更新" });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({
        taskId: "task1",
        updates: {
          title: "Updated Task",
          description: "Test description",
          priority: "medium",
          status: "todo",
          assigneeId: "user1",
          deadline: expect.any(String),
        },
        userId: "test-user-id",
      });
    });
  });

  it("更新エラーが適切にハンドリングされる", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockUpdateTask.mockRejectedValueOnce(new Error("Update failed"));

    render(
      <TestWrapper>
        <EditTaskDialog task={mockTask} workspace={mockWorkspace} />
      </TestWrapper>
    );

    const editButton = screen.getByRole("button");
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText("タスクを編集")).toBeInTheDocument();
    });

    const updateButton = screen.getByRole("button", { name: "更新" });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "タスクの更新に失敗しました:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
