import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Sparkles, LayoutGrid, BookOpen, LogOut, Flame } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotebooks, getProfile } from "@/lib/notebooks.functions";

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const listFn = useServerFn(listNotebooks);
  const profileFn = useServerFn(getProfile);
  const { data: notebooks = [] } = useQuery({ queryKey: ["notebooks"], queryFn: () => listFn() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-gradient shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-serif text-xl">LearnSpark</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/dashboard"}>
                  <Link to="/dashboard"><LayoutGrid className="h-4 w-4" /><span>All notebooks</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {notebooks.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Notebooks</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {notebooks.map((n: any) => (
                  <SidebarMenuItem key={n.id}>
                    <SidebarMenuButton asChild isActive={path.includes(n.id)}>
                      <Link to="/notebooks/$id" params={{ id: n.id }}>
                        <span className="text-base">{n.emoji}</span>
                        <span className="truncate">{n.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {profile && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-sidebar-accent/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-glow">
              <Flame className="h-3.5 w-3.5" />
              <span className="font-medium">{profile.streak ?? 0} day streak</span>
            </div>
            <span className="font-medium text-foreground">{profile.xp ?? 0} XP</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-2 text-xs">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-gradient text-[10px] font-medium text-primary-foreground">
            {(profile?.display_name ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 truncate text-muted-foreground">{profile?.display_name ?? user?.email}</div>
          <button onClick={() => signOut()} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" aria-label="Sign out">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}