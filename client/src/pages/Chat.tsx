import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, Send, Users, RefreshCw, Building2, Hash, ChevronLeft,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ChatChannel = {
  id: number; // 0 = general
  name: string;
  color: string;
  isGeneral?: boolean;
};

export default function Chat() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [message, setMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch companies for channel list
  const { data: companies } = trpc.companies.list.useQuery();

  // Build channels list
  const channels: ChatChannel[] = useMemo(() => {
    const list: ChatChannel[] = [
      { id: 0, name: "Geral", color: "#6366f1", isGeneral: true },
    ];
    if (companies) {
      companies.forEach((c: any) => {
        list.push({ id: c.id, name: c.name, color: c.color || "#6366f1" });
      });
    }
    return list;
  }, [companies]);

  // Auto-select first channel
  useEffect(() => {
    if (!selectedChannel && channels.length > 0) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  const queryCompanyId = selectedChannel?.isGeneral ? 0 : selectedChannel?.id;

  const { data: messages, isLoading, refetch } = trpc.chat.messages.useQuery(
    { limit: 200, companyId: queryCompanyId },
    { refetchInterval: 3000, enabled: selectedChannel !== null }
  );

  const utils = trpc.useUtils();

  const sendMutation = trpc.chat.send.useMutation({
    onMutate: async ({ content }) => {
      await utils.chat.messages.cancel();
      const prev = utils.chat.messages.getData({ limit: 200, companyId: queryCompanyId });
      if (prev && user) {
        const optimisticMsg = {
          id: Date.now(),
          userId: user.id,
          companyId: selectedChannel?.isGeneral ? null : selectedChannel?.id ?? null,
          content,
          createdAt: new Date(),
          userName: user.name,
          userRole: user.role,
        };
        utils.chat.messages.setData({ limit: 200, companyId: queryCompanyId }, [optimisticMsg, ...prev] as any);
      }
      setMessage("");
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.chat.messages.setData({ limit: 200, companyId: queryCompanyId }, ctx.prev);
      toast.error("Erro ao enviar mensagem");
    },
    onSettled: () => {
      utils.chat.messages.invalidate();
    },
  });

  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].reverse();
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages.length]);

  const handleSend = () => {
    if (!message.trim() || !selectedChannel) return;
    sendMutation.mutate({
      content: message.trim(),
      companyId: selectedChannel.isGeneral ? undefined : selectedChannel.id,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: typeof sortedMessages }[] = [];
    let currentDate = "";

    sortedMessages.forEach(msg => {
      const msgDate = new Date(msg.createdAt).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });

    return groups;
  }, [sortedMessages]);

  // Mark as read
  useEffect(() => {
    if (selectedChannel) {
      localStorage.setItem("chat-last-seen", Date.now().toString());
    }
  }, [selectedChannel, sortedMessages.length]);

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-0 -m-4 md:-m-6">
      {/* Channels Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-border/20 flex flex-col bg-card/50 shrink-0 overflow-hidden"
          >
            <div className="p-4 border-b border-border/20">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Canais de Chat
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Selecione um grupo para conversar
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {channels.map(ch => {
                const isActive = selectedChannel?.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-foreground/70 hover:bg-muted/20 hover:text-foreground"
                    }`}
                  >
                    {ch.isGeneral ? (
                      <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <Hash className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: ch.color + "20" }}
                      >
                        <Building2 className="h-4 w-4" style={{ color: ch.color }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                        {ch.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {ch.isGeneral ? "Todos os colaboradores" : "Membros do projeto"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-card/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted/20 transition-colors"
            >
              {showSidebar ? <ChevronLeft className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            </button>
            {selectedChannel && (
              <div className="flex items-center gap-2">
                {selectedChannel.isGeneral ? (
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Hash className="h-4 w-4 text-primary" />
                  </div>
                ) : (
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: selectedChannel.color + "20" }}
                  >
                    <Building2 className="h-4 w-4" style={{ color: selectedChannel.color }} />
                  </div>
                )}
                <div>
                  <h1 className="text-sm font-bold">{selectedChannel.name}</h1>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" />
                    {selectedChannel.isGeneral ? "Chat geral" : "Chat do projeto"}
                  </p>
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1" ref={scrollAreaRef}>
          {!selectedChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm">Selecione um canal para começar</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mb-3 opacity-30" />
              <p className="text-sm">Carregando mensagens...</p>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs opacity-60 mt-1">Seja o primeiro a enviar uma mensagem neste canal!</p>
            </div>
          ) : (
            groupedMessages.map((group, gi) => (
              <div key={gi}>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border/20" />
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium px-2">
                    {group.date}
                  </span>
                  <div className="flex-1 h-px bg-border/20" />
                </div>

                {group.messages.map((msg, mi) => {
                  const isMe = msg.userId === user?.id;
                  const initials = (msg.userName || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const prevMsg = mi > 0 ? group.messages[mi - 1] : null;
                  const isSameUser = prevMsg?.userId === msg.userId;
                  const timeDiff = prevMsg ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() : Infinity;
                  const isGrouped = isSameUser && timeDiff < 120000;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.1 }}
                      className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""} ${isGrouped ? "mt-0.5" : "mt-3"}`}
                    >
                      {!isGrouped ? (
                        <Avatar className={`h-8 w-8 shrink-0 ${isMe ? "bg-primary/20" : ""}`}>
                          {(msg as any).userAvatarUrl ? (
                            <AvatarImage src={(msg as any).userAvatarUrl} alt={msg.userName || ""} className="object-cover" />
                          ) : null}
                          <AvatarFallback className={`text-[10px] font-bold ${isMe ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 shrink-0" />
                      )}

                      <div className={`max-w-[70%] min-w-[100px] ${isMe ? "items-end" : "items-start"}`}>
                        {!isGrouped && (
                          <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                            <span className="text-xs font-medium">{msg.userName || "Anônimo"}</span>
                            {msg.userRole === "admin" && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-primary/20 text-primary border-0">
                                Admin
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground/50">
                              {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-card border border-border/30 rounded-tl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>

                        {isGrouped && (
                          <span className={`text-[9px] text-muted-foreground/40 mt-0.5 block ${isMe ? "text-right" : ""}`}>
                            {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {selectedChannel && (
          <div className="border-t border-border/20 px-4 py-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Mensagem em ${selectedChannel.name}...`}
                  rows={1}
                  className="w-full resize-none rounded-xl bg-card/80 border border-border/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50 max-h-[120px]"
                  style={{ minHeight: "44px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "44px";
                    target.style.height = Math.min(target.scrollHeight, 120) + "px";
                  }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">
              Pressione Enter para enviar, Shift+Enter para nova linha
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
