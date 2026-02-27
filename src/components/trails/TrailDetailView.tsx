import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  MessageSquare,
  FileText,
  AlertCircle,
  Activity,
  BookOpen,
  ClipboardList,
  Bell,
  UserCog,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TrailDetailViewProps {
  enrollmentId: string;
  trailId: string;
  trailName: string;
  trailDescription?: string | null;
  currentDay: number;
  durationDays: number;
  status: string;
  startedAt: string;
  completedAt?: string | null;
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
    case "professional_task":
      return <UserCog className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getPointTypeLabel = (type: string) => {
  switch (type) {
    case "open_question": return "Pergunta aberta";
    case "closed_question": return "Pergunta fechada";
    case "educational_message": return "Mensagem educativa";
    case "structured_data": return "Dado estruturado";
    case "reminder": return "Lembrete";
    case "professional_task": return "Tarefa profissional";
    default: return type;
  }
};

export function TrailDetailView({
  enrollmentId,
  trailId,
  trailName,
  trailDescription,
  currentDay,
  durationDays,
  status,
  startedAt,
  completedAt,
  onBack,
}: TrailDetailViewProps) {
  const progress = Math.min(Math.round((currentDay / durationDays) * 100), 100);

  // Fetch contact points for this trail
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

  // Fetch responses for this enrollment
  const { data: responses = [] } = useQuery({
    queryKey: ["trail-responses-enrollment", enrollmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trail_responses")
        .select(`
          *,
          contact_point:trail_contact_points(title, point_type, structured_data_type)
        `)
        .eq("enrollment_id", enrollmentId)
        .order("responded_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const getResponseForPoint = (contactPointId: string) => {
    return responses.filter((r: any) => r.contact_point_id === contactPointId);
  };

  const formatResponseValue = (r: any) => {
    if (r.response_text) return r.response_text;
    if (r.response_numeric !== null) return String(r.response_numeric);
    if (r.response_choice) return r.response_choice;
    return "—";
  };

  const isPointDue = (dayOffset: number) => currentDay >= dayOffset;
  const isPointFuture = (dayOffset: number) => currentDay < dayOffset;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ChevronLeft className="h-4 w-4" />
        Voltar às trilhas
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{trailName}</CardTitle>
              {trailDescription && (
                <p className="text-sm text-muted-foreground mt-1">{trailDescription}</p>
              )}
            </div>
            <Badge variant={status === "active" ? "default" : "secondary"}>
              {status === "active" ? "Ativa" : status === "completed" ? "Concluída" : status === "paused" ? "Pausada" : "Encerrada"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">Dia {currentDay} de {durationDays}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Início: {format(new Date(startedAt), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            {completedAt && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                Concluída: {format(new Date(completedAt), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline of contact points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Pontos de Contato da Trilha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-6">
              {contactPoints.map((cp: any) => {
                const pointResponses = getResponseForPoint(cp.id);
                const isDue = isPointDue(cp.day_offset);
                const isFuture = isPointFuture(cp.day_offset);
                const hasResponse = pointResponses.length > 0;

                return (
                  <div key={cp.id} className="relative pl-10">
                    <div className={`absolute left-2 top-2 w-5 h-5 rounded-full flex items-center justify-center ${
                      hasResponse
                        ? "bg-green-500/20 text-green-600"
                        : isDue
                          ? "bg-amber-500/20 text-amber-600"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {getPointTypeIcon(cp.point_type)}
                    </div>

                    <div className={`border rounded-lg p-4 ${isFuture ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{cp.title}</p>
                            <Badge variant="outline" className="text-xs">
                              D+{cp.day_offset}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getPointTypeLabel(cp.point_type)}
                            </Badge>
                          </div>
                          {cp.message_content && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {cp.message_content}
                            </p>
                          )}
                        </div>
                        {hasResponse && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                        {isDue && !hasResponse && cp.requires_response && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs shrink-0">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Aguardando
                          </Badge>
                        )}
                      </div>

                      {/* Show responses */}
                      {hasResponse && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {pointResponses.map((r: any) => (
                            <div key={r.id} className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>Resposta do paciente</span>
                                <span>{format(new Date(r.responded_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                              </div>
                              <p className="text-sm font-medium">{formatResponseValue(r)}</p>
                              {r.is_critical && (
                                <Badge variant="destructive" className="mt-1 text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Resposta crítica
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {contactPoints.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 pl-10">
                  Nenhum ponto de contato configurado nesta trilha.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
