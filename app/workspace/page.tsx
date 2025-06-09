"use client";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Users, Settings } from "lucide-react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import Link from "next/link";

export default function WorkspacePage() {
  const { user } = useUser();
  const workspaces = useQuery(
    api.workspaces.getUserWorkspaces,
    user ? { userId: user.id } : "skip"
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header title="ワークスペース一覧" />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <p className="text-slate-600 dark:text-slate-300">
              ログインが必要です
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header title="ワークスペース一覧" />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              ワークスペース
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              プロジェクトのワークスペースを管理しましょう
            </p>
          </div>
          <CreateWorkspaceDialog />
        </div>

        {/* Loading State */}
        {workspaces === undefined && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Workspace Grid */}
        {workspaces && workspaces.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <Link
                key={workspace._id}
                href={`/workspace/${workspace._id}`}
                className="block"
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {workspace.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          // TODO: 設定モーダルを開く
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>
                      {workspace.ownerId === user.id ? "オーナー" : "メンバー"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                        <Users className="mr-1 h-4 w-4" />
                        <span>{workspace.members.length} メンバー</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(workspace._creationTime).toLocaleDateString(
                          "ja-JP"
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Create New Workspace Card */}
            <Card className="border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
              <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                <div className="mb-4">
                  <CreateWorkspaceDialog>
                    <Button variant="outline" size="icon" className="h-16 w-16">
                      <Plus className="h-8 w-8" />
                    </Button>
                  </CreateWorkspaceDialog>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  新しいワークスペース
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  新しいプロジェクトを開始しましょう
                </p>
                <CreateWorkspaceDialog>
                  <Button variant="outline">作成する</Button>
                </CreateWorkspaceDialog>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State - Show when no workspaces */}
        {workspaces && workspaces.length === 0 && (
          <div className="text-center py-16">
            <Users className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
            <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-2">
              ワークスペースがありません
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              最初のワークスペースを作成してプロジェクトを始めましょう
            </p>
            <CreateWorkspaceDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                ワークスペースを作成
              </Button>
            </CreateWorkspaceDialog>
          </div>
        )}
      </main>
    </div>
  );
}
