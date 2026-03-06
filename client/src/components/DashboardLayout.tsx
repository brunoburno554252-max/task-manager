import { useAuth } from "@/_core/hooks/useAuth";
import { LoginPage } from "./LoginPage";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { getStatusLevel } from "@/lib/statusLevels";
import LevelIcon from "@/components/LevelIcon";
import {
  LayoutDashboard, Columns3, Trophy, Award, Building2,
  Activity, LogOut, PanelLeft, User, Users, Zap, MessageCircle, Sun, Moon, Settings,
  Bell, CheckCircle2, Eye, XCircle, Clock, Loader2, Lightbulb, Star,
  AlertTriangle, ArrowRightLeft, UserPlus, UserX, Trash2, Volume2, Megaphone,
} from "lucide-react";
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Building2, label: "Projetos", path: "/kanban", adminOnly: true },
  { icon: Zap, label: "Minhas Tarefas", path: "/kanban/me", dynamic: true },
  { icon: Users, label: "Cadastros", path: "/collaborators", adminOnly: true },
  { icon: Trophy, label: "Ranking", path: "/ranking" },
  { icon: Award, label: "Conquistas", path: "/badges" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: Activity, label: "Central de Tarefas", path: "/tasks" },
  { icon: Lightbulb, label: "Caixa de Ideias", path: "/ideas" },
  { icon: Star, label: "Colaborador Destaque", path: "/highlight" },
  { icon: Megaphone, label: "Ouvidoria CEO", path: "/ouvidoria" },
  { icon: Settings, label: "Configurações", path: "/settings", adminOnly: true },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

