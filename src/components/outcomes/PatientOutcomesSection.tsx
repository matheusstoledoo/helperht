import { useState } from "react";
import {
  TrendingUp,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hospital,
  Heart,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  usePatientOutcomes,
  useCreatePatientOutcome,
  OUTCOME_TYPES,
  SEVERITY_LEVELS,
} from "@/hooks/usePatientOutcomes";
import { usePatientEnrollments } from "@/hooks/usePatientTrails";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientOutcomesSectionProps {
  patientId: string;
}

const getOutcomeIcon = (type: string) => {
  switch (type) {
    case "discharge": return <CheckCircle2 className="h-4 w-4" />;
    case "complication": return <AlertTriangle className="h-4 w-4" />;
    case "reoperation": return <RefreshCw className="h-4 w-4" />;
    case "hospitalization": return <Hospital className="h-4 w-4" />;
    case "functional_improvement": return <TrendingUp className="h-4 w-4" />;
    case "relapse": return <RotateCcw className="h-4 w-4" />;
    case "end_of_life_care": return <Heart className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getSeverityColor = (severity: string | null) => {
  switch (severity) {
    case "mild": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "moderate": return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "severe": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "critical": return "bg-destructive/10 text-destructive";
    default: return "";
  }
};

const getOutcomeTypeColor = (type: string) => {
  switch (type) {
    case "discharge":
    case "functional_improvement":
    case "nutritional_improvement":
    case "nutritional_goal":
    case "psychological_improvement":
    case "therapy_milestone":
    case "physical_rehab_progress":
    case "mobility_improvement":
    case "pain_reduction":
    case "treatment_completed":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "complication":
    case "reoperation":
    case "relapse":
    case "worsening":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "hospitalization":
    case "stable":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "end_of_life_care":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    default:
      return "";
  }
};

export const PatientOutcomesSection = ({ patientId }: PatientOutcomesSectionProps) => {
  const { data: outcomes = [], isLoading } = usePatientOutcomes(patientId);
  const { data: enrollments = [] } = usePatientEnrollments(patientId);
  const createOutcome = useCreatePatientOutcome();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [outcomeType, setOutcomeType] = useState("");
  const [outcomeDate, setOutcomeDate] = useState(new Date().toISOString().split("T")[0]);
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [clinicalContext, setClinicalContext] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");

  const resetForm = () => {
    setOutcomeType("");
    setOutcomeDate(new Date().toISOString().split("T")[0]);
    setSeverity("");
    setDescription("");
    setClinicalContext("");
    setEnrollmentId("");
  };

  const handleSubmit = async () => {
    if (!outcomeType || !outcomeDate) return;

    await createOutcome.mutateAsync({
      patient_id: patientId,
      outcome_type: outcomeType,
      outcome_date: outcomeDate,
      severity: severity || null,
      description: description || null,
      clinical_context: clinicalContext || null,
      enrollment_id: enrollmentId || null,
    });

    resetForm();
    setDialogOpen(false);
  };

  const getOutcomeLabel = (type: string) =>
    OUTCOME_TYPES.find((t) => t.value === type)?.label || type;

  const getSeverityLabel = (sev: string | null) =>
    SEVERITY_LEVELS.find((s) => s.value === sev)?.label || sev;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Desfechos Clínicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Desfechos Clínicos
              {outcomes.length > 0 && (
                <Badge variant="secondary">{outcomes.length}</Badge>
              )}
            </CardTitle>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Registrar Desfecho
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {outcomes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhum desfecho registrado</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Registrar primeiro desfecho
              </Button>
            </div>
          ) : (
            outcomes.map((outcome) => (
              <div key={outcome.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getOutcomeTypeColor(outcome.outcome_type)}`}>
                      {getOutcomeIcon(outcome.outcome_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">
                          {getOutcomeLabel(outcome.outcome_type)}
                        </h4>
                        {outcome.severity && (
                          <Badge className={getSeverityColor(outcome.severity)}>
                            {getSeverityLabel(outcome.severity)}
                          </Badge>
                        )}
                      </div>
                      {outcome.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {outcome.description}
                        </p>
                      )}
                      {outcome.clinical_context && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Contexto: {outcome.clinical_context}
                        </p>
                      )}
                      {outcome.enrollment?.trail?.name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Trilha: {outcome.enrollment.trail.name}
                        </p>
                      )}
                      {outcome.related_diagnosis?.name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Diagnóstico: {outcome.related_diagnosis.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(outcome.outcome_date), { addSuffix: true, locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(outcome.outcome_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create Outcome Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Registrar Desfecho Clínico</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-2">
              <Label>Tipo de Desfecho *</Label>
              <Select value={outcomeType} onValueChange={setOutcomeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={outcomeDate}
                onChange={(e) => setOutcomeDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Severidade</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {enrollments.length > 0 && (
              <div className="space-y-2">
                <Label>Trilha Associada</Label>
                <Select value={enrollmentId} onValueChange={setEnrollmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Associar a uma trilha (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {enrollments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.trail?.name || "Trilha"} ({e.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o desfecho..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Contexto Clínico</Label>
              <Textarea
                placeholder="Contexto adicional (consulta, cirurgia, etc.)"
                value={clinicalContext}
                onChange={(e) => setClinicalContext(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!outcomeType || !outcomeDate || createOutcome.isPending}
              className="w-full"
            >
              {createOutcome.isPending ? "Registrando..." : "Registrar Desfecho"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
