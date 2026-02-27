import { useState } from "react";
import { 
  Zap, 
  Plus, 
  Trash2,
  Calendar,
  FileText,
  Stethoscope,
  Tag,
  Hand,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type TriggerType = 
  | "manual"
  | "first_consultation"
  | "post_report"
  | "specific_diagnosis"
  | "patient_tag";

interface TrailTrigger {
  id: string;
  type: TriggerType;
  config: Record<string, string>;
  enabled: boolean;
}

const TRIGGER_CONFIG: Record<TriggerType, { 
  icon: typeof Zap; 
  label: string; 
  description: string;
  color: string;
  configFields?: { key: string; label: string; placeholder: string }[];
}> = {
  manual: { 
    icon: Hand, 
    label: "Inscrição Manual", 
    description: "O profissional inscreve o paciente manualmente",
    color: "bg-gray-500/10 text-gray-600",
  },
  first_consultation: { 
    icon: Calendar, 
    label: "Primeira Consulta", 
    description: "Inicia automaticamente após a primeira consulta do paciente",
    color: "bg-blue-500/10 text-blue-600",
  },
  post_report: { 
    icon: FileText, 
    label: "Após Laudo", 
    description: "Inicia após envio de um laudo ou exame específico",
    color: "bg-purple-500/10 text-purple-600",
    configFields: [
      { key: "exam_type", label: "Tipo de Exame", placeholder: "Ex: Hemograma, Glicemia" }
    ]
  },
  specific_diagnosis: { 
    icon: Stethoscope, 
    label: "Diagnóstico Específico", 
    description: "Inicia quando um diagnóstico específico (CID) é registrado",
    color: "bg-green-500/10 text-green-600",
    configFields: [
      { key: "icd_code", label: "Código CID", placeholder: "Ex: E11 (Diabetes Tipo 2)" }
    ]
  },
  patient_tag: { 
    icon: Tag, 
    label: "Tag do Paciente", 
    description: "Inicia quando o paciente recebe uma tag específica",
    color: "bg-amber-500/10 text-amber-600",
    configFields: [
      { key: "tag", label: "Tag", placeholder: "Ex: gestante, idoso, hipertenso" }
    ]
  },
};

interface TrailTriggersEditorProps {
  trailId: string;
  onSave?: () => void;
}

export const TrailTriggersEditor = ({ trailId, onSave }: TrailTriggersEditorProps) => {
  const [triggers, setTriggers] = useState<TrailTrigger[]>([
    { id: "1", type: "manual", config: {}, enabled: true }
  ]);
  const [addingTrigger, setAddingTrigger] = useState(false);

  const handleAddTrigger = (type: TriggerType) => {
    const newTrigger: TrailTrigger = {
      id: Date.now().toString(),
      type,
      config: {},
      enabled: true
    };
    setTriggers([...triggers, newTrigger]);
    setAddingTrigger(false);
    toast.success("Gatilho adicionado!");
  };

  const handleRemoveTrigger = (id: string) => {
    if (triggers.length <= 1) {
      toast.error("É necessário manter pelo menos um gatilho.");
      return;
    }
    setTriggers(triggers.filter(t => t.id !== id));
    toast.success("Gatilho removido!");
  };

  const handleToggleTrigger = (id: string) => {
    setTriggers(triggers.map(t => 
      t.id === id ? { ...t, enabled: !t.enabled } : t
    ));
  };

  const handleUpdateConfig = (id: string, key: string, value: string) => {
    setTriggers(triggers.map(t => 
      t.id === id ? { ...t, config: { ...t.config, [key]: value } } : t
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Gatilhos de Início</h3>
          <p className="text-sm text-muted-foreground">
            Defina quando a trilha deve iniciar automaticamente para um paciente
          </p>
        </div>
        <Badge variant="secondary">
          {triggers.filter(t => t.enabled).length} ativo{triggers.filter(t => t.enabled).length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Active Triggers */}
      <div className="space-y-3">
        {triggers.map((trigger) => {
          const config = TRIGGER_CONFIG[trigger.type];
          const Icon = config.icon;
          
          return (
            <Card key={trigger.id} className={trigger.enabled ? "" : "opacity-60"}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{config.label}</p>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={trigger.enabled}
                          onCheckedChange={() => handleToggleTrigger(trigger.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveTrigger(trigger.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Config Fields */}
                    {config.configFields && trigger.enabled && (
                      <div className="mt-3 space-y-2">
                        {config.configFields.map((field) => (
                          <div key={field.key} className="flex items-center gap-2">
                            <Label className="text-sm w-32">{field.label}:</Label>
                            <Input 
                              className="flex-1 h-8"
                              placeholder={field.placeholder}
                              value={trigger.config[field.key] || ""}
                              onChange={(e) => handleUpdateConfig(trigger.id, field.key, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Trigger */}
      {addingTrigger ? (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Selecione o tipo de gatilho:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(TRIGGER_CONFIG).map(([type, config]) => {
                const Icon = config.icon;
                const isAlreadyAdded = triggers.some(t => t.type === type);
                
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    disabled={isAlreadyAdded}
                    onClick={() => handleAddTrigger(type as TriggerType)}
                  >
                    <div className={`p-1.5 rounded mr-2 ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                    {isAlreadyAdded && <Check className="ml-auto h-4 w-4 text-green-600" />}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              className="mt-3 w-full"
              onClick={() => setAddingTrigger(false)}
            >
              Cancelar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setAddingTrigger(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Gatilho
        </Button>
      )}

      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">💡 Dica</p>
        <p>
          Múltiplos gatilhos funcionam como "OU" — o paciente será inscrito quando 
          qualquer um dos gatilhos ativos for acionado.
        </p>
      </div>
    </div>
  );
};
