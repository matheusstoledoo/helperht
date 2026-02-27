import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FocusItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  priority: "high" | "medium" | "low";
  dueDate?: string;
}

interface CurrentFocusSectionProps {
  items: FocusItem[];
}

export const CurrentFocusSection = ({ items }: CurrentFocusSectionProps) => {
  const priorityConfig = {
    high: {
      color: "bg-red-500",
      label: "Prioridade Alta",
      textColor: "text-red-700 dark:text-red-400"
    },
    medium: {
      color: "bg-yellow-500",
      label: "Importante",
      textColor: "text-yellow-700 dark:text-yellow-400"
    },
    low: {
      color: "bg-blue-500",
      label: "Quando Puder",
      textColor: "text-blue-700 dark:text-blue-400"
    }
  };

  return (
    <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-accent/10">
            <Target className="w-6 h-6 text-accent" />
          </div>
          <div>
            <CardTitle className="text-2xl">Seu Foco Atual</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              O que é mais importante para você agora
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">Tudo em dia!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Você não tem nenhuma ação pendente no momento
            </p>
          </div>
        ) : (
          items.map((item) => {
            const config = priorityConfig[item.priority];
            const isComplete = item.progress >= 100;
            
            return (
              <div
                key={item.id}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-300",
                  "hover:shadow-md hover:scale-[1.02]",
                  isComplete 
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" 
                    : "bg-card border-border"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={cn(
                        "font-semibold",
                        isComplete ? "text-green-700 dark:text-green-400 line-through" : "text-foreground"
                      )}>
                        {item.title}
                      </h3>
                      {isComplete && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  {!isComplete && (
                    <Badge className={cn("ml-2", config.color, "text-white")}>
                      {config.label}
                    </Badge>
                  )}
                </div>

                {!isComplete && (
                  <>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Seu progresso</span>
                        <span className={cn("font-semibold", config.textColor)}>
                          {item.progress}%
                        </span>
                      </div>
                      <Progress 
                        value={item.progress} 
                        className="h-2.5"
                      />
                    </div>

                    {item.dueDate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Recomendado até {item.dueDate}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};