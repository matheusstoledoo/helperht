import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Pill, Target, Info } from "lucide-react";
import { TimelineEvent } from "@/components/timeline/TimelineCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ClinicalSummaryProps {
  events: TimelineEvent[];
}

export const ClinicalSummary = ({ events }: ClinicalSummaryProps) => {
  // Extract active diagnoses from timeline events
  const activeDiagnoses = useMemo(() => {
    const diagnosisEvents = events
      .filter(e => e.type === "diagnosis_new" || e.type === "diagnosis_update")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return diagnosisEvents.slice(0, 5).map(event => ({
      id: event.id,
      title: event.title,
      date: new Date(event.date).toLocaleDateString("pt-BR", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      tags: event.tags || []
    }));
  }, [events]);

  // Extract active treatments from timeline events
  const activeTreatments = useMemo(() => {
    const treatmentEvents = events
      .filter(e => e.type === "treatment_start" || e.type === "treatment_modify")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return treatmentEvents.slice(0, 5).map(event => ({
      id: event.id,
      title: event.title,
      summary: event.summary,
      date: new Date(event.date).toLocaleDateString("pt-BR", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      tags: event.tags || []
    }));
  }, [events]);

  // Extract health goals from consultation notes
  const healthGoals = useMemo(() => {
    const consultationEvents = events
      .filter(e => e.type === "consultation")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Extract goals from consultation details (looking for "Plan:", "Goals:", etc.)
    const goals: { id: string; goal: string; date: string }[] = [];
    
    consultationEvents.forEach(event => {
      if (event.details) {
        const planMatch = event.details.match(/Plan:\s*([\s\S]*?)(?=\n\n|$)/i);
        const goalsMatch = event.details.match(/Goals?:\s*([\s\S]*?)(?=\n\n|$)/i);
        
        const planText = planMatch ? planMatch[1] : null;
        const goalsText = goalsMatch ? goalsMatch[1] : null;
        
        const text = goalsText || planText;
        if (text) {
          const lines = text.split('\n').filter(line => line.trim().startsWith('-'));
          lines.forEach((line, idx) => {
            goals.push({
              id: `${event.id}-goal-${idx}`,
              goal: line.trim().replace(/^-\s*/, ''),
              date: new Date(event.date).toLocaleDateString("pt-BR", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })
            });
          });
        }
      }
    });
    
    return goals.slice(0, 5);
  }, [events]);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Active Diagnoses */}
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Activity className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-xl">Diagnósticos Ativos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activeDiagnoses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum diagnóstico ativo registrado</p>
          ) : (
            <div className="space-y-4">
              {activeDiagnoses.map((diagnosis) => (
                <div 
                  key={diagnosis.id}
                  className="pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <p className="font-medium text-foreground mb-2">
                    {diagnosis.title}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Registrado: {diagnosis.date}
                  </p>
                  {diagnosis.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {diagnosis.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Treatments */}
      <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Pill className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">Tratamentos Ativos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activeTreatments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tratamento ativo registrado</p>
          ) : (
            <div className="space-y-4">
              {activeTreatments.map((treatment) => (
                <div 
                  key={treatment.id}
                  className="pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <p className="font-medium text-foreground mb-1">
                    {treatment.title}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {treatment.summary}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Atualizado: {treatment.date}
                  </p>
                  {treatment.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {treatment.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Health Goals */}
      <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <Target className="w-5 h-5 text-accent" />
            </div>
            <CardTitle className="text-xl">Metas de Saúde Atuais</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {healthGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma meta de saúde registrada</p>
          ) : (
            <div className="space-y-3">
              {healthGoals.map((goal) => (
                <div 
                  key={goal.id}
                  className="flex items-start gap-2 pb-3 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{goal.goal}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Definido: {goal.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
