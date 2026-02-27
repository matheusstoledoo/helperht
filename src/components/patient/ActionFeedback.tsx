import { CheckCircle, Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ActionFeedbackProps {
  type: "success" | "info" | "reminder";
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const ActionFeedback = ({ type, title, message, action }: ActionFeedbackProps) => {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      iconColor: "text-green-600",
      textColor: "text-green-900 dark:text-green-200"
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      iconColor: "text-blue-600",
      textColor: "text-blue-900 dark:text-blue-200"
    },
    reminder: {
      icon: AlertCircle,
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      iconColor: "text-yellow-600",
      textColor: "text-yellow-900 dark:text-yellow-200"
    }
  };

  const { icon: Icon, bgColor, borderColor, iconColor, textColor } = config[type];

  return (
    <Alert className={cn(bgColor, borderColor, "animate-fade-in")}>
      <Icon className={cn("h-5 w-5", iconColor)} />
      <AlertTitle className={cn("text-base font-semibold", textColor)}>
        {title}
      </AlertTitle>
      <AlertDescription className={cn("text-sm mt-1", textColor)}>
        {message}
      </AlertDescription>
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "mt-3 text-sm font-medium underline",
            textColor,
            "hover:opacity-80 transition-opacity"
          )}
        >
          {action.label}
        </button>
      )}
    </Alert>
  );
};