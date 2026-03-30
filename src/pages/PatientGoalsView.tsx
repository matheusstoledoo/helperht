import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PatientLayout from "@/components/patient/PatientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Target, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  UserCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  progress: number | null;
  target_date: string | null;
  category: string | null;
  public_notes: string | null;
  created_at: string;
  created_by: string | null;
  professional_name?: string;
}

export default function PatientGoalsView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      if (authLoading) return;
      if (!user) { setLoading(false); return; }

      // First get the patient record for this user
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
        .from("goals")
        .select("*, created_by")
        .eq("patient_id", patientData.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Fetch professional names
        const professionalIds = new Set<string>();
        data.forEach((g) => { if (g.created_by) professionalIds.add(g.created_by); });
        
        const profMap: Record<string, string> = {};
        if (professionalIds.size > 0) {
          const { data: profs } = await supabase
            .from("users")
            .select("id, name")
            .in("id", Array.from(professionalIds));
          (profs || []).forEach((p) => { profMap[p.id] = p.name; });
        }

        setGoals(data.map((g) => ({
          ...g,
          professional_name: g.created_by ? profMap[g.created_by] || "Profissional" : undefined,
        })));
      }
      setLoading(false);
    };

    fetchGoals();
  }, [user, authLoading]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "Concluída", variant: "default" as const, icon: CheckCircle2 };
      case "in_progress":
        return { label: "Em Progresso", variant: "secondary" as const, icon: Clock };
      case "pending":
        return { label: "Pendente", variant: "outline" as const, icon: AlertCircle };
      default:
        return { label: status, variant: "outline" as const, icon: Target };
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 dark:bg-red-950/30";
      case "medium":
        return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
      case "low":
        return "text-green-600 bg-green-50 dark:bg-green-950/30";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

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
      <span className="font-medium text-foreground">Metas e Objetivos</span>
    </nav>
  );

  return (
    <PatientLayout
      title="Metas e Objetivos"
      subtitle="Acompanhe suas metas de saúde definidas pelos profissionais"
      breadcrumb={breadcrumb}
    >
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma meta definida</h3>
              <p className="text-muted-foreground max-w-sm">
                Seus profissionais de saúde ainda não definiram metas para você. 
                Converse com eles sobre seus objetivos de saúde.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => {
              const statusConfig = getStatusConfig(goal.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <Card key={goal.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-medium leading-tight">
                        {goal.title}
                      </CardTitle>
                      <Badge variant={statusConfig.variant} className="shrink-0">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    {goal.category && (
                      <Badge variant="outline" className="w-fit text-xs">
                        {goal.category}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {goal.description && (
                      <p className="text-sm text-muted-foreground">
                        {goal.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <UserCircle className="h-3.5 w-3.5" />
                      <span>{goal.professional_name || "Profissional"}</span>
                      <span>•</span>
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Início: {format(new Date(goal.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {goal.target_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            Meta: {format(new Date(goal.target_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                      {goal.priority && (
                        <Badge className={`text-xs ${getPriorityColor(goal.priority)}`}>
                          Prioridade {goal.priority === "high" ? "Alta" : goal.priority === "medium" ? "Média" : "Baixa"}
                        </Badge>
                      )}
                    </div>
                    
                    {goal.public_notes && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground italic">
                          "{goal.public_notes}"
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
