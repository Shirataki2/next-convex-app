import { SignIn, SignedOut, SignedIn, UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <SignedOut>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              ようこそ
            </h1>
            <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
              タスク管理アプリケーションへ
            </p>
          </div>
          
          <div className="mt-8 bg-white dark:bg-slate-800 py-8 px-4 shadow-xl ring-1 ring-slate-900/5 sm:rounded-lg sm:px-10">
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 
                    "bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 transition-colors",
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
      </SignedOut>
      
      <SignedIn>
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            ログイン済みです
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            ダッシュボードへリダイレクトしています...
          </p>
          <div className="flex justify-center">
            <UserButton />
          </div>
          {redirect("/dashboard")}
        </div>
      </SignedIn>
    </div>
  );
}