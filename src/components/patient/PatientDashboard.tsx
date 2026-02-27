import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CurrentFocusSection } from "./CurrentFocusSection";
import { SimplifiedHealthCard } from "./SimplifiedHealthCard";
import { ActionFeedback } from "./ActionFeedback";
import { Activity, Pill, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PatientDashboardProps {
  patientId: string;
}

export const PatientDashboard = ({ patientId }: PatientDashboardProps) => {
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar diagnósticos ativos
        const { data: diagnosesData } = await supabase
          .from("diagnoses")
          .select("*")
          .eq("patient_id", patientId)
          .eq("status", "active")
          .order("diagnosed_date", { ascending: false });

        setDiagnoses(diagnosesData || []);

        // Buscar tratamentos ativos
        const { data: treatmentsData } = await supabase
          .from("treatments")
          .select("*")
          .eq("patient_id", patientId)
          .eq("status", "active")
          .order("start_date", { ascending: false });

        setTreatments(treatmentsData || []);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscriptions
    const diagnosesChannel = supabase
      .channel(`patient-diagnoses-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diagnoses',
          filter: `patient_id=eq.${patientId}`
        },
        () => fetchData()
      )
      .subscribe();

    const treatmentsChannel = supabase
      .channel(`patient-treatments-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatments',
          filter: `patient_id=eq.${patientId}`
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(diagnosesChannel);
      supabase.removeChannel(treatmentsChannel);
    };
  }, [patientId]);

  // Mock focus items - em produção viria do backend
  const focusItems = [
    {
      id: "1",
      title: "Tomar sua medicação todos os dias",
      description: "Metformina 850mg - 2 vezes ao dia com as refeições",
      progress: 85,
      priority: "high" as const,
      dueDate: "diariamente"
    },
    {
      id: "2",
      title: "Marcar retorno com seu médico",
      description: "Agendar consulta de acompanhamento em até 30 dias",
      progress: 30,
      priority: "medium" as const,
      dueDate: "15 de dezembro"
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const diagnosesItems = diagnoses.map((d) => ({
    id: d.id,
    name: d.name,
    detail: d.icd_code ? `Código: ${d.icd_code}` : undefined,
    explanation: d.explanation_text,
    status: d.status,
    isNew: (new Date().getTime() - new Date(d.diagnosed_date).getTime()) < 7 * 24 * 60 * 60 * 1000
  }));

  const treatmentsItems = treatments.map((t) => ({
    id: t.id,
    name: t.name,
    detail: [t.dosage, t.frequency].filter(Boolean).join(" - "),
    explanation: t.explanation_text,
    status: t.status,
    isNew: (new Date().getTime() - new Date(t.start_date).getTime()) < 7 * 24 * 60 * 60 * 1000
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Message */}
      <ActionFeedback
        type="info"
        title="Bem-vindo(a) ao seu espaço de saúde"
        message="Aqui você encontra todas as informações sobre seu tratamento de forma clara e organizada. Se tiver dúvidas, converse com seu profissional de saúde."
      />

      {/* Current Focus */}
      <CurrentFocusSection items={focusItems} />

      {/* Health Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <SimplifiedHealthCard
          icon={Activity}
          iconColor="text-yellow-700 dark:text-yellow-400"
          iconBg="bg-yellow-500/10"
          title="Suas Condições de Saúde"
          subtitle="O que estamos tratando"
          items={diagnosesItems}
          emptyMessage="Nenhuma condição em tratamento no momento"
        />

        <SimplifiedHealthCard
          icon={Pill}
          iconColor="text-green-700 dark:text-green-400"
          iconBg="bg-green-500/10"
          title="Seus Medicamentos"
          subtitle="O que você deve tomar"
          items={treatmentsItems}
          emptyMessage="Nenhum medicamento prescrito no momento"
        />
      </div>

      {/* Upcoming Appointments - Mock */}
      <SimplifiedHealthCard
        icon={Calendar}
        iconColor="text-blue-700 dark:text-blue-400"
        iconBg="bg-blue-500/10"
        title="Próximas Consultas"
        subtitle="Seus agendamentos"
        items={[]}
        emptyMessage="Nenhuma consulta agendada. Entre em contato para marcar seu retorno."
      />
    </div>
  );
};