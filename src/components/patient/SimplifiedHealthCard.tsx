import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimplifiedHealthCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  items: {
    id: string;
    name: string;
    detail?: string;
    explanation?: string;
    status?: string;
    isNew?: boolean;
  }[];
  emptyMessage?: string;
}

export const SimplifiedHealthCard = ({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  items,
  emptyMessage = "Nenhum item registrado"
}: SimplifiedHealthCardProps) => {
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "active":
        return { label: "Em andamento", variant: "default" as const };
      case "completed":
        return { label: "Concluído", variant: "secondary" as const };
      case "resolved":
        return { label: "Resolvido", variant: "secondary" as const };
      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const statusInfo = getStatusLabel(item.status);
              
              return (
                <div 
                  key={item.id}
                  className="pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground text-base">
                          {item.name}
                        </p>
                        {item.isNew && (
                          <Badge className="bg-gradient-to-r from-accent to-primary text-white text-xs px-2 py-0.5">
                            Novo
                          </Badge>
                        )}
                      </div>
                      {item.detail && (
                        <p className="text-sm text-muted-foreground">
                          {item.detail}
                        </p>
                      )}
                    </div>
                    {statusInfo && (
                      <Badge variant={statusInfo.variant} className="ml-2 text-xs">
                        {statusInfo.label}
                      </Badge>
                    )}
                  </div>

                  {item.explanation && (
                    <Alert className="mt-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-900 dark:text-blue-200">
                        {item.explanation}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};