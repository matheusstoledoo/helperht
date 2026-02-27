import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Check,
  CheckCheck,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastDate: string;
  unreadCount: number;
}

export default function PatientMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      const patientRes = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (patientRes.data) setPatientId(patientRes.data.id);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!msgs || msgs.length === 0) {
        setLoading(false);
        return;
      }

      // Group by other participant
      const convMap = new Map<string, { msgs: any[]; unread: number }>();
      msgs.forEach((m) => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!convMap.has(otherId)) convMap.set(otherId, { msgs: [], unread: 0 });
        const conv = convMap.get(otherId)!;
        conv.msgs.push(m);
        if (!m.is_read && m.receiver_id === user.id) conv.unread++;
      });

      // Fetch user names
      const otherIds = Array.from(convMap.keys());
      const { data: users } = await supabase
        .from("users")
        .select("id, name")
        .in("id", otherIds);

      const nameMap = new Map((users || []).map((u) => [u.id, u.name]));

      const convList: Conversation[] = otherIds.map((id) => {
        const conv = convMap.get(id)!;
        const last = conv.msgs[0];
        return {
          userId: id,
          userName: nameMap.get(id) || "Usuário",
          lastMessage: last.content,
          lastDate: last.created_at,
          unreadCount: conv.unread,
        };
      });

      setConversations(convList);
      setLoading(false);
    };

    loadConversations();
  }, [user]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!user || !selectedUserId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      setMessages((data as Message[]) || []);

      // Mark as read
      await supabase
        .from("messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("sender_id", selectedUserId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    };

    loadMessages();

    // Subscribe to realtime
    const channel = supabase
      .channel(`messages-${selectedUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.receiver_id === selectedUserId) ||
            (msg.sender_id === selectedUserId && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            // Mark as read if we're the receiver
            if (msg.receiver_id === user.id) {
              supabase
                .from("messages")
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedUserId || !patientId) return;

    setSending(true);
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedUserId,
      patient_id: patientId,
      content: newMessage.trim(),
    });
    setNewMessage("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedConv = conversations.find((c) => c.userId === selectedUserId);

  if (selectedUserId) {
    return (
      <PatientLayout title="" subtitle="" showHeader={false}>
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Chat header */}
          <div className="border-b p-3 flex items-center gap-3 bg-card">
            <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {selectedConv?.userName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-medium text-sm">{selectedConv?.userName}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                      <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {format(new Date(msg.created_at), "HH:mm")}
                      </span>
                      {isMine && (
                        msg.is_read
                          ? <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                          : <Check className="h-3 w-3 text-primary-foreground/70" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex items-center gap-2 bg-card">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="flex-1"
            />
            <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout
      title="Mensagens"
      subtitle="Converse com seus profissionais de saúde"
      showHeader={false}
      breadcrumb={<PatientBreadcrumb currentPage="Mensagens" />}
    >
      <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma conversa ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Mensagens dos seus profissionais aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          conversations.map((conv) => (
            <Card
              key={conv.userId}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedUserId(conv.userId)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {conv.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{conv.userName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(conv.lastDate), "dd/MM HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <Badge className="shrink-0 rounded-full h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {conv.unreadCount}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PatientLayout>
  );
}