// ==================== NOTIFICATION PANEL COMPONENT ====================
function NotificationPanel({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onClose,
  onNavigate,
  isMarkingAll,
}: {
  notifications: any[] | undefined;
  unreadCount: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  onNavigate: (path: string) => void;
  isMarkingAll: boolean;
}) {
  const getNotifIcon = (type: string) => {
    switch (type) {
      case "task_review": return <Eye className="h-4 w-4 text-purple-500" />;
      case "task_approved": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "task_rejected": return <XCircle className="h-4 w-4 text-red-500" />;
      case "task_assigned": return <UserPlus className="h-4 w-4 text-cyan-500" />;
      case "task_created": return <Zap className="h-4 w-4 text-indigo-500" />;
      case "task_status_changed": return <ArrowRightLeft className="h-4 w-4 text-amber-500" />;
      case "task_overdue": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "user_status_changed": return <UserX className="h-4 w-4 text-amber-500" />;
      case "user_deleted": return <Trash2 className="h-4 w-4 text-red-500" />;
      case "idea_approved": return <Lightbulb className="h-4 w-4 text-emerald-500" />;
      case "idea_rejected": return <XCircle className="h-4 w-4 text-red-400" />;
      case "idea_analysis": return <Eye className="h-4 w-4 text-blue-500" />;
      case "highlight_points": return <Star className="h-4 w-4 text-yellow-500" />;
      case "chat_message": return <MessageCircle className="h-4 w-4 text-blue-400" />;
      case "complaint_new": return <Megaphone className="h-4 w-4 text-red-500" />;
      case "complaint_status_changed": return <ArrowRightLeft className="h-4 w-4 text-purple-500" />;
      case "complaint_resolved": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "complaint_response": return <MessageCircle className="h-4 w-4 text-cyan-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotifBg = (type: string) => {
    switch (type) {
      case "task_review": return "bg-purple-500/10";
      case "task_approved": return "bg-emerald-500/10";
      case "task_rejected": return "bg-red-500/10";
      case "task_assigned": return "bg-cyan-500/10";
      case "task_created": return "bg-indigo-500/10";
      case "task_status_changed": return "bg-amber-500/10";
      case "task_overdue": return "bg-red-500/10";
      case "user_status_changed": return "bg-amber-500/10";
      case "user_deleted": return "bg-red-500/10";
      case "idea_approved": return "bg-emerald-500/10";
      case "idea_rejected": return "bg-red-400/10";
      case "idea_analysis": return "bg-blue-500/10";
      case "highlight_points": return "bg-yellow-500/10";
      case "chat_message": return "bg-blue-400/10";
      case "complaint_new": return "bg-red-500/10";
      case "complaint_status_changed": return "bg-purple-500/10";
      case "complaint_resolved": return "bg-emerald-500/10";
      case "complaint_response": return "bg-cyan-500/10";
      default: return "bg-blue-500/10";
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="w-[380px] max-h-[520px] bg-card border border-border/40 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-foreground">Notificações</h3>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              disabled={isMarkingAll}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              {isMarkingAll ? (
                <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Marcando...</span>
              ) : (
                "Marcar todas como lidas"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {(!notifications || notifications.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground/60">Nenhuma notificação</p>
            <p className="text-xs text-muted-foreground/40 mt-1">Você será notificado sobre atualizações importantes</p>
          </div>
        ) : (
          notifications.slice(0, 30).map((n: any, idx: number) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.isRead) onMarkRead(n.id);
                if (n.entityType === "chat") {
                  onNavigate("/chat");
                } else if (n.type === "task_overdue" && n.entityId) {
                  onNavigate("/tasks?status=overdue");
                } else if (n.entityType === "task" && n.entityId) {
                  if (n.taskAssigneeId) {
                    onNavigate(`/kanban/${n.taskAssigneeId}`);
                  } else {
                    onNavigate("/tasks");
                  }
                } else if (n.entityType === "user") {
                  onNavigate("/collaborators");
                } else if (n.entityType === "idea") {
                  onNavigate("/ideas");
                } else if (n.entityType === "highlight") {
                  onNavigate("/highlight");
                } else if (n.entityType === "complaint") {
                  onNavigate("/ouvidoria");
                }
                onClose();
              }}
              className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-all hover:bg-muted/30 border-b border-border/10 last:border-b-0 ${
                !n.isRead ? "bg-primary/[0.03]" : ""
              }`}
            >
              {/* Icon */}
              <div className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${getNotifBg(n.type)}`}>
                {getNotifIcon(n.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-[13px] leading-snug ${!n.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                    {n.title}
                  </p>
                  {!n.isRead && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1 ring-2 ring-primary/20" />
                  )}
                </div>
                {n.message && (
                  <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground/40" />
                  <span className="text-[11px] text-muted-foreground/50 font-medium">{getTimeAgo(n.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== MAIN LAYOUT ====================
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  // Ouvidoria pública não precisa de login nem sidebar
  if (window.location.pathname === '/ouvidoria-publica') {
    return <>{children}</>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => location.startsWith(item.path) && item.path !== "/") || menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  // Unread chat messages badge
  const { data: recentMessages } = trpc.chat.messages.useQuery(
    { limit: 20 },
    { refetchInterval: 10000 }
  );
  const unreadCount = useMemo(() => {
    if (!recentMessages || !user) return 0;
    const lastSeen = parseInt(localStorage.getItem("chat-last-seen") || "0");
    return recentMessages.filter(m => new Date(m.createdAt).getTime() > lastSeen && m.userId !== user.id).length;
  }, [recentMessages, user]);

  // Overdue tasks badge
  const { data: dashStats } = trpc.dashboard.stats.useQuery(undefined, { refetchInterval: 30000 });
  const overdueCount = dashStats?.overdue ?? 0;

  // Notifications
  const { data: unreadNotifCount, refetch: refetchNotifCount } = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 10000 });
  const { data: notifList, refetch: refetchNotifs } = trpc.notifications.list.useQuery(undefined, { refetchInterval: 10000 });
  const markReadMutation = trpc.notifications.markRead.useMutation({ onSuccess: () => { refetchNotifCount(); refetchNotifs(); } });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { refetchNotifCount(); refetchNotifs(); } });
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const prevUnreadCount = useRef<number>(0);
  const [bellShake, setBellShake] = useState(false);

  // Notification sound system
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // First tone (higher pitch)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.3);

      // Second tone (even higher, delayed)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.15); // D6
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.15, audioCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc2.start(audioCtx.currentTime + 0.15);
      osc2.stop(audioCtx.currentTime + 0.5);

      // Third tone (highest, pleasant chime)
      const osc3 = audioCtx.createOscillator();
      const gain3 = audioCtx.createGain();
      osc3.connect(gain3);
      gain3.connect(audioCtx.destination);
      osc3.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.3); // E6
      osc3.type = 'sine';
      gain3.gain.setValueAtTime(0, audioCtx.currentTime);
      gain3.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
      osc3.start(audioCtx.currentTime + 0.3);
      osc3.stop(audioCtx.currentTime + 0.7);

      // Cleanup
      setTimeout(() => audioCtx.close(), 1000);
    } catch (e) {
      // Silently fail if audio is not available
    }
  }, []);

  // Play sound and shake bell when new notifications arrive
  useEffect(() => {
    const currentCount = unreadNotifCount ?? 0;
    if (currentCount > prevUnreadCount.current && prevUnreadCount.current >= 0) {
      // New notification arrived!
      if (prevUnreadCount.current > 0 || currentCount > 0) {
        playNotificationSound();
        setBellShake(true);
        setTimeout(() => setBellShake(false), 1000);
      }
    }
    prevUnreadCount.current = currentCount;
  }, [unreadNotifCount, playNotificationSound]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  // Mark as read when visiting chat
  useEffect(() => {
    if (location === "/chat") {
      localStorage.setItem("chat-last-seen", Date.now().toString());
    }
  }, [location]);

  // Registrar acesso à plataforma (page_view a cada navegação, throttled)
  const logAccessMutation = trpc.access.log.useMutation();
  const lastLoggedPage = useRef<string>("");
  const lastLoggedTime = useRef<number>(0);
  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    // Throttle: só registra se mudou de página ou passou 5 minutos
    if (location === lastLoggedPage.current && now - lastLoggedTime.current < 5 * 60 * 1000) return;
    lastLoggedPage.current = location;
    lastLoggedTime.current = now;
    logAccessMutation.mutate({ action: "page_view", page: location });
  }, [location, user]);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Notification bell component (reusable for desktop header and mobile)
  const NotificationBell = ({ className = "" }: { className?: string }) => (
    <div className={`relative ${className}`} ref={notifRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className={`relative p-2 rounded-xl transition-all ${
          showNotifications
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Notifica\u00e7\u00f5es"
      >
        <Bell className={`h-5 w-5 transition-transform ${bellShake ? 'animate-bounce' : ''}`} />
        {(unreadNotifCount ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background animate-in zoom-in duration-200">
            {(unreadNotifCount ?? 0) > 9 ? "9+" : unreadNotifCount}
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
          </span>
        )}
      </button>
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 z-[60]">
          <NotificationPanel
            notifications={notifList}
            unreadCount={unreadNotifCount ?? 0}
            onMarkRead={(id) => markReadMutation.mutate({ id })}
            onMarkAllRead={() => markAllReadMutation.mutate()}
            onClose={() => setShowNotifications(false)}
            onNavigate={setLocation}
            isMarkingAll={markAllReadMutation.isPending}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain shrink-0" />
                  <span className="font-bold tracking-tight truncate text-sm gradient-text">
                    Agenda do CEO
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1 space-y-0.5">
              {menuItems.filter(item => !(item as any).adminOnly || user?.role === "admin").map(item => {
                const resolvedPath = (item as any).dynamic && user ? `/kanban/${user.id}` : item.path;
                const isActive = (item as any).dynamic ? location === `/kanban/${user?.id}` : location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(resolvedPath)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal ${isActive ? "bg-primary/10 text-primary font-medium shadow-sm shadow-primary/5" : "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"}`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span>{item.label}</span>
                      {item.path === "/chat" && unreadCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                      {item.path === "/kanban" && overdueCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {overdueCount > 9 ? "9+" : overdueCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            {/* Theme Toggle */}
            {toggleTheme && (
              <div className="px-2 mb-2">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-sidebar-accent transition-all text-sidebar-foreground/70 hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
                  aria-label="Alternar tema"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 shrink-0" />
                  ) : (
                    <Moon className="h-4 w-4 shrink-0" />
                  )}
                  <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
                    {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                  </span>
                </button>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 shrink-0">
                    {(user as any)?.avatarUrl ? (
                      <AvatarImage src={(user as any).avatarUrl} alt={user?.name || ""} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate leading-none">
                        {user?.name || "-"}
                      </p>
                      {user?.role === "admin" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-semibold bg-primary/20 text-primary border-0">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {(() => {
                        const level = getStatusLevel((user as any)?.totalPoints || 0);
                        return (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${level.bgColor} ${level.color}`}>
                            <LevelIcon level={level} size="sm" showBg={false} /> {level.name}
                          </span>
                        );
                      })()}
                      <span className="text-[10px] text-muted-foreground">&bull;</span>
                      <span className="text-[10px] text-amber-400 font-medium">{(user as any)?.totalPoints || 0} pts</span>
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/profile")}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* TOP HEADER BAR - Desktop & Mobile */}
        <div className="flex border-b border-border/50 h-14 items-center justify-between bg-background/95 px-3 md:px-5 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />}
            <div className="flex items-center gap-1.5 text-sm">
              {isMobile ? (
                <>
                  <button onClick={() => setLocation("/")} className="text-muted-foreground hover:text-foreground transition-colors">
                    Agenda do CEO
                  </button>
                  <span className="text-muted-foreground/50">/</span>
                </>
              ) : null}
              <span className="font-semibold text-foreground">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
          </div>

          {/* Right side - Notification bell + overdue badge */}
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <button
                onClick={() => setLocation("/tasks?status=overdue")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 text-red-500 text-xs font-semibold hover:bg-red-500/15 transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
              </button>
            )}
            <NotificationBell />
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
