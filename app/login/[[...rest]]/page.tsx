"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";

export default function LoginPage() {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <>
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          {/* Back to Home */}
          <div className="text-center">
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← ホームに戻る
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              TaskFlowへログイン
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              アカウントにサインインしてタスク管理を始めましょう
            </p>
          </div>

          <div className="mt-8 px-6">
            <SignIn
              appearance={{
                baseTheme: currentTheme === "dark" ? dark : undefined,
              }}
              forceRedirectUrl="/dashboard"
              signUpForceRedirectUrl="/dashboard"
            />
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              アカウントをお持ちでない方は、サインアップからご登録ください
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
