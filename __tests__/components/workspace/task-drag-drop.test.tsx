import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { vi } from "vitest";

// Clerkのhookをモック
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      id: "mock-user-id",
      firstName: "Test",
      lastName: "User",
    },
  }),
}));

// Convexのhookをモック
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

// シンプルなドラッグ対応コンポーネントのテスト
const MockDraggableCard = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  return <div data-testid={`draggable-${id}`}>{children}</div>;
};

const MockDropZone = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  return <div data-testid={`droppable-${id}`}>{children}</div>;
};

describe("ドラッグ&ドロップ機能", () => {
  it("DndContextが正常にレンダリングされる", () => {
    render(
      <DndContext>
        <MockDraggableCard id="task-1">
          <p>テストタスク</p>
        </MockDraggableCard>
      </DndContext>
    );

    expect(screen.getByText("テストタスク")).toBeInTheDocument();
    expect(screen.getByTestId("draggable-task-1")).toBeInTheDocument();
  });

  it("ドロップゾーンが正常にレンダリングされる", () => {
    render(
      <DndContext>
        <MockDropZone id="todo">
          <h3>Todo</h3>
          <MockDraggableCard id="task-1">
            <p>タスク1</p>
          </MockDraggableCard>
        </MockDropZone>
      </DndContext>
    );

    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("タスク1")).toBeInTheDocument();
    expect(screen.getByTestId("droppable-todo")).toBeInTheDocument();
    expect(screen.getByTestId("draggable-task-1")).toBeInTheDocument();
  });

  it("複数のドロップゾーンが表示される", () => {
    render(
      <DndContext>
        <div className="grid grid-cols-3 gap-6">
          <MockDropZone id="todo">
            <h3>Todo</h3>
          </MockDropZone>
          <MockDropZone id="in_progress">
            <h3>進行中</h3>
          </MockDropZone>
          <MockDropZone id="done">
            <h3>完了</h3>
          </MockDropZone>
        </div>
      </DndContext>
    );

    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText("完了")).toBeInTheDocument();
    expect(screen.getByTestId("droppable-todo")).toBeInTheDocument();
    expect(screen.getByTestId("droppable-in_progress")).toBeInTheDocument();
    expect(screen.getByTestId("droppable-done")).toBeInTheDocument();
  });
});
