import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Bell,
  Pill,
  FlaskConical,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Treatment {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
}

interface Exam {
  id: string;
  name: string;
  status: string;
  scheduled_date: string | null;
  requested_date: string;
}

interface AlertItem {
  id: string;
  type: "medication" | "exam" | "tip";
  severity: "info" | "warning" | "urgent";
  title: string;
  description: string;
  date?: string;
  icon: React.ReactNode;
}

export default function PatientAlerts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      const patientRes = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!patientRes.data) {
        setLoading(false);
        return;
      }

      const patientId = patientRes.data.id;
      const today = new Date();

      const [treatmentsRes, examsRes] = await Promise.all([
        supabase
          .from("treatments")
          .select("id, name, dosage, frequency, status, start_date, end_date")
          .eq("patient_id", patientId)
          .eq("status", "active"),
        supabase
          .from("exams")
          .select("id, name, status, scheduled_date, requested_date")
          .eq("patient_id", patientId)
          .in("status", ["requested", "in_progress"]),
      ]);

      const generatedAlerts: AlertItem[] = [];

      // Active medication reminders
      (treatmentsRes.data || []).forEach((t: Treatment) => {
        generatedAlerts.push({
          id: `med-${t.id}`,
          type: "medication",
          severity: "info",
          title: t.name,
          description: `${t.dosage || "Sem dosagem definida"}${t.frequency ? ` — ${t.frequency}` : ""}`,
          icon: <Pill className="h-5 w-5" />,
        });

        // Warn if medication is ending soon
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

      // Pending exams
      (examsRes.data || []).forEach((e: Exam) => {
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

      // Sort: urgent first, then warning, then info
      const severityOrder = { urgent: 0, warning: 1, info: 2 };
      generatedAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setAlerts(generatedAlerts);
      setLoading(false);
    };

    fetchAlerts();
  }, [user]);

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
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
          <div
            className={`p-2 rounded-lg shrink-0 ${
              alert.severity === "urgent"
                ? "bg-destructive/10 text-destructive"
                : alert.severity === "warning"
                ? "bg-amber-500/10 text-amber-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {alert.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {severityBadge[alert.severity]}
            </div>
            <p className="text-sm font-medium text-foreground">{alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
          </div>
          <button
            onClick={() => dismiss(alert.id)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
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
      subtitle="Medicações, exames e notificações"
      showHeader={false}
      breadcrumb={
        <Button variant="ghost" size="sm" onClick={() => navigate("/pac/dashboard")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      }
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : visibleAlerts.length === 0 ? (
          renderEmpty("Nenhum alerta no momento. Tudo em dia! 🎉")
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                Todos ({visibleAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="medication" className="flex-1">
                Medicações ({medicationAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="exams" className="flex-1">
                Exames ({examAlerts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {visibleAlerts.map(renderAlertCard)}
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
          </Tabs>
        )}
      </div>
    </PatientLayout>
  );
}
