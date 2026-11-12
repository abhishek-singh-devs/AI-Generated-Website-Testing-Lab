import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { LayoutDashboard, PlayCircle, History, Layers, Settings, LogOut, Plus, FlaskConical, ChevronsUpDown } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/lab/common";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, settingsQuery } from "@/lib/lab-data";

const NAV = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "New Test", url: "/tests/new", icon: PlayCircle },
  { title: "Test History", url: "/history", icon: History },
  { title: "Test Suites", url: "/suites", icon: Layers },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/tests/new": "New Test",
  "/history": "Test History",
  "/suites": "Test Suites",
  "/settings": "Settings",
};

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile } = useSidebar();
  const isActive = (url: string) => pathname === url || (url === "/history" && pathname.startsWith("/runs/"));

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden" onClick={() => setOpenMobile(false)}>
          <Logo className="shrink-0" />
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold">Testing Lab</div>
            <div className="truncate text-[11px] text-muted-foreground">AI website QA</div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} className="h-9">
                    <Link to={item.url} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="rounded-xl border border-primary/20 bg-primary/8 p-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-xs font-medium text-primary-glow">
            <FlaskConical className="size-3.5" /> Simulation mode
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Page fetch checks are real. Browser rendering and AI review are simulated until a provider is connected.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function UserMenu() {
  const { data: user } = useQuery(meQuery);
  const { data: settings } = useQuery(settingsQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const name = settings?.display_name || (user?.user_metadata?.["full_name"] as string | undefined) || user?.email?.split("@")[0] || "You";
  const initials = name.slice(0, 2).toUpperCase();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:px-2">
          <span className="grid size-7 place-items-center rounded-full bg-gradient-primary text-[11px] font-semibold text-primary-foreground">
            {initials}
          </span>
          <span className="hidden max-w-[140px] truncate text-sm sm:inline">{name}</span>
          <ChevronsUpDown className="hidden size-3.5 text-muted-foreground sm:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="mr-2 size-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = TITLES[pathname] ?? (pathname.startsWith("/runs/") ? "Run details" : "Testing Lab");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/70 bg-background/80 px-3 backdrop-blur-xl sm:px-5">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-5" />
            <h2 className="truncate text-sm font-medium">{title}</h2>
            <div className="ml-auto flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="hidden items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning lg:inline-flex">
                    <span className="size-1.5 rounded-full bg-warning" /> Demo execution
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Runs fetch the real page for HTTP, HTML and header checks. Rendering, Core Web Vitals and AI review are simulated.
                </TooltipContent>
              </Tooltip>
              {pathname !== "/tests/new" && (
                <Button asChild variant="glow" size="sm">
                  <Link to="/tests/new">
                    <Plus /> <span className="hidden sm:inline">New test</span>
                  </Link>
                </Button>
              )}
              <UserMenu />
            </div>
          </header>
          <main className="relative flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-glow opacity-60" aria-hidden />
            <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}