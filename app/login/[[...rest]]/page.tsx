import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
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
                elements: {
                  formButtonPrimary: 
                    "bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors",
                  card: "shadow-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                },
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