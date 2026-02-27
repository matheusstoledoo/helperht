import { useState } from "react";
import { 
  Plus, 
  MessageSquare, 
  HelpCircle, 
  BarChart3, 
  Bell, 
  ClipboardList,
  GripVertical,
  Trash2,
  Edit,
  Clock,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  useCreateContactPoint,
  useDeleteContactPoint
} from "@/hooks/useCareTrails";
import { ContactPointForm } from "./ContactPointForm";

interface TrailTimelineEditorProps {
  trailId: string;
  durationDays: number;
  specialty?: string | null;
}

const POINT_TYPE_CONFIG: Record<ContactPointType, { 
  icon: typeof MessageSquare; 
  label: string; 
  color: string;
  description: string;
}> = {
  educational_message: { 
    icon: MessageSquare, 
    label: "Mensagem Educativa", 
    color: "bg-blue-500/10 text-blue-600",
    description: "Envie conteúdo educativo ao paciente"
  },
  open_question: { 
    icon: HelpCircle, 
    label: "Pergunta Aberta", 
    color: "bg-purple-500/10 text-purple-600",
    description: "Faça uma pergunta de texto livre"
  },
  closed_question: { 
    icon: ClipboardList, 
    label: "Pergunta Fechada", 
    color: "bg-indigo-500/10 text-indigo-600",
    description: "Pergunta com opções de resposta"
  },
  structured_data: { 
    icon: BarChart3, 
    label: "Dados Estruturados", 
    color: "bg-green-500/10 text-green-600",
    description: "Solicite dados como glicemia, peso, etc."
  },
  reminder: { 
    icon: Bell, 
    label: "Lembrete", 
    color: "bg-amber-500/10 text-amber-600",
    description: "Lembre sobre medicação, exercício, etc."
  },
  professional_task: { 
    icon: ClipboardList, 
    label: "Tarefa para Profissional", 
    color: "bg-red-500/10 text-red-600",
    description: "Gere uma tarefa para você mesmo"
  },
};

export const TrailTimelineEditor = ({ trailId, durationDays, specialty }: TrailTimelineEditorProps) => {
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [selectedPointType, setSelectedPointType] = useState<ContactPointType | null>(null);
  const [editingPoint, setEditingPoint] = useState<TrailContactPoint | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  const { data: contactPoints = [], isLoading } = useTrailContactPoints(trailId);
  const createPoint = useCreateContactPoint();
  const deletePoint = useDeleteContactPoint();

  // Generate day markers based on duration
  const dayMarkers = Array.from({ length: Math.min(durationDays + 1, 31) }, (_, i) => i);

  // Group contact points by day
  const pointsByDay = contactPoints.reduce((acc, point) => {
    const day = point.day_offset;
    if (!acc[day]) acc[day] = [];
    acc[day].push(point);
    return acc;
  }, {} as Record<number, TrailContactPoint[]>);

  const handleAddPointType = (type: ContactPointType, day: number) => {
    setSelectedPointType(type);
    setSelectedDay(day);
    setIsAddingPoint(true);
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
          <h3 className="font-semibold">Timeline de Pontos de Contato</h3>
          <p className="text-sm text-muted-foreground">
            Organize os pontos de contato ao longo da trilha
          </p>
        </div>
        <Badge variant="secondary">
          {contactPoints.length} ponto{contactPoints.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Horizontal Timeline with proper scrolling */}
      <div className="border rounded-lg bg-muted/30">
        <ScrollArea className="w-full">
          <div className="flex gap-4 p-4 min-w-max">
            {dayMarkers.map((day) => (
              <div key={day} className="flex flex-col items-center w-[180px] shrink-0">
                {/* Day Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center text-sm font-medium">
                    {day}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Dia {day}
                  </span>
                </div>

                {/* Contact Points for this day */}
                <div className="space-y-2 min-h-[120px] w-full">
                  {pointsByDay[day]?.map((point) => {
                    const config = POINT_TYPE_CONFIG[point.point_type];
                    const Icon = config.icon;
                    
                    return (
                      <Card 
                        key={point.id} 
                        className="group cursor-pointer hover:shadow-md transition-shadow bg-background"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 cursor-grab">
                              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className={`p-1.5 rounded ${config.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {point.title}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Clock className="h-3 w-3" />
                                {String(point.hour_of_day).padStart(2, '0')}:
                                {String(point.minute_of_day).padStart(2, '0')}
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => setEditingPoint(point)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleDeletePoint(point.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Add Point Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-dashed bg-background"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Adicionar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                      {Object.entries(POINT_TYPE_CONFIG).map(([type, config]) => {
                        const Icon = config.icon;
                        return (
                          <DropdownMenuItem
                            key={type}
                            onClick={() => handleAddPointType(type as ContactPointType, day)}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {config.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Add Point Dialog */}
      <Dialog open={isAddingPoint} onOpenChange={setIsAddingPoint}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Adicionar {selectedPointType && POINT_TYPE_CONFIG[selectedPointType].label}
            </DialogTitle>
            <DialogDescription>
              Configure o ponto de contato para o dia {selectedDay}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {selectedPointType && (
              <ContactPointForm
                trailId={trailId}
                pointType={selectedPointType}
                defaultDay={selectedDay}
                specialty={specialty}
                onSuccess={() => {
                  setIsAddingPoint(false);
                  setSelectedPointType(null);
                }}
                onCancel={() => {
                  setIsAddingPoint(false);
                  setSelectedPointType(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Point Dialog */}
      <Dialog open={!!editingPoint} onOpenChange={() => setEditingPoint(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Editar Ponto de Contato</DialogTitle>
            <DialogDescription>
              Modifique as configurações deste ponto de contato
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {editingPoint && (
              <ContactPointForm
                trailId={trailId}
                pointType={editingPoint.point_type}
                existingPoint={editingPoint}
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
