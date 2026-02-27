import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Settings,
  ListChecks,
  PlayCircle
} from "lucide-react";
import { 
  CareTrail, 
  useCreateCareTrail, 
  useUpdateCareTrail,
  useDeleteCareTrail,
  useTrailContactPoints
} from "@/hooks/useCareTrails";
import { RecurringActionsEditor } from "./RecurringActionsEditor";
import { cn } from "@/lib/utils";
import { getSpecialtyConfig, SPECIALTY_CONFIGS } from "@/config/specialtyTrailConfig";
import { Badge } from "@/components/ui/badge";

const trailFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  specialty: z.string().optional(),
  clinical_condition: z.string().optional(),
  description: z.string().optional(),
  duration_days: z.coerce.number().min(1, "Duração mínima de 1 dia"),
  clinical_objective: z.string().optional(),
});

type TrailFormValues = z.infer<typeof trailFormSchema>;

interface TrailWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trail?: CareTrail | null;
  onSuccess?: () => void;
}

const WIZARD_STEPS = [
  { id: "basics", label: "Configurações", icon: Settings },
  { id: "actions", label: "Ações Recorrentes", icon: ListChecks },
  { id: "review", label: "Revisão", icon: PlayCircle },
];

const SPECIALTIES = Object.keys(SPECIALTY_CONFIGS);

const SPECIALTY_CATEGORIES: Record<string, { label: string; color: string }> = {
  medicine: { label: "Medicina", color: "bg-blue-100 text-blue-700" },
  nutrition: { label: "Nutrição", color: "bg-green-100 text-green-700" },
  psychology: { label: "Saúde Mental", color: "bg-purple-100 text-purple-700" },
  physiotherapy: { label: "Reabilitação", color: "bg-orange-100 text-orange-700" },
  dentistry: { label: "Odontologia", color: "bg-cyan-100 text-cyan-700" },
  other: { label: "Outros", color: "bg-gray-100 text-gray-700" },
};

