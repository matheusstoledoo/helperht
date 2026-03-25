import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send, RefreshCw, Bot, User, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DifyChatTabProps {
  userId: string;
}

export const DifyChatTab = ({ userId }: DifyChatTabProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("dify-chat", {
        body: {
          query,
          conversation_id: conversationId,
          user: userId,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.conversation_id) {
        setConversationId(data.conversation_id);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "Sem resposta." },
      ]);
    } catch (e: any) {
      toast.error("Erro ao enviar mensagem. Tente novamente.");
      console.error("Dify chat error:", e);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
  };

  return (
    <div className="space-y-4">
      {/* Chat messages area */}
      <Card className="border">
        <CardContent className="p-0">
          <div
            ref={scrollRef}
            className="h-[400px] overflow-y-auto p-4 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <MessageCircle className="h-12 w-12 text-primary/40" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Assistente de Saúde
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Tire dúvidas sobre exames, medicamentos, sintomas e saúde em
                    geral. As respostas são informativas e não substituem
                    orientação médica.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {[
                    "O que significa colesterol LDL alto?",
                    "Como melhorar a qualidade do sono?",
                    "O que é hemoglobina glicada?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full border bg-muted/50 hover:bg-muted transition-colors text-muted-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input area */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Digite sua dúvida sobre saúde..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={1}
          className="flex-1 min-h-[44px] max-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="h-11 w-11 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {messages.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={startNewConversation}
          className="w-full gap-2 text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Nova conversa
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        ⚕️ Este assistente é informativo e não substitui a orientação do seu
        profissional de saúde.
      </p>
    </div>
  );
};
