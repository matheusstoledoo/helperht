import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, CheckCircle2, Clock, XCircle, Activity, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type TrailStatus = "active" | "draft" | "paused" | "archived";
type EnrollmentStatus = "active" | "paused" | "completed" | "abandoned" | "exited";

const statusBadge = (status: TrailStatus) => {
  const map: Record<TrailStatus, { label: string; cls: string }> = {
    active: { label: "Ativa", cls: "bg-green-500/10 text-green-600" },
    draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground" },
    paused: { label: "Pausada", cls: "bg-yellow-500/10 text-yellow-600" },
    archived: { label: "Arquivada", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[status] ?? map.draft;
  return <Badge className={v.cls}>{v.label}</Badge>;
};

const enrollmentBadge = (status: EnrollmentStatus | string) => {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativo", cls: "bg-green-500/10 text-green-600" },
    paused: { label: "Pausado", cls: "bg-yellow-500/10 text-yellow-600" },
    completed: { label: "Concluído", cls: "bg-blue-500/10 text-blue-600" },
    abandoned: { label: "Abandonado", cls: "bg-red-500/10 text-red-600" },
    exited: { label: "Saiu", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge className={v.cls}>{v.label}</Badge>;
};

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";

const fmtDateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function TrailReport() {
  const { id: trailId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: trail, isLoading: loadingTrail } = useQuery({
    queryKey: ["trail-report", "trail", trailId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_trails")
        .select("*")
        .eq("id", trailId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!trailId,
  });

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ["trail-report", "enrollments", trailId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trail_enrollments")
        .select(
          `id, patient_id, started_at, current_day, status, last_interaction_at, completed_at,
           patients:patient_id ( id, user_id, users:user_id ( name ) )`
        )
        .eq("trail_id", trailId!)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!trailId,
  });

  const enrollmentIds = useMemo(() => enrollments.map((e: any) => e.id), [enrollments]);

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["trail-report", "tasks", trailId, enrollmentIds.join(",")],
    queryFn: async () => {
      if (enrollmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("trail_task_instances")
        .select("id, enrollment_id, status")
        .in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: enrollmentIds.length > 0,
  });

  const tasksByEnrollment = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; pending: number; ignored: number }>();
    for (const e of enrollments) map.set(e.id, { total: 0, completed: 0, pending: 0, ignored: 0 });
    for (const t of tasks as any[]) {
      const agg = map.get(t.enrollment_id) ?? { total: 0, completed: 0, pending: 0, ignored: 0 };
      agg.total += 1;
      if (t.status === "completed") agg.completed += 1;
      else if (t.status === "ignored" || t.status === "skipped") agg.ignored += 1;
      else agg.pending += 1;
      map.set(t.enrollment_id, agg);
    }
    return map;
  }, [tasks, enrollments]);

  const totalsTasks = useMemo(() => {
    let total = 0, completed = 0, pending = 0, ignored = 0;
    for (const v of tasksByEnrollment.values()) {
      total += v.total; completed += v.completed; pending += v.pending; ignored += v.ignored;
    }
    return { total, completed, pending, ignored };
  }, [tasksByEnrollment]);

  const metrics = useMemo(() => {
    const total = enrollments.length;
    const active = enrollments.filter((e: any) => e.status === "active").length;
    const completed = enrollments.filter((e: any) => e.status === "completed").length;
    const rates: number[] = [];
    for (const v of tasksByEnrollment.values()) {
      if (v.total > 0) rates.push((v.completed / v.total) * 100);
    }
    const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    return { total, active, completed, avgRate };
  }, [enrollments, tasksByEnrollment]);

  if (loadingTrail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Trilha não encontrada.</p>
        <Button asChild variant="outline">
          <Link to="/prof/trilhas"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/prof/trilhas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold">{trail.name}</h1>
              {statusBadge(trail.status as TrailStatus)}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Criada em {fmtDate(trail.created_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {trail.duration_days} dias
              </span>
              {trail.specialty && <span>{trail.specialty}</span>}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Inscritos
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-semibold">{metrics.total}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Ativos
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-semibold">{metrics.active}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-semibold">{metrics.completed}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa média conclusão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{metrics.avgRate.toFixed(0)}%</p>
              <Progress value={metrics.avgRate} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </div>

        {/* Tasks summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-semibold">{totalsTasks.total}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" /> Concluídas
                </p>
                <p className="text-xl font-semibold text-green-600">{totalsTasks.completed}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-600" /> Pendentes
                </p>
                <p className="text-xl font-semibold text-yellow-600">{totalsTasks.pending}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-muted-foreground" /> Ignoradas
                </p>
                <p className="text-xl font-semibold">{totalsTasks.ignored}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrolled patients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pacientes inscritos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEnrollments || loadingTasks ? (
              <div className="py-8 flex justify-center"><LoadingSpinner /></div>
            ) : enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum paciente inscrito nesta trilha.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Inscrição</TableHead>
                      <TableHead>Dia atual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tarefas</TableHead>
                      <TableHead>% conclusão</TableHead>
                      <TableHead>Última interação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((e: any) => {
                      const t = tasksByEnrollment.get(e.id) ?? { total: 0, completed: 0, pending: 0, ignored: 0 };
                      const rate = t.total > 0 ? (t.completed / t.total) * 100 : 0;
                      const name = e.patients?.users?.name ?? "—";
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell>{fmtDate(e.started_at)}</TableCell>
                          <TableCell>{e.current_day}/{trail.duration_days}</TableCell>
                          <TableCell>{enrollmentBadge(e.status)}</TableCell>
                          <TableCell className="text-sm">
                            <span className="text-green-600">{t.completed}</span>
                            {" / "}
                            <span>{t.total}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress value={rate} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {rate.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fmtDateTime(e.last_interaction_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
