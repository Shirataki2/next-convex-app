"use client";

import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
}

export function Header({
  title,
  breadcrumbs,
  showBack,
  backHref,
  backLabel,
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <nav className="flex items-center text-xl font-semibold">
              <Link
                href="/dashboard"
                className="text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
              >
                TaskFlow
              </Link>
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <>
                  {breadcrumbs.map((item, index) => (
                    <span key={index} className="flex items-center">
                      <span className="mx-2 text-gray-400">/</span>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-gray-900 dark:text-white">
                          {item.label}
                        </span>
                      )}
                    </span>
                  ))}
                </>
              ) : title ? (
                <>
                  <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-900 dark:text-white">{title}</span>
                </>
              ) : null}
            </nav>
            {showBack && backHref && (
              <Link
                href={backHref}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                {backLabel || "戻る"}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
