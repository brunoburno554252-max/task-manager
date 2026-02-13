import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle, Send, Users, Smile, RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Chat() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading, refetch } = trpc.chat.messages.useQuery(
    { limit: 200 },
    { refetchInterval: 3000 } // Poll every 3 seconds for new messages
  );

  const utils = trpc.useUtils();

  const sendMutation = trpc.chat.send.useMutation({
    onMutate: async ({ content }) => {
      // Optimistic update
      await utils.chat.messages.cancel();
      const prev = utils.chat.messages.getData({ limit: 200 });
      if (prev && user) {
        const optimisticMsg = {
          id: Date.now(),
          userId: user.id,
          content,
          createdAt: new Date(),
          userName: user.name,
          userRole: user.role,
        };
        utils.chat.messages.setData({ limit: 200 }, [optimisticMsg, ...prev] as any);
      }
      setMessage("");
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.chat.messages.setData({ limit: 200 }, ctx.prev);
      toast.error("Erro ao enviar mensagem");
    },
    onSettled: () => {
      utils.chat.messages.invalidate();
    },
  });

  // Sorted messages (oldest first for display)
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].reverse();
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ content: message.trim() });
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

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Chat da Equipe</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Conversa global com todos os colaboradores
            </p>
          </div>
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
      <div className="flex-1 overflow-y-auto py-4 space-y-1" ref={scrollAreaRef}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mb-3 opacity-30" />
            <p className="text-sm">Carregando mensagens...</p>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-12 w-12 opacity-20 mb-3" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs opacity-60 mt-1">Seja o primeiro a enviar uma mensagem!</p>
          </div>
        ) : (
          groupedMessages.map((group, gi) => (
            <div key={gi}>
              {/* Date Separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border/20" />
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium px-2">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-border/20" />
              </div>

              {/* Messages */}
              {group.messages.map((msg, mi) => {
                const isMe = msg.userId === user?.id;
                const initials = (msg.userName || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const prevMsg = mi > 0 ? group.messages[mi - 1] : null;
                const isSameUser = prevMsg?.userId === msg.userId;
                const timeDiff = prevMsg ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() : Infinity;
                const isGrouped = isSameUser && timeDiff < 120000; // 2 minutes

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.1 }}
                    className={`flex gap-2.5 px-2 ${isMe ? "flex-row-reverse" : ""} ${isGrouped ? "mt-0.5" : "mt-3"}`}
                  >
                    {/* Avatar */}
                    {!isGrouped ? (
                      <Avatar className={`h-8 w-8 shrink-0 ${isMe ? "bg-primary/20" : ""}`}>
                        <AvatarFallback className={`text-[10px] font-bold ${isMe ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}

                    {/* Message Bubble */}
                    <div className={`max-w-[70%] min-w-[100px] ${isMe ? "items-end" : "items-start"}`}>
                      {/* Name + Time */}
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

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card border border-border/30 rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Time for grouped messages */}
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
      <div className="border-t border-border/20 pt-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
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
    </div>
  );
}
