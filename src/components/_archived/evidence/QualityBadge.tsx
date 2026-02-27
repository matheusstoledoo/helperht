import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from "lucide-react";

type QualityLevel = "high" | "moderate" | "low" | "critically_low" | "very_low";
type BiasRisk = "low" | "some_concerns" | "high" | "serious" | "critical";

interface QualityBadgeProps {
  type: "methodology" | "bias" | "evidence" | "applicability";
  value: QualityLevel | BiasRisk | string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const METHODOLOGY_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  high: { label: "Alta Qualidade", color: "bg-green-500 hover:bg-green-600", icon: CheckCircle },
  moderate: { label: "Qualidade Moderada", color: "bg-yellow-500 hover:bg-yellow-600", icon: AlertCircle },
  low: { label: "Baixa Qualidade", color: "bg-orange-500 hover:bg-orange-600", icon: AlertTriangle },
  critically_low: { label: "Criticamente Baixa", color: "bg-red-600 hover:bg-red-700", icon: XCircle },
};

const BIAS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  low: { label: "Baixo Risco", color: "bg-green-500 hover:bg-green-600", icon: CheckCircle },
  some_concerns: { label: "Algumas Preocupações", color: "bg-yellow-500 hover:bg-yellow-600", icon: AlertCircle },
  high: { label: "Alto Risco", color: "bg-orange-500 hover:bg-orange-600", icon: AlertTriangle },
  serious: { label: "Risco Sério", color: "bg-red-500 hover:bg-red-600", icon: XCircle },
  critical: { label: "Risco Crítico", color: "bg-red-700 hover:bg-red-800", icon: XCircle },
};

const EVIDENCE_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  high: { label: "Alta Certeza", color: "bg-green-500 hover:bg-green-600", icon: CheckCircle },
  moderate: { label: "Certeza Moderada", color: "bg-yellow-500 hover:bg-yellow-600", icon: AlertCircle },
  low: { label: "Baixa Certeza", color: "bg-orange-500 hover:bg-orange-600", icon: AlertTriangle },
  very_low: { label: "Muito Baixa Certeza", color: "bg-red-500 hover:bg-red-600", icon: XCircle },
};

const APPLICABILITY_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  high: { label: "Alta Aplicabilidade", color: "bg-green-500 hover:bg-green-600", icon: CheckCircle },
  moderate: { label: "Aplicabilidade Moderada", color: "bg-yellow-500 hover:bg-yellow-600", icon: AlertCircle },
  low: { label: "Baixa Aplicabilidade", color: "bg-orange-500 hover:bg-orange-600", icon: AlertTriangle },
};

export const QualityBadge = ({
  type,
  value,
  showIcon = true,
  size = "md",
}: QualityBadgeProps) => {
  let config: { label: string; color: string; icon: typeof CheckCircle };

  switch (type) {
    case "methodology":
      config = METHODOLOGY_CONFIG[value] || { label: value, color: "bg-gray-500", icon: HelpCircle };
      break;
    case "bias":
      config = BIAS_CONFIG[value] || { label: value, color: "bg-gray-500", icon: HelpCircle };
      break;
    case "evidence":
      config = EVIDENCE_CONFIG[value] || { label: value, color: "bg-gray-500", icon: HelpCircle };
      break;
    case "applicability":
      config = APPLICABILITY_CONFIG[value] || { label: value, color: "bg-gray-500", icon: HelpCircle };
      break;
    default:
      config = { label: value, color: "bg-gray-500", icon: HelpCircle };
  }

  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Badge
      className={cn(
        "text-white font-medium gap-1",
        config.color,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
};
