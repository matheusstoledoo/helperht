import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  BookOpen,
  ClipboardList,
  Bell,
  Send,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PatientTrailInteractionProps {
  enrollmentId: string;
  trailId: string;
  trailName: string;
  trailDescription?: string | null;
  currentDay: number;
  durationDays: number;
  status: string;
  startedAt: string;
  onBack: () => void;
}

const getPointTypeIcon = (type: string) => {
  switch (type) {
    case "open_question":
    case "closed_question":
      return <MessageSquare className="h-4 w-4" />;
    case "educational_message":
      return <BookOpen className="h-4 w-4" />;
    case "structured_data":
      return <ClipboardList className="h-4 w-4" />;
    case "reminder":
      return <Bell className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

export function PatientTrailInteraction({
  enrollmentId,
  trailId,
  trailName,
  trailDescription,
  currentDay,
  durationDays,
  status,
  startedAt,
  onBack,
}: PatientTrailInteractionProps) {
  const queryClient = useQueryClient();
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const progress = Math.min(Math.round((currentDay / durationDays) * 100), 100);

  const { data: contactPoints = [] } = useQuery({
    queryKey: ["trail-contact-points", trailId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trail_contact_points")
        .select("*")
        .eq("trail_id", trailId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: responses = [], refetch: refetchResponses } = useQuery({
    queryKey: ["trail-responses-enrollment", enrollmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trail_responses")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .order("responded_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const submitResponse = useMutation({
    mutationFn: async ({ contactPointId, text }: { contactPointId: string; text: string }) => {
      const { error } = await supabase
        .from("trail_responses")
        .insert({
          enrollment_id: enrollmentId,
          contact_point_id: contactPointId,
          response_type: "text",
          response_text: text,
          responded_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success("Resposta enviada!");
      setResponseTexts((prev) => ({ ...prev, [vars.contactPointId]: "" }));
      refetchResponses();
      queryClient.invalidateQueries({ queryKey: ["patient-trail-responses"] });
    },
    onError: () => {
      toast.error("Erro ao enviar resposta.");
    },
  });

  const getResponsesForPoint = (cpId: string) =>
    responses.filter((r: any) => r.contact_point_id === cpId);

  const isDue = (dayOffset: number) => currentDay >= dayOffset;

  // Only show points that are due (past or current day)
  const duePoints = contactPoints.filter((cp: any) => isDue(cp.day_offset));
  const futurePoints = contactPoints.filter((cp: any) => !isDue(cp.day_offset));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground hover:text-foreground">
        ← Voltar às trilhas
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{trailName}</CardTitle>
          {trailDescription && (
            <p className="text-sm text-muted-foreground">{trailDescription}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Seu progresso</span>
              <span className="font-medium">Dia {currentDay} de {durationDays}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Iniciada em {format(new Date(startedAt), "dd/MM/yyyy", { locale: ptBR })}
          </div>
        </CardContent>
      </Card>

      {/* Due contact points - patient can interact */}
      {duePoints.length > 0 && (
        <div className="space-y-4">
          {duePoints.map((cp: any) => {
            const pointResponses = getResponsesForPoint(cp.id);
            const hasResponse = pointResponses.length > 0;
            const isQuestion = cp.point_type === "open_question" || cp.point_type === "closed_question" || cp.point_type === "structured_data";
            const needsResponse = cp.requires_response && !hasResponse;

            return (
              <Card key={cp.id} className={needsResponse ? "border-primary/50" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      hasResponse ? "bg-green-500/10 text-green-600" : needsResponse ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {getPointTypeIcon(cp.point_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{cp.title}</p>
                        <Badge variant="outline" className="text-xs">D+{cp.day_offset}</Badge>
                        {hasResponse && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      {cp.message_content && (
                        <p className="text-sm text-muted-foreground mt-1">{cp.message_content}</p>
                      )}
                    </div>
                  </div>

                  {/* Show existing responses */}
                  {hasResponse && (
                    <div className="space-y-2 pl-11">
                      {pointResponses.map((r: any) => (
                        <div key={r.id} className="bg-primary/5 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            Sua resposta • {format(new Date(r.responded_at), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-sm">{r.response_text || r.response_numeric || r.response_choice || "—"}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Response input for questions without response */}
                  {needsResponse && isQuestion && (
                    <div className="pl-11 flex gap-2">
                      <Textarea
                        placeholder="Digite sua resposta..."
                        value={responseTexts[cp.id] || ""}
                        onChange={(e) => setResponseTexts((prev) => ({ ...prev, [cp.id]: e.target.value }))}
                        className="min-h-[60px]"
                      />
                      <Button
                        size="icon"
                        className="shrink-0 self-end"
                        disabled={!responseTexts[cp.id]?.trim() || submitResponse.isPending}
                        onClick={() => submitResponse.mutate({ contactPointId: cp.id, text: responseTexts[cp.id] })}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upcoming points */}
      {futurePoints.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Próximos passos ({futurePoints.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {futurePoints.map((cp: any) => (
              <div key={cp.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 opacity-60">
                <div className="p-1.5 rounded bg-muted text-muted-foreground">
                  {getPointTypeIcon(cp.point_type)}
                </div>
                <div>
                  <p className="text-sm">{cp.title}</p>
                  <p className="text-xs text-muted-foreground">Dia {cp.day_offset}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {duePoints.length === 0 && futurePoints.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Nenhum ponto de contato nesta trilha ainda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
