"use client";

import { Suspense, useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Suspense>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </Suspense>
      <div className="flex flex-1 flex-col">
        <Suspense>
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
        </Suspense>
        <Suspense>
          <main className="flex-1 overflow-auto bg-[var(--background)] p-4 lg:p-5">
            {children}
          </main>
        </Suspense>
      </div>
    </div>
  );
}
