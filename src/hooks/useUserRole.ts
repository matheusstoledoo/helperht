import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let currentUserId: string | null = null;

    const fetchUserRole = async (skipLoadingReset = false) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!isMounted) return;

        if (!user) {
          setRole(null);
          setLoading(false);
          currentUserId = null;
          return;
        }

        // Skip re-fetch if user hasn't changed and we already have a role
        if (skipLoadingReset && user.id === currentUserId && role !== null) {
          return;
        }

        currentUserId = user.id;

        const { data: roleRows } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(5);

        if (!isMounted) return;

        if (roleRows && roleRows.length > 0) {
          const isProfessional = roleRows.some((r: any) => r.role === 'professional' || r.role === 'admin');
          const resolvedRole = isProfessional
            ? (roleRows.find((r: any) => r.role === 'admin') ? 'admin' : 'professional')
            : 'patient';
          console.log('[UserRole] role from user_roles:', resolvedRole);
          setRole(resolvedRole as UserRole);
          return;
        }

        // Fallback: tabela users
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error || !data) {
          console.error('[UserRole] Error fetching role, defaulting to patient:', error);
          setRole('patient');
        } else {
          console.log('[UserRole] role from users table:', data?.role);
          setRole(data?.role as UserRole);
        }
      } catch (error) {
        console.error('[UserRole] Exception:', error);
        if (isMounted) setRole('patient');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserRole();

    // Listen for auth changes — only re-fetch on sign-in/sign-out, not token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchUserRole(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    role,
    loading,
    isPatient: role === 'patient',
    isProfessional: role === 'professional',
    isAdmin: role === 'admin',
    canEdit: role === 'professional' || role === 'admin',
  };
};
