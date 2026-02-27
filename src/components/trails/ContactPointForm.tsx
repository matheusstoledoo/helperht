import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, Sparkles } from "lucide-react";
import { 
  TrailContactPoint,
  ContactPointType,
  StructuredDataType,
  useCreateContactPoint,
  useUpdateContactPoint
} from "@/hooks/useCareTrails";
import { getSpecialtyConfig, SpecialtyConfig } from "@/config/specialtyTrailConfig";

const contactPointSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  day_offset: z.coerce.number().min(0),
  hour_of_day: z.coerce.number().min(0).max(23),
  minute_of_day: z.coerce.number().min(0).max(59),
  message_content: z.string().optional(),
  structured_data_type: z.string().optional(),
  question_options: z.string().optional(), // Comma-separated
  requires_response: z.boolean().default(false),
  reminder_hours_if_no_response: z.coerce.number().optional(),
  notify_professional_if_no_response: z.boolean().default(false),
  continue_if_no_response: z.boolean().default(true),
  critical_keywords: z.string().optional(), // Comma-separated
});

type ContactPointFormValues = z.infer<typeof contactPointSchema>;

interface ContactPointFormProps {
  trailId: string;
  pointType: ContactPointType;
  defaultDay?: number;
  existingPoint?: TrailContactPoint;
  specialty?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const DYNAMIC_VARIABLES = [
  { key: "{{nome}}", label: "Nome do paciente" },
  { key: "{{dias_desde_consulta}}", label: "Dias desde última consulta" },
  { key: "{{condicao_principal}}", label: "Condição principal" },
];

export const ContactPointForm = ({
  trailId,
  pointType,
  defaultDay = 0,
  existingPoint,
  specialty,
  onSuccess,
  onCancel,
}: ContactPointFormProps) => {
  const createPoint = useCreateContactPoint();
  const updatePoint = useUpdateContactPoint();

  // Get specialty-specific configuration
  const specialtyConfig = getSpecialtyConfig(specialty);
  const structuredDataTypes = specialtyConfig.structuredDataTypes;

  const form = useForm<ContactPointFormValues>({
    resolver: zodResolver(contactPointSchema),
    defaultValues: {
      title: existingPoint?.title || "",
      day_offset: existingPoint?.day_offset ?? defaultDay,
      hour_of_day: existingPoint?.hour_of_day ?? 9,
      minute_of_day: existingPoint?.minute_of_day ?? 0,
      message_content: existingPoint?.message_content || "",
      structured_data_type: existingPoint?.structured_data_type || "",
      question_options: existingPoint?.question_options?.join(", ") || "",
      requires_response: existingPoint?.requires_response ?? (pointType !== "educational_message"),
      reminder_hours_if_no_response: existingPoint?.reminder_hours_if_no_response ?? 24,
      notify_professional_if_no_response: existingPoint?.notify_professional_if_no_response ?? false,
      continue_if_no_response: existingPoint?.continue_if_no_response ?? true,
      critical_keywords: existingPoint?.critical_keywords?.join(", ") || specialtyConfig.criticalKeywords.slice(0, 4).join(", "),
    },
  });

  const onSubmit = async (values: ContactPointFormValues) => {
    const pointData = {
      title: values.title,
      point_type: pointType,
      day_offset: values.day_offset,
      hour_of_day: values.hour_of_day,
      minute_of_day: values.minute_of_day,
      message_content: values.message_content || null,
      structured_data_type: values.structured_data_type as StructuredDataType || null,
      question_options: values.question_options 
        ? values.question_options.split(",").map(s => s.trim()).filter(Boolean)
        : null,
      requires_response: values.requires_response,
      reminder_hours_if_no_response: values.reminder_hours_if_no_response || null,
      notify_professional_if_no_response: values.notify_professional_if_no_response,
      continue_if_no_response: values.continue_if_no_response,
      critical_keywords: values.critical_keywords
        ? values.critical_keywords.split(",").map(s => s.trim()).filter(Boolean)
        : null,
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

  const insertVariable = (variable: string) => {
    const currentContent = form.getValues("message_content") || "";
    form.setValue("message_content", currentContent + variable);
  };

  const showMessageField = ["educational_message", "open_question", "closed_question", "reminder"].includes(pointType);
  const showStructuredDataType = pointType === "structured_data";
  const showQuestionOptions = pointType === "closed_question";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título *</FormLabel>
              <FormControl>
                <Input 
                  placeholder={
                    specialtyConfig.suggestedContactPoints.find(p => p.type === pointType)?.label || 
                    "Ex: Verificar dados do paciente"
                  } 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="day_offset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hour_of_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={23} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minute_of_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minuto</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={59} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showStructuredDataType && (
          <FormField
            control={form.control}
            name="structured_data_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Dado a Coletar</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de dado..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {structuredDataTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tipos de dados específicos para {specialty || "sua área"}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showMessageField && (
          <FormField
            control={form.control}
            name="message_content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mensagem</FormLabel>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {DYNAMIC_VARIABLES.map((variable) => (
                      <Button
                        key={variable.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => insertVariable(variable.key)}
                      >
                        {variable.key}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 ml-auto"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Gerar com IA
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea 
                      placeholder="Digite a mensagem para o paciente..."
                      className="resize-none min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                </div>
                <FormDescription>
                  Use variáveis dinâmicas para personalizar a mensagem
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showQuestionOptions && (
          <FormField
            control={form.control}
            name="question_options"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opções de Resposta</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Opção 1, Opção 2, Opção 3" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Separe as opções por vírgula
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-sm">Configurações Avançadas</h4>

          <FormField
            control={form.control}
            name="requires_response"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Aguardar resposta do paciente</FormLabel>
                  <FormDescription className="text-xs">
                    Pausa a trilha até o paciente responder
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("requires_response") && (
            <>
              <FormField
                control={form.control}
                name="reminder_hours_if_no_response"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lembrete após (horas)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription>
                      Envia lembrete se não houver resposta
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notify_professional_if_no_response"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Notificar profissional</FormLabel>
                      <FormDescription className="text-xs">
                        Receba alerta se não houver resposta
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="critical_keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Palavras-chave Críticas</FormLabel>
                {specialtyConfig.criticalKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {specialtyConfig.criticalKeywords.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        onClick={() => {
                          const current = form.getValues("critical_keywords") || "";
                          const keywords = current.split(",").map(k => k.trim()).filter(Boolean);
                          if (!keywords.includes(keyword)) {
                            form.setValue("critical_keywords", [...keywords, keyword].join(", "));
                          }
                        }}
                      >
                        + {keyword}
                      </button>
                    ))}
                  </div>
                )}
                <FormControl>
                  <Input 
                    placeholder={specialtyConfig.criticalKeywords.slice(0, 4).join(", ") || "dor intensa, piora, crise"} 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Gera alerta imediato se detectadas na resposta
                </FormDescription>
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
