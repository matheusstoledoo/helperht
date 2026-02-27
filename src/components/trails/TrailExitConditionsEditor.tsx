import { useState } from "react";
import { 
  LogOut, 
  Plus, 
  Trash2,
  Clock,
  CheckSquare,
  Calendar,
  Target,
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

type ExitType = 
  | "duration_complete"
  | "all_points_complete"
  | "return_scheduled"
  | "goals_reached"
  | "manual";

interface ExitCondition {
  id: string;
  type: ExitType;
  config: Record<string, string>;
  enabled: boolean;
}

const EXIT_CONFIG: Record<ExitType, { 
  icon: typeof LogOut; 
  label: string; 
  description: string;
  color: string;
  configFields?: { key: string; label: string; placeholder: string; type?: string }[];
}> = {
  duration_complete: { 
    icon: Clock, 
    label: "Duração Completa", 
    description: "Encerra quando a duração total da trilha for atingida",
    color: "bg-blue-500/10 text-blue-600",
  },
  all_points_complete: { 
    icon: CheckSquare, 
    label: "Todos os Pontos Respondidos", 
    description: "Encerra quando o paciente responder todos os pontos de contato",
    color: "bg-green-500/10 text-green-600",
  },
  return_scheduled: { 
    icon: Calendar, 
    label: "Retorno Agendado", 
    description: "Encerra quando uma consulta de retorno for agendada",
    color: "bg-purple-500/10 text-purple-600",
    configFields: [
      { key: "days_before_return", label: "Dias antes do retorno", placeholder: "Ex: 3", type: "number" }
    ]
  },
  goals_reached: { 
    icon: Target, 
    label: "Metas Atingidas", 
    description: "Encerra quando as metas clínicas definidas forem alcançadas",
    color: "bg-amber-500/10 text-amber-600",
    configFields: [
      { key: "goal_metric", label: "Métrica", placeholder: "Ex: glicemia média < 120" }
    ]
  },
  manual: { 
    icon: Hand, 
    label: "Encerramento Manual", 
    description: "O profissional encerra a trilha manualmente",
    color: "bg-gray-500/10 text-gray-600",
  },
};

interface TrailExitConditionsEditorProps {
  trailId: string;
  durationDays: number;
  onSave?: () => void;
}

export const TrailExitConditionsEditor = ({ trailId, durationDays, onSave }: TrailExitConditionsEditorProps) => {
  const [exitConditions, setExitConditions] = useState<ExitCondition[]>([
    { id: "1", type: "duration_complete", config: {}, enabled: true },
    { id: "2", type: "all_points_complete", config: {}, enabled: true }
  ]);
  const [addingCondition, setAddingCondition] = useState(false);

  const handleAddCondition = (type: ExitType) => {
    const newCondition: ExitCondition = {
      id: Date.now().toString(),
      type,
      config: {},
      enabled: true
    };
    setExitConditions([...exitConditions, newCondition]);
    setAddingCondition(false);
    toast.success("Condição de saída adicionada!");
  };

  const handleRemoveCondition = (id: string) => {
    if (exitConditions.length <= 1) {
      toast.error("É necessário manter pelo menos uma condição de saída.");
      return;
    }
    setExitConditions(exitConditions.filter(c => c.id !== id));
    toast.success("Condição removida!");
  };

  const handleToggleCondition = (id: string) => {
    setExitConditions(exitConditions.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const handleUpdateConfig = (id: string, key: string, value: string) => {
    setExitConditions(exitConditions.map(c => 
      c.id === id ? { ...c, config: { ...c.config, [key]: value } } : c
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Condições de Saída</h3>
          <p className="text-sm text-muted-foreground">
            Defina quando a trilha deve encerrar automaticamente
          </p>
        </div>
        <Badge variant="secondary">
          {exitConditions.filter(c => c.enabled).length} ativa{exitConditions.filter(c => c.enabled).length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Info about duration */}
      <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div className="text-sm">
          <span className="text-muted-foreground">Duração configurada: </span>
          <span className="font-medium">{durationDays} dias</span>
        </div>
      </div>

      {/* Active Exit Conditions */}
      <div className="space-y-3">
        {exitConditions.map((condition) => {
          const config = EXIT_CONFIG[condition.type];
          const Icon = config.icon;
          
          return (
            <Card key={condition.id} className={condition.enabled ? "" : "opacity-60"}>
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
                          checked={condition.enabled}
                          onCheckedChange={() => handleToggleCondition(condition.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveCondition(condition.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Config Fields */}
                    {config.configFields && condition.enabled && (
                      <div className="mt-3 space-y-2">
                        {config.configFields.map((field) => (
                          <div key={field.key} className="flex items-center gap-2">
                            <Label className="text-sm w-32">{field.label}:</Label>
                            <Input 
                              className="flex-1 h-8"
                              type={field.type || "text"}
                              placeholder={field.placeholder}
                              value={condition.config[field.key] || ""}
                              onChange={(e) => handleUpdateConfig(condition.id, field.key, e.target.value)}
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

      {/* Add Exit Condition */}
      {addingCondition ? (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Selecione a condição de saída:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(EXIT_CONFIG).map(([type, config]) => {
                const Icon = config.icon;
                const isAlreadyAdded = exitConditions.some(c => c.type === type);
                
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    disabled={isAlreadyAdded}
                    onClick={() => handleAddCondition(type as ExitType)}
                  >
                    <div className={`p-1.5 rounded mr-2 ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{config.description}</p>
                    </div>
                    {isAlreadyAdded && <Check className="ml-auto h-4 w-4 text-green-600 shrink-0" />}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              className="mt-3 w-full"
              onClick={() => setAddingCondition(false)}
            >
              Cancelar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setAddingCondition(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Condição de Saída
        </Button>
      )}

      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">💡 Dica</p>
        <p>
          Múltiplas condições funcionam como "OU" — a trilha encerrará quando 
          qualquer uma das condições ativas for satisfeita primeiro.
        </p>
      </div>
    </div>
  );
};
