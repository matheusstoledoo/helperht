import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/hooks/useUserRole";
import { Shield, User, Stethoscope } from "lucide-react";

interface RoleBadgeProps {
  role: UserRole | null;
  showIcon?: boolean;
}

export const RoleBadge = ({ role, showIcon = true }: RoleBadgeProps) => {
  if (!role) return null;

  const roleConfig = {
    patient: {
      label: "Patient",
      icon: User,
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    professional: {
      label: "Health Professional",
      icon: Stethoscope,
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    admin: {
      label: "Administrator",
      icon: Shield,
      className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
  };

  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
};
