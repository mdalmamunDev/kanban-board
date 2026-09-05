"use client";

import { ThemeProvider } from "next-themes";
import { BoardStoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <BoardStoreProvider>{children}</BoardStoreProvider>
    </ThemeProvider>
  );
}
