import { 
  Route, 
  Heart, 
  Brain, 
  Bone, 
  Pill, 
  Activity,
  Stethoscope,
  ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CareTrail } from "@/hooks/useCareTrails";

interface TrailTemplateCardProps {
  template: CareTrail;
  onUseTemplate: (template: CareTrail) => void;
}

const getTemplateIcon = (category: string | null) => {
  const iconClass = "w-8 h-8";
  
  switch (category?.toLowerCase()) {
    case "diabetes":
    case "endocrinologia":
      return <Activity className={iconClass} />;
    case "cardiologia":
    case "hipertensão":
      return <Heart className={iconClass} />;
    case "saúde mental":
    case "psicologia":
    case "psiquiatria":
      return <Brain className={iconClass} />;
    case "fisioterapia":
    case "ortopedia":
    case "reabilitação":
      return <Bone className={iconClass} />;
    case "nutrição":
    case "obesidade":
      return <Pill className={iconClass} />;
    case "cirurgia":
    case "pós-operatório":
    case "odontologia":
      return <Stethoscope className={iconClass} />;
    default:
      return <Route className={iconClass} />;
  }
};

const getCategoryColor = (category: string | null) => {
  switch (category?.toLowerCase()) {
    case "diabetes":
    case "endocrinologia":
      return "bg-blue-500/10 text-blue-600";
    case "cardiologia":
    case "hipertensão":
      return "bg-red-500/10 text-red-600";
    case "saúde mental":
    case "psicologia":
    case "psiquiatria":
      return "bg-purple-500/10 text-purple-600";
    case "fisioterapia":
    case "ortopedia":
    case "reabilitação":
      return "bg-orange-500/10 text-orange-600";
    case "nutrição":
    case "obesidade":
      return "bg-green-500/10 text-green-600";
    case "cirurgia":
    case "pós-operatório":
    case "odontologia":
      return "bg-cyan-500/10 text-cyan-600";
    default:
      return "bg-accent/10 text-accent";
  }
};

export const TrailTemplateCard = ({ template, onUseTemplate }: TrailTemplateCardProps) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <CardContent className="p-0">
        <div className={`p-4 ${getCategoryColor(template.template_category)}`}>
          <div className="flex items-center justify-between">
            {getTemplateIcon(template.template_category)}
            {template.template_category && (
              <Badge variant="secondary" className="text-xs">
                {template.template_category}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <h3 className="font-semibold leading-tight line-clamp-2">
            {template.name}
          </h3>
          
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {template.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{template.duration_days} dias</span>
            <span>•</span>
            <span>{template.specialty || "Geral"}</span>
          </div>
          
          <Button 
            className="w-full mt-2 group-hover:bg-accent group-hover:text-accent-foreground transition-colors"
            variant="outline"
            onClick={() => onUseTemplate(template)}
          >
            Usar esta trilha
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
