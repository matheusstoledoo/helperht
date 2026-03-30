import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Bell,
  Pill,
  FlaskConical,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Clock,
  Repeat,
  Target,
  Dumbbell,
  Pin,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { PatientReminderForm } from "@/components/patient/PatientReminderForm";
import { toast } from "sonner";

interface AlertItem {
  id: string;
  type: "medication" | "exam" | "tip";
  severity: "info" | "warning" | "urgent";
  title: string;
  description: string;
  date?: string;
  icon: React.ReactNode;
}

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_type: string;
  reminder_time: string | null;
  recurrence: string;
  is_active: boolean;
  created_at: string;
}

const reminderTypeIcons: Record<string, React.ReactNode> = {
  medication: <Pill className="h-5 w-5" />,
  exam: <FlaskConical className="h-5 w-5" />,
  appointment: <Calendar className="h-5 w-5" />,
  habit: <Dumbbell className="h-5 w-5" />,
  custom: <Pin className="h-5 w-5" />,
};

const reminderTypeLabels: Record<string, string> = {
  medication: "Medicação",
  exam: "Exame",
  appointment: "Consulta",
  habit: "Hábito",
  custom: "Outro",
};

const recurrenceLabels: Record<string, string> = {
  none: "",
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

export default function PatientAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [patientId, setPatientId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    const fetchData = async () => {
      const patientRes = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!patientRes.data) {
        setLoading(false);
        return;
      }

      const pid = patientRes.data.id;
      setPatientId(pid);
      const today = new Date();

      const [treatmentsRes, examsRes, remindersRes] = await Promise.all([
        supabase
          .from("treatments")
          .select("id, name, dosage, frequency, status, start_date, end_date")
          .eq("patient_id", pid)
          .eq("status", "active"),
        supabase
          .from("exams")
          .select("id, name, status, scheduled_date, requested_date")
          .eq("patient_id", pid)
          .in("status", ["requested", "in_progress"]),
        supabase
          .from("patient_reminders")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      const generatedAlerts: AlertItem[] = [];

      (treatmentsRes.data || []).forEach((t: any) => {
        generatedAlerts.push({
          id: `med-${t.id}`,
          type: "medication",
          severity: "info",
          title: t.name,
          description: `${t.dosage || "Sem dosagem definida"}${t.frequency ? ` — ${t.frequency}` : ""}`,
          icon: <Pill className="h-5 w-5" />,
        });
        if (t.end_date) {
          const daysLeft = differenceInDays(new Date(t.end_date), today);
          if (daysLeft >= 0 && daysLeft <= 7) {
            generatedAlerts.push({
              id: `med-end-${t.id}`,
              type: "medication",
              severity: "warning",
              title: `${t.name} termina em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`,
              description: `Fim previsto: ${format(new Date(t.end_date), "dd/MM/yyyy", { locale: ptBR })}`,
              date: t.end_date,
              icon: <AlertTriangle className="h-5 w-5" />,
            });
          }
        }
      });

      (examsRes.data || []).forEach((e: any) => {
        if (e.scheduled_date) {
          const examDate = new Date(e.scheduled_date);
          const daysUntil = differenceInDays(examDate, today);
          const isOverdue = isBefore(examDate, today);
          generatedAlerts.push({
            id: `exam-${e.id}`,
            type: "exam",
            severity: isOverdue ? "urgent" : daysUntil <= 3 ? "warning" : "info",
            title: e.name,
            description: isOverdue
              ? `Agendado para ${format(examDate, "dd/MM/yyyy", { locale: ptBR })} — verifique com seu profissional`
              : `Agendado para ${format(examDate, "dd/MM/yyyy", { locale: ptBR })}`,
            date: e.scheduled_date,
            icon: <FlaskConical className="h-5 w-5" />,
          });
        } else {
          generatedAlerts.push({
            id: `exam-req-${e.id}`,
            type: "exam",
            severity: "info",
            title: `${e.name} — aguardando agendamento`,
            description: `Solicitado em ${format(new Date(e.requested_date), "dd/MM/yyyy", { locale: ptBR })}`,
            date: e.requested_date,
            icon: <Calendar className="h-5 w-5" />,
          });
        }
      });

      const severityOrder = { urgent: 0, warning: 1, info: 2 };
      generatedAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setAlerts(generatedAlerts);
      setReminders((remindersRes.data as Reminder[]) || []);
      setLoading(false);
    };

    fetchData();
  }, [user, authLoading, reloadKey]);

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from("patient_reminders").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir lembrete");
      return;
    }
    toast.success("Lembrete excluído");
    setReloadKey((k) => k + 1);
  };

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));
  const medicationAlerts = visibleAlerts.filter((a) => a.type === "medication");
  const examAlerts = visibleAlerts.filter((a) => a.type === "exam");

  const severityStyles = {
    urgent: "border-destructive/50 bg-destructive/5",
    warning: "border-amber-500/50 bg-amber-500/5",
    info: "border-border",
  };

  const severityBadge = {
    urgent: <Badge variant="destructive" className="text-xs">Urgente</Badge>,
    warning: <Badge className="text-xs bg-amber-500 hover:bg-amber-600">Atenção</Badge>,
    info: <Badge variant="secondary" className="text-xs">Info</Badge>,
  };

  const renderAlertCard = (alert: AlertItem) => (
    <Card key={alert.id} className={`transition-all ${severityStyles[alert.severity]}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            alert.severity === "urgent"
              ? "bg-destructive/10 text-destructive"
              : alert.severity === "warning"
              ? "bg-amber-500/10 text-amber-600"
              : "bg-muted text-muted-foreground"
          }`}>
            {alert.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {severityBadge[alert.severity]}
            </div>
            <p className="text-sm font-medium text-foreground">{alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
          </div>
          <button onClick={() => dismiss(alert.id)} className="text-muted-foreground hover:text-foreground shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderReminderCard = (reminder: Reminder) => (
    <Card key={reminder.id} className="transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg shrink-0 bg-primary/10 text-primary">
            {reminderTypeIcons[reminder.reminder_type] || reminderTypeIcons.custom}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {reminderTypeLabels[reminder.reminder_type] || "Outro"}
              </Badge>
              {reminder.recurrence !== "none" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Repeat className="h-3 w-3" />
                  {recurrenceLabels[reminder.recurrence]}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground">{reminder.title}</p>
            {reminder.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{reminder.description}</p>
            )}
            {reminder.reminder_time && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {reminder.reminder_time}
              </div>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir lembrete?</AlertDialogTitle>
                <AlertDialogDescription>
                  O lembrete "{reminder.title}" será removido permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteReminder(reminder.id)}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmpty = (message: string) => (
    <Card>
      <CardContent className="p-8 text-center">
        <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <PatientLayout
      title="Alertas e Lembretes"
      subtitle="Medicações, exames e lembretes personalizados"
      showHeader={false}
      breadcrumb={<PatientBreadcrumb currentPage="Alertas e Lembretes" />}
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between gap-3 mb-2">
              <TabsList className="flex-1">
                <TabsTrigger value="all" className="flex-1">
                  Automáticos ({visibleAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="medication" className="flex-1">
                  Medicações ({medicationAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="exams" className="flex-1">
                  Exames ({examAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">
                  Meus ({reminders.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-3 mt-4">
              {visibleAlerts.length > 0
                ? visibleAlerts.map(renderAlertCard)
                : renderEmpty("Nenhum alerta automático no momento. Tudo em dia! 🎉")}
            </TabsContent>

            <TabsContent value="medication" className="space-y-3 mt-4">
              {medicationAlerts.length > 0
                ? medicationAlerts.map(renderAlertCard)
                : renderEmpty("Nenhum lembrete de medicação")}
            </TabsContent>

            <TabsContent value="exams" className="space-y-3 mt-4">
              {examAlerts.length > 0
                ? examAlerts.map(renderAlertCard)
                : renderEmpty("Nenhum exame pendente")}
            </TabsContent>

            <TabsContent value="custom" className="space-y-3 mt-4">
              {user && patientId && (
                <div className="flex justify-end mb-2">
                  <PatientReminderForm
                    patientId={patientId}
                    userId={user.id}
                    onCreated={() => setReloadKey((k) => k + 1)}
                  />
                </div>
              )}
              {reminders.length > 0
                ? reminders.map(renderReminderCard)
                : renderEmpty("Nenhum lembrete personalizado. Crie o seu!")}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PatientLayout>
  );
}
