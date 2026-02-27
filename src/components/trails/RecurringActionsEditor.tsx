import { useState } from "react";
import { 
  Plus, 
  MessageSquare, 
  ClipboardCheck, 
  RefreshCw, 
  Stethoscope, 
  Pill,
  Trash2,
  Edit,
  Clock,
  Loader2,
  Repeat,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  TrailContactPoint,
  ContactPointType,
  useTrailContactPoints,
  useDeleteContactPoint
} from "@/hooks/useCareTrails";
import { RecurringActionForm } from "./RecurringActionForm";

interface RecurringActionsEditorProps {
  trailId: string;
  durationDays: number;
  specialty?: string | null;
}

type ActionCategory = "communication" | "clinical_task" | "review";

const ACTION_CATEGORIES: Record<ActionCategory, {
  label: string;
  icon: typeof MessageSquare;
  color: string;
  description: string;
}> = {
  communication: {
    label: "Comunicação / Follow-up",
    icon: MessageSquare,
    color: "bg-blue-500/10 text-blue-600",
    description: "Enviar mensagem, follow-up, lembrete ao paciente"
  },
  clinical_task: {
    label: "Tarefa Clínica",
    icon: Stethoscope,
    color: "bg-green-500/10 text-green-600",
    description: "Solicitar exames, ajustar tratamento, revisar resultados"
  },
  review: {
    label: "Revisão / Checagem",
    icon: ClipboardCheck,
    color: "bg-amber-500/10 text-amber-600",
    description: "Checar adesão, revisar sintomas, avaliar progresso"
  },
};

const RECURRENCE_LABELS: Record<string, string> = {
  once: "Única vez",
  daily: "Diária",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  custom: "Personalizada",
};

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const getRecurrenceDescription = (point: TrailContactPoint) => {
  const recType = (point as any).recurrence_type || "once";
  const interval = (point as any).recurrence_interval || 1;
  const daysOfWeek: number[] = (point as any).recurrence_days_of_week || [];
  const maxOccurrences = (point as any).recurrence_max_occurrences;

  if (recType === "once") return "Única vez";
  if (recType === "daily") return interval === 1 ? "Todo dia" : `A cada ${interval} dias`;
  if (recType === "weekly") {
    if (interval === 2) {
      const dayNames = daysOfWeek.length > 0 ? ` (${daysOfWeek.map(d => WEEKDAY_NAMES[d]).join(", ")})` : "";
      return `Quinzenal${dayNames}`;
    }
    if (daysOfWeek.length > 0) {
      return daysOfWeek.map(d => WEEKDAY_NAMES[d]).join(", ");
    }
    return interval === 1 ? "Toda semana" : `A cada ${interval} semanas`;
  }
  if (recType === "monthly") return interval === 1 ? "Todo mês" : `A cada ${interval} meses`;
  if (recType === "custom") {
    let desc = `A cada ${interval} dia(s)`;
    if (daysOfWeek.length > 0) desc += ` (${daysOfWeek.map(d => WEEKDAY_NAMES[d]).join(", ")})`;
    if (maxOccurrences) desc += ` — máx. ${maxOccurrences}x`;
    return desc;
  }
  return RECURRENCE_LABELS[recType] || recType;
};

export const RecurringActionsEditor = ({ trailId, durationDays, specialty }: RecurringActionsEditorProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | null>(null);
  const [editingPoint, setEditingPoint] = useState<TrailContactPoint | null>(null);

  const { data: contactPoints = [], isLoading } = useTrailContactPoints(trailId);
  const deletePoint = useDeleteContactPoint();

  const handleAddAction = (category: ActionCategory) => {
    setSelectedCategory(category);
    setIsAdding(true);
  };

  const handleDeletePoint = async (pointId: string) => {
    await deletePoint.mutateAsync({ id: pointId, trail_id: trailId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Ações Recorrentes</h3>
          <p className="text-sm text-muted-foreground">
            Defina tarefas que o sistema lembrará você de executar durante a trilha
          </p>
        </div>
        <Badge variant="secondary">
          {contactPoints.length} ação{contactPoints.length !== 1 ? "ões" : ""}
        </Badge>
      </div>

      {/* Action list */}
      <ScrollArea className="max-h-[350px]">
        <div className="space-y-2">
          {contactPoints.map((point) => {
            const category = (point as any).action_category as ActionCategory || "communication";
            const config = ACTION_CATEGORIES[category] || ACTION_CATEGORIES.communication;
            const Icon = config.icon;

            return (
              <Card key={point.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{point.title}</p>
                      {point.message_content && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {point.message_content}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Repeat className="h-3 w-3" />
                          {getRecurrenceDescription(point)}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Calendar className="h-3 w-3" />
                          Início: Dia {point.day_offset}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setEditingPoint(point)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeletePoint(point.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Add action button - opens form directly */}
      <Button variant="outline" className="w-full border-dashed" onClick={() => {
        setSelectedCategory("communication");
        setIsAdding(true);
      }}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Ação Recorrente
      </Button>

      {/* Suggested actions */}
      {contactPoints.length === 0 && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">💡 Sugestões de ações:</p>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
              Enviar follow-up semanal ao paciente
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-3.5 w-3.5 text-green-500" />
              Solicitar exames de controle mensais
            </div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />
              Checar adesão ao plano diariamente
            </div>
            <div className="flex items-center gap-2">
              <Pill className="h-3.5 w-3.5 text-purple-500" />
              Revisar ajuste de medicação a cada 15 dias
            </div>
          </div>
        </div>
      )}

      {/* Add Action Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Adicionar {selectedCategory && ACTION_CATEGORIES[selectedCategory].label}
            </DialogTitle>
            <DialogDescription>
              Configure a ação recorrente e sua frequência
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {selectedCategory && (
              <RecurringActionForm
                trailId={trailId}
                actionCategory={selectedCategory}
                durationDays={durationDays}
                specialty={specialty}
                onSuccess={() => {
                  setIsAdding(false);
                  setSelectedCategory(null);
                }}
                onCancel={() => {
                  setIsAdding(false);
                  setSelectedCategory(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Action Dialog */}
      <Dialog open={!!editingPoint} onOpenChange={() => setEditingPoint(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Editar Ação Recorrente</DialogTitle>
            <DialogDescription>
              Modifique a configuração desta ação
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {editingPoint && (
              <RecurringActionForm
                trailId={trailId}
                actionCategory={(editingPoint as any).action_category || "communication"}
                existingPoint={editingPoint}
                durationDays={durationDays}
                specialty={specialty}
                onSuccess={() => setEditingPoint(null)}
                onCancel={() => setEditingPoint(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
