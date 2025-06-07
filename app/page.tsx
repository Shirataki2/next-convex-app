import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LandingHeader } from "@/components/layout/landing-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <LandingHeader />

      {/* Hero Section */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
            効率的な
            <span className="text-blue-600 dark:text-blue-400">
              {" "}
              タスク管理
            </span>
            <br />
            リアルタイム同期
          </h1>

          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            チームでのタスク管理を簡単に。リアルタイム同期でみんなの進捗を共有し、
            効率的なプロジェクト管理を実現します。
          </p>

          <SignedOut>
            <div className="space-x-4">
              <Link href="/login">
                <Button size="lg" className="px-8 py-3">
                  今すぐ始める
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 py-3">
                詳細を見る
              </Button>
            </div>
          </SignedOut>

          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="px-8 py-3">
                ダッシュボードへ移動
              </Button>
            </Link>
          </SignedIn>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🚀</span>
                <span>リアルタイム同期</span>
              </CardTitle>
              <CardDescription>
                チームメンバーの変更がリアルタイムで反映されます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Convexを使用したリアルタイムデータベースで、
                タスクの変更が即座に全メンバーに共有されます。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🔒</span>
                <span>セキュアな認証</span>
              </CardTitle>
              <CardDescription>Clerkによる安全なユーザー管理</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                業界標準のセキュリティプラクティスに基づいた
                認証システムで安心してご利用いただけます。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🎨</span>
                <span>直感的なUI</span>
              </CardTitle>
              <CardDescription>
                使いやすいドラッグ&ドロップインターフェース
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                shadcn/uiを使用したモダンで美しいインターフェースで、
                ストレスフリーなタスク管理を実現します。
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
