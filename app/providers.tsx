"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { jaJP } from "@clerk/localizations";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider localization={jaJP}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ConvexProvider client={convex}>{children}</ConvexProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
