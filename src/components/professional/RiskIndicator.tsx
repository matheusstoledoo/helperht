import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskIndicatorProps {
  level: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  timestamp?: string;
}

export const RiskIndicator = ({ level, title, description, timestamp }: RiskIndicatorProps) => {
  const config = {
    critical: {
      icon: AlertTriangle,
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-300 dark:border-red-800",
      iconColor: "text-red-600",
      textColor: "text-red-900 dark:text-red-200",
      badgeVariant: "destructive" as const,
      badgeText: "CRÍTICO",
      animation: "animate-pulse"
    },
    high: {
      icon: AlertCircle,
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-300 dark:border-orange-800",
      iconColor: "text-orange-600",
      textColor: "text-orange-900 dark:text-orange-200",
      badgeVariant: "default" as const,
      badgeText: "ALTO",
      animation: ""
    },
    medium: {
      icon: Info,
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
      borderColor: "border-yellow-300 dark:border-yellow-800",
      iconColor: "text-yellow-600",
      textColor: "text-yellow-900 dark:text-yellow-200",
      badgeVariant: "secondary" as const,
      badgeText: "MÉDIO",
      animation: ""
    },
    low: {
      icon: CheckCircle,
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-300 dark:border-green-800",
      iconColor: "text-green-600",
      textColor: "text-green-900 dark:text-green-200",
      badgeVariant: "outline" as const,
      badgeText: "BAIXO",
      animation: ""
    }
  };

  const { icon: Icon, bgColor, borderColor, iconColor, textColor, badgeVariant, badgeText, animation } = config[level];

  return (
    <Alert className={cn(bgColor, borderColor, animation, "transition-all duration-300 hover:shadow-md")}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5", iconColor)} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTitle className={cn("text-base font-semibold", textColor)}>
              {title}
            </AlertTitle>
            <Badge variant={badgeVariant} className="text-xs">
              {badgeText}
            </Badge>
          </div>
          <AlertDescription className={cn("text-sm", textColor)}>
            {description}
          </AlertDescription>
          {timestamp && (
            <p className={cn("text-xs mt-2 opacity-70", textColor)}>
              {timestamp}
            </p>
          )}
        </div>
      </div>
    </Alert>
  );
};