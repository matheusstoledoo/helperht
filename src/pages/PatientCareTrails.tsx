import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Plus, 
  Route, 
  Search,
  Loader2,
  LayoutTemplate,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrailCard } from "@/components/trails/TrailCard";
import { TrailTemplateCard } from "@/components/trails/TrailTemplateCard";
import { TrailWizard } from "@/components/trails/TrailWizard";
import { 
  CareTrail,
  TrailStatus,
  useCareTrails, 
  useCareTrailTemplates,
  useUpdateCareTrail,
  useDuplicateCareTrail,
  useDeleteCareTrail
} from "@/hooks/useCareTrails";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Pre-built templates for healthcare professionals
const DEFAULT_TEMPLATES: Partial<CareTrail>[] = [
  {
    name: "Diabetes Tipo 2 — Acompanhamento Inicial",
    description: "Trilha de 30 dias para pacientes recém-diagnosticados com diabetes tipo 2. Inclui educação sobre controle glicêmico, monitoramento de glicemia e orientações sobre estilo de vida.",
    specialty: "Endocrinologia",
    clinical_condition: "Diabetes Mellitus Tipo 2",
    duration_days: 30,
    template_category: "Diabetes",
    icon: "activity",
  },
  {
    name: "Hipertensão — Monitoramento Contínuo",
    description: "Acompanhamento de pacientes hipertensos com coleta regular de pressão arterial, lembretes de medicação e alertas para valores críticos.",
    specialty: "Cardiologia",
    clinical_condition: "Hipertensão Arterial",
    duration_days: 60,
    template_category: "Cardiologia",
    icon: "heart",
  },
  {
    name: "Pós-operatório — Cirurgia Geral",
    description: "Monitoramento pós-cirúrgico com verificação de sintomas, orientações de recuperação e alertas para sinais de complicação.",
    specialty: "Clínica Médica",
    clinical_condition: "Pós-operatório",
    duration_days: 14,
    template_category: "Pós-operatório",
    icon: "stethoscope",
  },
  {
    name: "Obesidade — Mudança de Estilo de Vida",
    description: "Programa de acompanhamento para pacientes em tratamento de obesidade. Inclui monitoramento de peso, dieta e atividade física.",
    specialty: "Nutrição",
    clinical_condition: "Obesidade",
    duration_days: 90,
    template_category: "Nutrição",
    icon: "pill",
  },
  {
    name: "Saúde Mental — Acompanhamento entre Sessões",
    description: "Trilha para manter contato com pacientes em tratamento psicológico/psiquiátrico entre as sessões. Inclui check-ins de humor e alertas de crise.",
    specialty: "Psicologia",
    clinical_condition: "Saúde Mental",
    duration_days: 30,
    template_category: "Saúde Mental",
    icon: "brain",
  },
  {
    name: "Reabilitação — Fisioterapia Pós-lesão",
    description: "Acompanhamento de pacientes em reabilitação fisioterapêutica. Inclui lembretes de exercícios, monitoramento de dor e progresso.",
    specialty: "Fisioterapia",
    clinical_condition: "Reabilitação",
    duration_days: 45,
    template_category: "Reabilitação",
    icon: "bone",
  },
  {
    name: "Tratamento Periodontal — Acompanhamento",
    description: "Acompanhamento de pacientes em tratamento periodontal. Inclui lembretes de higiene bucal, verificação de sintomas e evolução.",
    specialty: "Odontologia",
    clinical_condition: "Doença Periodontal",
    duration_days: 60,
    template_category: "Odontologia",
    icon: "stethoscope",
  },
  {
    name: "Reeducação Alimentar — Programa Completo",
    description: "Programa de reeducação alimentar com acompanhamento de diário alimentar, peso semanal e orientações nutricionais personalizadas.",
    specialty: "Nutrição",
    clinical_condition: "Reeducação Alimentar",
    duration_days: 90,
    template_category: "Nutrição",
    icon: "pill",
  },
];

export default function PatientCareTrails() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState<CareTrail | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trailToDelete, setTrailToDelete] = useState<string | null>(null);

  const { data: trails = [], isLoading } = useCareTrails();
  const { data: templates = [] } = useCareTrailTemplates();
  const updateTrail = useUpdateCareTrail();
  const duplicateTrail = useDuplicateCareTrail();
  const deleteTrail = useDeleteCareTrail();

  const allTemplates = [
    ...templates,
    ...DEFAULT_TEMPLATES.map((t, i) => ({
      ...t,
      id: `default-${i}`,
      professional_id: "",
      is_template: true,
      status: "active" as TrailStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as CareTrail[],
  ];

  const filteredTrails = trails.filter(
    (trail) =>
      !trail.is_template &&
      (trail.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trail.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trail.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEdit = (trail: CareTrail) => {
    setSelectedTrail(trail);
    setWizardOpen(true);
  };

  const handleDuplicate = async (trailId: string) => {
    await duplicateTrail.mutateAsync(trailId);
  };

  const handleViewReport = (trailId: string) => {
    navigate(`/prof/trilhas/${trailId}/relatorio`);
  };

  const handleToggleStatus = async (trailId: string, newStatus: TrailStatus) => {
    await updateTrail.mutateAsync({ id: trailId, status: newStatus });
  };

  const handleDelete = (trailId: string) => {
    setTrailToDelete(trailId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (trailToDelete) {
      await deleteTrail.mutateAsync(trailToDelete);
      setTrailToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleUseTemplate = (template: CareTrail) => {
    setSelectedTrail({
      ...template,
      id: "",
      name: template.name,
      is_template: false,
      status: "draft",
    });
    setWizardOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedTrail(null);
    setWizardOpen(true);
  };

  return (
    <div className="container max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Back Navigation */}
      <Link 
        to="/dashboard" 
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary-foreground hover:bg-primary px-3 py-1.5 rounded-md transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Trilhas de Acompanhamento
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Automatize e personalize o cuidado contínuo dos seus pacientes
          </p>
        </div>
        <Button onClick={handleCreateNew} size="lg" className="w-full sm:w-auto">
          <Plus className="mr-2 h-5 w-5" />
          Criar Nova Trilha
        </Button>
      </div>

      <Tabs defaultValue="my-trails" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="my-trails" className="gap-2 flex-1 sm:flex-none">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Minhas Trilhas</span>
            <span className="sm:hidden">Trilhas</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 flex-1 sm:flex-none">
            <LayoutTemplate className="h-4 w-4" />
            <span className="hidden sm:inline">Templates Prontos</span>
            <span className="sm:hidden">Templates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-trails" className="space-y-4 sm:space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar trilhas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTrails.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "Nenhuma trilha encontrada" : "Nenhuma trilha criada"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Tente buscar com outros termos"
                  : "Crie sua primeira trilha ou use um template pronto"}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Trilha
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredTrails.map((trail) => (
                <TrailCard
                  key={trail.id}
                  trail={trail}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onViewReport={handleViewReport}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-2">
              Trilhas Prontas para Usar
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Comece em minutos com templates criados por especialistas. 
              Personalize conforme suas necessidades.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {allTemplates.map((template) => (
              <TrailTemplateCard
                key={template.id}
                template={template}
                onUseTemplate={handleUseTemplate}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <TrailWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        trail={selectedTrail}
        onSuccess={() => {
          setWizardOpen(false);
          setSelectedTrail(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir trilha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Pacientes inscritos nesta trilha 
              serão desvinculados automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
