import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "diagnosis" | "treatment" | "exam" | "note";
  disabled?: boolean;
}

export const QuickActionButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = "diagnosis",
  disabled = false 
}: QuickActionButtonProps) => {
  const variantStyles = {
    diagnosis: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30",
    treatment: "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30",
    exam: "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30",
    note: "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/30",
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:scale-105 active:scale-95",
        "hover:-translate-y-1",
        variantStyles[variant]
      )}
      size="lg"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      <Icon className="w-5 h-5 mr-2" />
      <span className="font-semibold">{label}</span>
    </Button>
  );
};