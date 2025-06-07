import React from "react";

// テスト用のClerkProviderモック
const MockClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-clerk-provider">{children}</div>;
};

// テスト用のConvexProviderモック
const MockConvexProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-convex-provider">{children}</div>;
};

// 全てのテストで使用する統一されたラッパーコンポーネント
export const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockClerkProvider>
      <MockConvexProvider>{children}</MockConvexProvider>
    </MockClerkProvider>
  );
};