export const TrailWizard = ({ open, onOpenChange, trail, onSuccess }: TrailWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [localTrailId, setLocalTrailId] = useState<string | null>(trail?.id || null);
  const [pendingValues, setPendingValues] = useState<TrailFormValues | null>(null);
  const [isNewlyCreated, setIsNewlyCreated] = useState(false);
  
  const createTrail = useCreateCareTrail();
  const updateTrail = useUpdateCareTrail();
  const deleteTrail = useDeleteCareTrail();
  const { data: contactPoints = [] } = useTrailContactPoints(localTrailId || undefined);

  // Cleanup: if user closes wizard without finishing a newly created trail, delete it
  const handleDialogClose = async (isOpen: boolean) => {
    if (!isOpen && isNewlyCreated && localTrailId) {
      try {
        await deleteTrail.mutateAsync(localTrailId);
      } catch (e) {
        // Silently fail cleanup
      }
    }
    onOpenChange(isOpen);
  };

  const form = useForm<TrailFormValues>({
    resolver: zodResolver(trailFormSchema),
    defaultValues: {
      name: trail?.name || "",
      specialty: trail?.specialty || "",
      clinical_condition: trail?.clinical_condition || "",
      description: trail?.description || "",
      duration_days: trail?.duration_days || 30,
      clinical_objective: trail?.clinical_objective || "",
    },
  });

  const selectedSpecialty = form.watch("specialty");
  const specialtyConfig = getSpecialtyConfig(selectedSpecialty);

  useEffect(() => {
    if (trail) {
      form.reset({
        name: trail.name || "",
        specialty: trail.specialty || "",
        clinical_condition: trail.clinical_condition || "",
        description: trail.description || "",
        duration_days: trail.duration_days || 30,
        clinical_objective: trail.clinical_objective || "",
      });
      setLocalTrailId(trail.id);
      setPendingValues(null);
      setIsNewlyCreated(false);
    } else {
      form.reset({
        name: "",
        specialty: "",
        clinical_condition: "",
        description: "",
        duration_days: 30,
        clinical_objective: "",
      });
      setLocalTrailId(null);
      setPendingValues(null);
      setIsNewlyCreated(false);
    }
    setCurrentStep(0);
  }, [trail, form, open]);

  // For new trails: step 0 just validates and moves forward without persisting
  // For existing trails (editing): step 0 saves and moves forward
  const handleSaveBasics = async (values: TrailFormValues) => {
    try {
      if (localTrailId) {
        // Editing existing trail — save immediately
        await updateTrail.mutateAsync({ id: localTrailId, ...values });
        setCurrentStep(1);
      } else {
        // New trail — just store values locally, persist later
        setPendingValues(values);
        // We need a trail in DB to add contact points, so create it now
        const newTrail = await createTrail.mutateAsync({
          name: values.name,
          specialty: values.specialty,
          clinical_condition: values.clinical_condition,
          description: values.description,
          duration_days: values.duration_days,
          clinical_objective: values.clinical_objective,
        });
        setLocalTrailId(newTrail.id);
        setIsNewlyCreated(true);
        setCurrentStep(1);
      }
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handlePublish = async () => {
    if (!localTrailId) return;
    try {
      await updateTrail.mutateAsync({ id: localTrailId, status: "active" });
      setIsNewlyCreated(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleSaveDraft = async () => {
    if (!localTrailId) return;
    setIsNewlyCreated(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveBasics)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Trilha *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Acompanhamento Pós-Cirúrgico" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clinical_condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{specialtyConfig.clinicalConditionLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={specialtyConfig.clinicalConditionPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description and objective fields removed per user request */}

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createTrail.isPending || updateTrail.isPending}>
                  {(createTrail.isPending || updateTrail.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        );

      case 1:
        return (
          <div className="space-y-4">
            <RecurringActionsEditor 
              trailId={localTrailId!} 
              durationDays={form.getValues("duration_days")}
              specialty={selectedSpecialty}
            />
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={() => setCurrentStep(2)}>
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold">Resumo da Trilha</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{form.getValues("name")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Duração</Label>
                  <p className="font-medium">{form.getValues("duration_days")} dias</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Especialidade</Label>
                  <p className="font-medium">{form.getValues("specialty") || "Não definida"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ações Recorrentes</Label>
                  <p className="font-medium">{contactPoints.length} ações</p>
                </div>
              </div>
              {form.getValues("description") && (
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="text-sm mt-1">{form.getValues("description")}</p>
                </div>
              )}
            </div>

            {contactPoints.length === 0 && (
              <div className="bg-amber-500/10 text-amber-600 rounded-lg p-4 text-sm">
                ⚠️ Esta trilha não possui ações recorrentes. Adicione pelo menos uma ação 
                antes de ativar.
              </div>
            )}

            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">📋 Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Após publicar, selecione esta trilha ao criar uma consulta para vincular ao paciente</li>
                <li>O sistema gerará lembretes automáticos no seu dashboard</li>
                <li>Você receberá notificações por email nos horários configurados</li>
                <li>Marque cada tarefa como concluída, adiada ou ignorada</li>
                <li>Trilhas vinculadas a pacientes não podem ser editadas</li>
              </ul>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button 
                  onClick={handlePublish}
                  disabled={contactPoints.length === 0 || updateTrail.isPending}
                >
                  {updateTrail.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Publicar Trilha
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trail ? "Editar Trilha" : "Criar Nova Trilha"}
          </DialogTitle>
          <DialogDescription>
            {trail 
              ? "Modifique as configurações e ações recorrentes da trilha."
              : "Configure sua trilha de acompanhamento longitudinal."
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {WIZARD_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isClickable = localTrailId && index <= currentStep;

            return (
              <div 
                key={step.id} 
                className={cn(
                  "flex items-center",
                  index < WIZARD_STEPS.length - 1 && "flex-1"
                )}
              >
                <button
                  type="button"
                  onClick={() => isClickable && setCurrentStep(index)}
                  disabled={!isClickable}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-colors",
                    isClickable && "cursor-pointer hover:text-accent",
                    !isClickable && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isActive && "border-accent bg-accent text-accent-foreground",
                    isCompleted && "border-accent bg-accent/20 text-accent",
                    !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isActive && "text-foreground",
                    !isActive && "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </button>
                
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 mt-[-20px]",
                    isCompleted ? "bg-accent" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
