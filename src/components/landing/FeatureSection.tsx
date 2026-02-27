import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FeatureSectionProps {
  icon: ReactNode;
  title: string;
  description: string;
  features: string[];
  reversed?: boolean;
  gradient?: string;
}

export function FeatureSection({
  icon,
  title,
  description,
  features,
  reversed = false,
  gradient = "from-accent/10 to-primary/10",
}: FeatureSectionProps) {
  return (
    <div className={cn(
      "flex flex-col lg:flex-row items-center gap-8 lg:gap-16",
      reversed && "lg:flex-row-reverse"
    )}>
      <div className={cn(
        "flex-1 p-8 lg:p-12 rounded-3xl bg-gradient-to-br",
        gradient
      )}>
        <div className="flex items-center justify-center h-48 lg:h-64">
          {icon}
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <h3 className="text-2xl lg:text-3xl font-bold text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground text-lg">
          {description}
        </p>
        <ul className="space-y-3 pt-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
              </span>
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
