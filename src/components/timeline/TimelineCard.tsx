import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Activity, Pill, Stethoscope, ClipboardList, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type EventType = 
  | "consultation"
  | "diagnosis_new"
  | "diagnosis_update"
  | "treatment_start"
  | "treatment_modify"
  | "exam_request"
  | "exam_result"
  | "document_upload";

export interface TimelineEvent {
  id: string;
  type: EventType;
  date: string;
  title: string;
  summary: string;
  details?: string;
  professional?: string;
  evidenceGrade?: "A" | "B" | "C" | "D";
  tags?: string[];
  explanation?: string; // AI-generated patient-friendly explanation (for diagnoses AND treatments)
}

interface TimelineCardProps {
  event: TimelineEvent;
  isEditable: boolean;
}

const getEventIcon = (type: EventType) => {
  switch (type) {
    case "consultation":
      return <Stethoscope className="w-5 h-5" />;
    case "diagnosis_new":
    case "diagnosis_update":
      return <ClipboardList className="w-5 h-5" />;
    case "treatment_start":
    case "treatment_modify":
      return <Pill className="w-5 h-5" />;
    case "exam_request":
    case "exam_result":
      return <Activity className="w-5 h-5" />;
    case "document_upload":
      return <Upload className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
};

const getEventColor = (type: EventType) => {
  switch (type) {
    case "consultation":
      return "bg-accent/10 text-accent";
    case "diagnosis_new":
    case "diagnosis_update":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    case "treatment_start":
    case "treatment_modify":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "exam_request":
    case "exam_result":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "document_upload":
      return "bg-green-500/10 text-green-700 dark:text-green-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getEventLabel = (type: EventType) => {
  const labels: Record<EventType, string> = {
    consultation: "Consulta",
    diagnosis_new: "Novo Diagnóstico",
    diagnosis_update: "Atualização de Diagnóstico",
    treatment_start: "Tratamento Iniciado",
    treatment_modify: "Tratamento Modificado",
    exam_request: "Exame Solicitado",
    exam_result: "Resultado de Exame",
    document_upload: "Documento",
  };
  return labels[type];
};

export const TimelineCard = ({ event, isEditable }: TimelineCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div className="absolute left-0 top-6 w-3 h-3 rounded-full bg-accent border-4 border-background -translate-x-1/2" />

      {/* Card */}
      <div className="ml-8 helper-card-hover">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-lg ${getEventColor(event.type)}`}>
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {getEventLabel(event.type)}
                  </Badge>
                  {event.evidenceGrade && (
                  <Badge 
                    variant="secondary"
                    className="text-xs bg-accent/20 text-accent"
                  >
                    Evidência: {event.evidenceGrade}
                  </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-foreground text-lg">
                  {event.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(event.date)}
                  {event.professional && ` • ${event.professional}`}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Summary */}
          <p className="text-foreground mb-3">{event.summary}</p>

          {/* AI-Generated Explanation (for diagnosis and treatment events) */}
          {event.explanation && (
            event.type === "diagnosis_new" || 
            event.type === "diagnosis_update" ||
            event.type === "treatment_start" ||
            event.type === "treatment_modify"
          ) && (
            <div className="mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1">
                    {(event.type === "treatment_start" || event.type === "treatment_modify") 
                      ? "Sobre este tratamento:" 
                      : "O que isto significa para você:"}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {event.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {event.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && event.details && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {event.details}
                </p>
              </div>

              {isEditable && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    Adicionar Nota
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
