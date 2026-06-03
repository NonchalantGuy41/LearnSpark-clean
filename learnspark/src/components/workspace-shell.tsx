import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import type { ReactNode } from "react";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background bg-aurora">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/40 bg-background/70 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}