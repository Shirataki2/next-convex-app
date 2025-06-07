import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function LandingHeader() {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            TaskFlow
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <SignedOut>
              <Link href="/login">
                <Button>ログイン</Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button>ダッシュボードへ</Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
}
