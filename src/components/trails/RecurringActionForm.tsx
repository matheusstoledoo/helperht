import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Loader2 } from "lucide-react";
import { 
  TrailContactPoint,
  useCreateContactPoint,
  useUpdateContactPoint
} from "@/hooks/useCareTrails";

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  message_content: z.string().optional(),
  day_offset: z.coerce.number().min(0).default(0),
  recurrence_type: z.string().default("weekly"),
  recurrence_interval: z.coerce.number().min(1).default(1),
  recurrence_unit: z.string().default("weeks"),
  recurrence_days_of_week: z.array(z.number()).optional(),
  recurrence_end_date: z.string().optional(),
  recurrence_max_occurrences: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RecurringActionFormProps {
  trailId: string;
  actionCategory: string;
  existingPoint?: TrailContactPoint;
  durationDays: number;
  specialty?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ACTION_TITLE_SUGGESTIONS: Record<string, string[]> = {
  communication: [
    "Enviar follow-up ao paciente",
    "Mensagem de acompanhamento",
    "Lembrar paciente sobre medicação",
    "Verificar bem-estar do paciente",
  ],
  clinical_task: [
    "Solicitar exames de controle",
    "Ajustar dosagem de medicamento",
    "Avaliar resultados laboratoriais",
    "Revisar plano terapêutico",
  ],
  review: [
    "Checar adesão ao tratamento",
    "Revisar sintomas relatados",
    "Avaliar progresso das metas",
    "Verificar efeitos colaterais",
  ],
};

export const RecurringActionForm = ({
  trailId,
  actionCategory,
  existingPoint,
  durationDays,
  specialty,
  onSuccess,
  onCancel,
}: RecurringActionFormProps) => {
  const createPoint = useCreateContactPoint();
  const updatePoint = useUpdateContactPoint();

  const existingRecurrence = existingPoint as any;

  // Determine the unit for custom recurrence from existing data
  const getInitialUnit = () => {
    if (!existingRecurrence?.recurrence_type || existingRecurrence.recurrence_type !== "custom") return "weeks";
    // We'll store the unit info; default to days
    return existingRecurrence?.recurrence_unit || "days";
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: existingPoint?.title || "",
      message_content: existingPoint?.message_content || "",
      day_offset: existingPoint?.day_offset ?? 0,
      recurrence_type: existingRecurrence?.recurrence_type || "weekly",
      recurrence_interval: existingRecurrence?.recurrence_interval || 1,
      recurrence_unit: getInitialUnit(),
      recurrence_days_of_week: existingRecurrence?.recurrence_days_of_week || [],
      recurrence_end_date: existingRecurrence?.recurrence_end_date || "",
      recurrence_max_occurrences: existingRecurrence?.recurrence_max_occurrences || undefined,
    },
  });

  const recurrenceType = form.watch("recurrence_type");
  const selectedDays = form.watch("recurrence_days_of_week") || [];
  const suggestions = ACTION_TITLE_SUGGESTIONS[actionCategory] || [];

  const showDaysOfWeek = recurrenceType === "weekly" || recurrenceType === "biweekly" || recurrenceType === "custom";

  const onSubmit = async (values: FormValues) => {
    // Map biweekly to weekly with interval 2
    let finalRecurrenceType = values.recurrence_type;
    let finalInterval = values.recurrence_interval;

    if (values.recurrence_type === "biweekly") {
      finalRecurrenceType = "weekly";
      finalInterval = 2;
    } else if (values.recurrence_type === "custom") {
      // For custom, set the interval based on unit
      finalRecurrenceType = "custom";
      finalInterval = values.recurrence_interval;
    } else if (values.recurrence_type === "daily") {
      finalInterval = 1;
    } else if (values.recurrence_type === "weekly") {
      finalInterval = 1;
    } else if (values.recurrence_type === "monthly") {
      finalInterval = 1;
    }

    const pointData: any = {
      title: values.title,
      point_type: "professional_task" as const,
      day_offset: values.day_offset,
      hour_of_day: 9,
      minute_of_day: 0,
      message_content: values.message_content || null,
      requires_response: false,
      action_category: actionCategory,
      recurrence_type: finalRecurrenceType,
      recurrence_interval: finalInterval,
      recurrence_days_of_week: values.recurrence_days_of_week?.length ? values.recurrence_days_of_week : null,
      recurrence_end_date: values.recurrence_end_date || null,
      recurrence_max_occurrences: values.recurrence_max_occurrences || null,
    };

    try {
      if (existingPoint) {
        await updatePoint.mutateAsync({ id: existingPoint.id, ...pointData });
      } else {
        await createPoint.mutateAsync({ trail_id: trailId, ...pointData });
      }
      onSuccess();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const toggleDay = (day: number) => {
    const current = form.getValues("recurrence_days_of_week") || [];
    if (current.includes(day)) {
      form.setValue("recurrence_days_of_week", current.filter(d => d !== day));
    } else {
      form.setValue("recurrence_days_of_week", [...current, day].sort());
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Title with suggestions */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da Ação *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Enviar follow-up semanal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Objectives */}
        <FormField
          control={form.control}
          name="message_content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivos</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva os objetivos desta ação, checklist ou observações..."
                  className="resize-none min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Recurrence Type */}
        <FormField
          control={form.control}
          name="recurrence_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequência</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Custom recurrence config */}
        {recurrenceType === "custom" && (
          <div className="space-y-3 rounded-lg border p-3">
            <Label className="text-sm font-medium">Configuração Personalizada</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">A cada</span>
              <FormField
                control={form.control}
                name="recurrence_interval"
                render={({ field }) => (
                  <FormItem className="flex-shrink-0">
                    <FormControl>
                      <Input type="number" min={1} {...field} className="w-20" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recurrence_unit"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="days">dia(s)</SelectItem>
                        <SelectItem value="weeks">semana(s)</SelectItem>
                        <SelectItem value="months">mês(es)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Days of week selector */}
        {showDaysOfWeek && (
          <div className="space-y-2">
            <Label>Dias da Semana</Label>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant={selectedDays.includes(day.value) ? "default" : "outline"}
                  size="sm"
                  className="w-10 h-10 p-0 text-xs"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione os dias em que esta ação deve ocorrer
            </p>
          </div>
        )}

        {/* End conditions (optional) */}
        <div className="space-y-3 pt-3 border-t">
          <Label className="text-sm font-medium">Condições de Término (opcional)</Label>
          <FormField
            control={form.control}
            name="recurrence_end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de término</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Se vazio, segue até o final da trilha
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recurrence_max_occurrences"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Máximo de repetições</FormLabel>
                <FormControl>
                  <Input type="number" min={1} placeholder="Sem limite" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={createPoint.isPending || updatePoint.isPending}
          >
            {(createPoint.isPending || updatePoint.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {existingPoint ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
