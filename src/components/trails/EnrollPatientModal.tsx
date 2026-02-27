import { useState } from "react";
import { 
  Route,
  Search,
  Activity,
  Heart,
  Brain,
  Bone,
  Pill,
  Stethoscope,
  Clock,
  Check,
  Plus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCareTrails, useEnrollPatient } from "@/hooks/useCareTrails";
import { useGenerateTaskInstances } from "@/hooks/useTrailTasks";
import { usePatientEnrollments } from "@/hooks/usePatientTrails";
import { TrailWizard } from "./TrailWizard";

interface EnrollPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

const getTrailIcon = (icon: string | null, specialty: string | null) => {
  const iconClass = "w-5 h-5";
  
  if (icon === "heart" || specialty?.toLowerCase().includes("cardio")) {
    return <Heart className={iconClass} />;
  }
  if (icon === "brain" || specialty?.toLowerCase().includes("neuro") || specialty?.toLowerCase().includes("psico")) {
    return <Brain className={iconClass} />;
  }
  if (icon === "bone" || specialty?.toLowerCase().includes("fisio") || specialty?.toLowerCase().includes("ortop")) {
    return <Bone className={iconClass} />;
  }
  if (icon === "pill" || specialty?.toLowerCase().includes("nutri")) {
    return <Pill className={iconClass} />;
  }
  if (icon === "stethoscope") {
    return <Stethoscope className={iconClass} />;
  }
  if (icon === "activity") {
    return <Activity className={iconClass} />;
  }
  return <Route className={iconClass} />;
};

export const EnrollPatientModal = ({
  open,
  onOpenChange,
  patientId,
  patientName,
}: EnrollPatientModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: trails = [], isLoading } = useCareTrails();
  const { data: existingEnrollments = [] } = usePatientEnrollments(patientId);
  const enrollPatient = useEnrollPatient();
  const generateTasks = useGenerateTaskInstances();

  const activeTrailIds = existingEnrollments
    .filter(e => e.status === "active" || e.status === "paused")
    .map(e => e.trail_id);

  const availableTrails = trails.filter(
    trail => 
      trail.status === "active" && 
      !trail.is_template &&
      !activeTrailIds.includes(trail.id) &&
      (trail.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       trail.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       trail.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEnroll = async () => {
    if (!selectedTrailId) return;
    
    const result = await enrollPatient.mutateAsync({
      trail_id: selectedTrailId,
      patient_id: patientId,
    });

    // Generate task instances for the professional
    if (result?.id) {
      await generateTasks.mutateAsync({
        enrollmentId: result.id,
        trailId: selectedTrailId,
        patientId: patientId,
      });
    }
    
    setSelectedTrailId(null);
    onOpenChange(false);
  };

  const handleWizardSuccess = () => {
    setWizardOpen(false);
    // Trails list will auto-refresh via react-query
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inscrever Paciente em Trilha</DialogTitle>
            <DialogDescription>
              Selecione uma trilha existente ou crie uma nova para {patientName}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="existing" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="existing" className="flex-1">Trilhas Existentes</TabsTrigger>
              <TabsTrigger value="create" className="flex-1">Criar Nova Trilha</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar trilhas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Trails list */}
              <ScrollArea className="h-[350px]">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : availableTrails.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Route className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma trilha disponível</p>
                    <p className="text-sm">
                      {trails.filter(t => !t.is_template && t.status === "active").length === 0
                        ? "Crie uma trilha primeiro na aba \"Criar Nova Trilha\""
                        : "O paciente já está inscrito em todas as trilhas ativas"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableTrails.map((trail) => (
                      <div
                        key={trail.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedTrailId === trail.id 
                            ? "border-primary bg-primary/5" 
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => setSelectedTrailId(trail.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedTrailId === trail.id 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-accent/50"
                          }`}>
                            {getTrailIcon(trail.icon, trail.specialty)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{trail.name}</h4>
                              {selectedTrailId === trail.id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            {trail.specialty && (
                              <Badge variant="secondary" className="mt-1">{trail.specialty}</Badge>
                            )}
                            {trail.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {trail.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {trail.duration_days} dias
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleEnroll}
                  disabled={!selectedTrailId || enrollPatient.isPending}
                >
                  {enrollPatient.isPending ? "Inscrevendo..." : "Inscrever Paciente"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div className="text-center py-8">
                <Plus className="h-12 w-12 mx-auto mb-4 text-primary opacity-70" />
                <h3 className="text-lg font-semibold mb-2">Criar Nova Trilha</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Crie uma trilha personalizada e, após ativá-la, inscreva {patientName} nela.
                </p>
                <Button onClick={() => setWizardOpen(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Abrir Assistente de Criação
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <TrailWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        trail={null}
        onSuccess={handleWizardSuccess}
      />
    </>
  );
};
