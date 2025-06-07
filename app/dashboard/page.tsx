import { auth } from "@clerk/nextjs/server";
import { Header } from "@/components/layout/header";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="ダッシュボード" />
      
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg bg-white dark:bg-gray-800 px-5 py-6 shadow sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            ようこそダッシュボードへ
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            ここではワークスペースの管理やタスクの確認ができます。
          </p>
        </div>
      </main>
    </div>
  );
}