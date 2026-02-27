import { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  SkipForward, 
  XCircle, 
  Loader2,
  CalendarClock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  TaskWithPatient,
  useTodayTasks, 
  useCompleteTask, 
  usePostponeTask, 
  useIgnoreTask 
} from "@/hooks/useTrailTasks";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendente", variant: "outline" },
  completed: { label: "Concluída", variant: "default" },
  postponed: { label: "Adiada", variant: "secondary" },
  ignored: { label: "Ignorada", variant: "destructive" },
};

export const DailyTasksList = () => {
  const { data: realTasks = [], isLoading } = useTodayTasks();
  const completeTask = useCompleteTask();
  const postponeTask = usePostponeTask();
  const ignoreTask = useIgnoreTask();

  const [postponeDialogTask, setPostponeDialogTask] = useState<TaskWithPatient | null>(null);
  const [ignoreDialogTask, setIgnoreDialogTask] = useState<TaskWithPatient | null>(null);
  const [postponeDate, setPostponeDate] = useState("");
  const [ignoreReason, setIgnoreReason] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const mockTasks: TaskWithPatient[] = [
    {
      id: "mock-1",
      title: "Verificar adesão ao tratamento",
      description: "Entrar em contato para confirmar uso correto da medicação prescrita",
      action_category: "communication",
      status: "pending",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_time: "09:00:00",
      patient_id: "mock-p1",
      professional_id: "mock-prof",
      enrollment_id: "mock-e1",
      contact_point_id: "mock-cp1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null, postponed_to: null, ignored_at: null, ignore_reason: null, notes: null,
      patient_name: "Maria Silva",
      trail_name: "Pós-operatório Ortopédico",
    },
    {
      id: "mock-2",
      title: "Revisar exames laboratoriais",
      description: "Avaliar resultados de hemograma e glicemia solicitados na última consulta",
      action_category: "review",
      status: "pending",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_time: "10:30:00",
      patient_id: "mock-p2",
      professional_id: "mock-prof",
      enrollment_id: "mock-e2",
      contact_point_id: "mock-cp2",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null, postponed_to: null, ignored_at: null, ignore_reason: null, notes: null,
      patient_name: "João Santos",
      trail_name: "Controle Glicêmico",
    },
    {
      id: "mock-3",
      title: "Acompanhamento nutricional",
      description: "Checar evolução do plano alimentar e registrar peso atual",
      action_category: "clinical_task",
      status: "pending",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_time: "14:00:00",
      patient_id: "mock-p3",
      professional_id: "mock-prof",
      enrollment_id: "mock-e3",
      contact_point_id: "mock-cp3",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null, postponed_to: null, ignored_at: null, ignore_reason: null, notes: null,
      patient_name: "Ana Oliveira",
      trail_name: "Reeducação Alimentar",
    },
  ];

  const useMock = realTasks.length === 0 && !isLoading;
  const tasks = useMock ? mockTasks : realTasks;

  const pendingTasks = tasks.filter(t => t.status === "pending");
  const completedTasks = tasks.filter(t => t.status !== "pending");

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleComplete = async (taskId: string) => {
    if (taskId.startsWith("mock-")) return;
    await completeTask.mutateAsync({ taskId });
  };

  const handlePostpone = async () => {
    if (!postponeDialogTask || !postponeDate) return;
    if (postponeDialogTask.id.startsWith("mock-")) {
      setPostponeDialogTask(null);
      setPostponeDate("");
      return;
    }
    await postponeTask.mutateAsync({ taskId: postponeDialogTask.id, postponeTo: postponeDate });
    setPostponeDialogTask(null);
    setPostponeDate("");
  };

  const handleIgnore = async () => {
    if (!ignoreDialogTask || !ignoreReason) return;
    if (ignoreDialogTask.id.startsWith("mock-")) {
      setIgnoreDialogTask(null);
      setIgnoreReason("");
      return;
    }
    await ignoreTask.mutateAsync({ taskId: ignoreDialogTask.id, reason: ignoreReason });
    setIgnoreDialogTask(null);
    setIgnoreReason("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Tarefas de Hoje
              {useMock && (
                <Badge variant="outline" className="text-xs font-normal">
                  Exemplo
                </Badge>
              )}
            </CardTitle>
            <Badge variant={pendingTasks.length > 0 ? "default" : "secondary"}>
              {pendingTasks.length} pendente{pendingTasks.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Pending tasks - compact expandable cards */}
          {pendingTasks.map((task) => {
            const isExpanded = expandedTasks.has(task.id);

            return (
              <div key={task.id} className="border rounded-lg overflow-hidden">
                {/* Compact header - always visible */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => toggleExpand(task.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.patient_name || "—"}
                      {task.trail_name && <> · {task.trail_name}</>}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t">
                    {task.description && (
                      <p className="text-xs text-muted-foreground pt-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleComplete(task.id)}
                        disabled={completeTask.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Concluir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPostponeDialogTask(task);
                          setPostponeDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
                        }}
                      >
                        <SkipForward className="h-3.5 w-3.5 mr-1" />
                        Adiar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => setIgnoreDialogTask(task)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Ignorar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Completed/other tasks collapsible */}
          {completedTasks.length > 0 && (
            <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                  {showCompleted ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  {completedTasks.length} tarefa{completedTasks.length !== 1 ? "s" : ""} resolvida{completedTasks.length !== 1 ? "s" : ""}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {completedTasks.map((task) => {
                  const statusConf = STATUS_CONFIG[task.status];
                  return (
                    <div key={task.id} className="border rounded-lg p-3 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm line-through">{task.title}</span>
                        </div>
                        <Badge variant={statusConf?.variant || "secondary"} className="text-xs">
                          {statusConf?.label || task.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        {task.patient_name}
                      </p>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Postpone Dialog */}
      <Dialog open={!!postponeDialogTask} onOpenChange={() => setPostponeDialogTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adiar Tarefa</DialogTitle>
            <DialogDescription>
              Selecione a nova data para "{postponeDialogTask?.title}"
            </DialogDescription>
          </DialogHeader>
          <Input
            type="date"
            value={postponeDate}
            onChange={(e) => setPostponeDate(e.target.value)}
            min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostponeDialogTask(null)}>Cancelar</Button>
            <Button onClick={handlePostpone} disabled={!postponeDate || postponeTask.isPending}>
              {postponeTask.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Adiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Dialog */}
      <Dialog open={!!ignoreDialogTask} onOpenChange={() => setIgnoreDialogTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ignorar Tarefa</DialogTitle>
            <DialogDescription>
              Informe o motivo para registrar no log de compliance
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo para ignorar esta tarefa..."
            value={ignoreReason}
            onChange={(e) => setIgnoreReason(e.target.value)}
            className="resize-none"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIgnoreDialogTask(null)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleIgnore} 
              disabled={!ignoreReason || ignoreTask.isPending}
            >
              {ignoreTask.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Ignorar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
