import { useState } from "react";
import { 
  Route, 
  Users, 
  Clock, 
  MoreVertical, 
  Edit, 
  Copy, 
  BarChart3, 
  Pause, 
  Play, 
  Trash2,
  Activity,
  Heart,
  Brain,
  Bone,
  Pill,
  Stethoscope,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CareTrail, TrailStatus } from "@/hooks/useCareTrails";

interface TrailCardProps {
  trail: CareTrail & { has_enrollments?: boolean };
  contactPointsCount?: number;
  activeEnrollmentsCount?: number;
  onEdit: (trail: CareTrail) => void;
  onDuplicate: (trailId: string) => void;
  onViewReport: (trailId: string) => void;
  onToggleStatus: (trailId: string, newStatus: TrailStatus) => void;
  onDelete: (trailId: string) => void;
}

const getTrailIcon = (icon: string | null, specialty: string | null) => {
  const iconClass = "w-6 h-6";
  
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
  if (icon === "stethoscope" || specialty?.toLowerCase().includes("odonto") || specialty?.toLowerCase().includes("clínica")) {
    return <Stethoscope className={iconClass} />;
  }
  if (icon === "activity") {
    return <Activity className={iconClass} />;
  }
  return <Route className={iconClass} />;
};

const getStatusBadge = (status: TrailStatus) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Publicada</Badge>;
    case "draft":
      return <Badge variant="secondary">Rascunho</Badge>;
    case "paused":
      return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">Pausada</Badge>;
    case "archived":
      return <Badge variant="outline">Arquivada</Badge>;
    default:
      return null;
  }
};

export const TrailCard = ({
  trail,
  contactPointsCount = 0,
  activeEnrollmentsCount = 0,
  onEdit,
  onDuplicate,
  onViewReport,
  onToggleStatus,
  onDelete,
}: TrailCardProps) => {
  const isLocked = trail.has_enrollments === true;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              {getTrailIcon(trail.icon, trail.specialty)}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                {trail.name}
              </h3>
              {trail.specialty && (
                <p className="text-sm text-muted-foreground">
                  {trail.specialty}
                </p>
              )}
            </div>
          </div>
          
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isLocked ? (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  <Lock className="mr-2 h-4 w-4" />
                  Bloqueada (vinculada a paciente)
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onEdit(trail)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDuplicate(trail.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewReport(trail.id)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Ver Relatório
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {trail.status === "active" ? (
                <DropdownMenuItem onClick={() => onToggleStatus(trail.id, "paused")}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </DropdownMenuItem>
              ) : trail.status === "paused" || trail.status === "draft" ? (
                <DropdownMenuItem onClick={() => onToggleStatus(trail.id, "active")}>
                  <Play className="mr-2 h-4 w-4" />
                  Ativar
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(trail.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4" onClick={() => !isLocked && onEdit(trail)}>
        {trail.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {trail.description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{trail.duration_days} dias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Route className="h-4 w-4" />
            <span>{contactPointsCount} pontos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{activeEnrollmentsCount} ativos</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {isLocked && (
              <Badge variant="outline" className="text-xs gap-1">
                <Lock className="h-3 w-3" />
                Vinculada
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isLocked && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(trail);
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
