import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "active" | "pending" | "completed" | "discontinued" | "resolved" | "under_observation";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

export const StatusIndicator = ({ 
  status, 
  size = "md", 
  showLabel = true,
  animate = false 
}: StatusIndicatorProps) => {
  const config = {
    active: {
      color: "bg-green-500",
      label: "Ativo",
      textColor: "text-green-700 dark:text-green-400"
    },
    pending: {
      color: "bg-yellow-500",
      label: "Pendente",
      textColor: "text-yellow-700 dark:text-yellow-400"
    },
    completed: {
      color: "bg-blue-500",
      label: "Concluído",
      textColor: "text-blue-700 dark:text-blue-400"
    },
    discontinued: {
      color: "bg-red-500",
      label: "Descontinuado",
      textColor: "text-red-700 dark:text-red-400"
    },
    resolved: {
      color: "bg-blue-500",
      label: "Resolvido",
      textColor: "text-blue-700 dark:text-blue-400"
    },
    under_observation: {
      color: "bg-orange-500",
      label: "Em Observação",
      textColor: "text-orange-700 dark:text-orange-400"
    }
  };

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const { color, label, textColor } = config[status];

  return (
    <div className="flex items-center gap-2">
      <div 
        className={cn(
          "rounded-full shadow-sm",
          color,
          sizeClasses[size],
          animate && "animate-pulse"
        )}
      />
      {showLabel && (
        <span className={cn("text-sm font-medium", textColor)}>
          {label}
        </span>
      )}
    </div>
  );
};