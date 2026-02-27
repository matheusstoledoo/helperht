import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export const NewBadge = ({ className, size = "sm" }: NewBadgeProps) => {
  return (
    <Badge 
      className={cn(
        "bg-gradient-to-r from-accent to-primary text-white",
        "animate-pulse shadow-lg",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        className
      )}
    >
      <Sparkles className={cn(size === "sm" ? "w-3 h-3" : "w-4 h-4", "mr-1")} />
      NOVO
    </Badge>
  );
};