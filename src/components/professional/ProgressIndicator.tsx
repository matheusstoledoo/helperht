import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  label: string;
  value: number;
  max: number;
  variant?: "default" | "success" | "warning" | "danger";
  showPercentage?: boolean;
}

export const ProgressIndicator = ({ 
  label, 
  value, 
  max, 
  variant = "default",
  showPercentage = true 
}: ProgressIndicatorProps) => {
  const percentage = Math.round((value / max) * 100);
  
  const variantColors = {
    default: "text-primary",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600"
  };

  const progressColors = {
    default: "[&>div]:bg-primary",
    success: "[&>div]:bg-green-600",
    warning: "[&>div]:bg-yellow-600",
    danger: "[&>div]:bg-red-600"
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {showPercentage && (
          <span className={cn("font-semibold", variantColors[variant])}>
            {percentage}%
          </span>
        )}
      </div>
      <Progress 
        value={percentage} 
        className={cn("h-2 transition-all duration-500", progressColors[variant])}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{value}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};