import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "patient" | "professional" | "admin";

interface UseUserRoleReturn {
  role: UserRole | null;
  loading: boolean;
  isPatient: boolean;
  isProfessional: boolean;
  isAdmin: boolean;
  canEdit: boolean;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { role, roleLoading } = useAuth();

  return {
    role: role as UserRole | null,
    loading: roleLoading,
    isPatient: role === 'patient',
    isProfessional: role === 'professional',
    isAdmin: role === 'admin',
    canEdit: role === 'professional' || role === 'admin',
  };
};
