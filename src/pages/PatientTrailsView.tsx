import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PatientLayout from "@/components/patient/PatientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Route, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Pause,
  ChevronLeft,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PatientTrailInteraction } from "@/components/trails/PatientTrailInteraction";

interface TrailEnrollment {
  id: string;
  status: string;
  started_at: string;
  current_day: number;
  completed_at: string | null;
  trail: {
    id: string;
    name: string;
    description: string | null;
    duration_days: number;
    icon: string | null;
    clinical_condition: string | null;
  };
  enrolled_by_user: {
    name: string;
  } | null;
}

export default function PatientTrailsView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<TrailEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<TrailEnrollment | null>(null);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!user) return;

      const { data: patientData } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!patientData) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("trail_enrollments")
        .select(`
          id,
          status,
          started_at,
          current_day,
          completed_at,
          trail:care_trails(
            id,
            name,
            description,
            duration_days,
            icon,
            clinical_condition
          ),
          enrolled_by_user:users!trail_enrollments_enrolled_by_fkey(name)
        `)
        .eq("patient_id", patientData.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setEnrollments(data.filter((e: any) => e.trail != null) as unknown as TrailEnrollment[]);
      }
      setLoading(false);
    };

    fetchEnrollments();
  }, [user]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { label: "Ativa", variant: "default" as const, icon: Activity, color: "text-green-600" };
      case "completed":
        return { label: "Concluída", variant: "secondary" as const, icon: CheckCircle2, color: "text-blue-600" };
      case "paused":
        return { label: "Pausada", variant: "outline" as const, icon: Pause, color: "text-amber-600" };
      case "exited":
        return { label: "Encerrada", variant: "outline" as const, icon: Clock, color: "text-muted-foreground" };
      default:
        return { label: status, variant: "outline" as const, icon: Route, color: "text-muted-foreground" };
    }
  };

  const calculateProgress = (currentDay: number, durationDays: number) => {
    return Math.min(Math.round((currentDay / durationDays) * 100), 100);
  };

  const activeEnrollments = enrollments.filter(e => e.status === "active" || e.status === "paused");
  const pastEnrollments = enrollments.filter(e => e.status === "completed" || e.status === "exited");

  const breadcrumb = (
    <nav className="flex items-center gap-2 text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/pac/dashboard")}
        className="gap-1 text-muted-foreground hover:text-foreground hover:bg-primary hover:text-primary-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Página Inicial
      </Button>
      <span className="text-muted-foreground">/</span>
      <span className="font-medium text-foreground">Trilhas de Acompanhamento</span>
    </nav>
  );

  // If a trail is selected, show interaction view
  if (selectedEnrollment) {
    return (
      <PatientLayout title="Trilha de Acompanhamento" subtitle="" breadcrumb={breadcrumb}>
        <div className="p-6">
          <PatientTrailInteraction
            enrollmentId={selectedEnrollment.id}
            trailId={selectedEnrollment.trail.id}
            trailName={selectedEnrollment.trail.name}
            trailDescription={selectedEnrollment.trail.description}
            currentDay={selectedEnrollment.current_day}
            durationDays={selectedEnrollment.trail.duration_days}
            status={selectedEnrollment.status}
            startedAt={selectedEnrollment.started_at}
            onBack={() => setSelectedEnrollment(null)}
          />
        </div>
      </PatientLayout>
    );
  }

  const renderEnrollmentCard = (enrollment: TrailEnrollment) => {
    const statusConfig = getStatusConfig(enrollment.status);
    const StatusIcon = statusConfig.icon;
    const progress = calculateProgress(enrollment.current_day, enrollment.trail.duration_days);

    return (
      <Card 
        key={enrollment.id} 
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedEnrollment(enrollment)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {enrollment.trail.icon && (
                <span className="text-2xl">{enrollment.trail.icon}</span>
              )}
              <CardTitle className="text-base font-medium leading-tight">
                {enrollment.trail.name}
              </CardTitle>
            </div>
            <Badge variant={statusConfig.variant} className="shrink-0">
              <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.color}`} />
              {statusConfig.label}
            </Badge>
          </div>
          {enrollment.trail.clinical_condition && (
            <Badge variant="outline" className="w-fit text-xs">
              {enrollment.trail.clinical_condition}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {enrollment.trail.description && (
            <p className="text-sm text-muted-foreground">
              {enrollment.trail.description}
            </p>
          )}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso da Trilha</span>
              <span className="font-medium">
                Dia {enrollment.current_day} de {enrollment.trail.duration_days}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Início: {format(new Date(enrollment.started_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            {enrollment.completed_at && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span>
                  Concluída: {format(new Date(enrollment.completed_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>
          {enrollment.enrolled_by_user && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Inscrito por: <span className="font-medium">{enrollment.enrolled_by_user.name}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <PatientLayout
      title="Trilhas de Acompanhamento"
      subtitle="Veja suas trilhas de cuidado e acompanhamento contínuo"
      breadcrumb={breadcrumb}
    >
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Route className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma trilha ativa</h3>
              <p className="text-muted-foreground max-w-sm">
                Você ainda não foi inscrito em nenhuma trilha de acompanhamento. 
                Seu profissional de saúde poderá inscrevê-lo quando necessário.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">
                Atuais {activeEnrollments.length > 0 && `(${activeEnrollments.length})`}
              </TabsTrigger>
              <TabsTrigger value="past">
                Anteriores {pastEnrollments.length > 0 && `(${pastEnrollments.length})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-4">
              {activeEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma trilha ativa no momento.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeEnrollments.map(renderEnrollmentCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="past" className="mt-4">
              {pastEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma trilha concluída ainda.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {pastEnrollments.map(renderEnrollmentCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PatientLayout>
  );
}
