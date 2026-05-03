import { useState, useEffect, useRef } from "react";
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
  const fetchingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUserRole = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (!user) {
          setRole(null);
          return;
        }

        const { data: roleRows } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .limit(5);

        if (!isMounted) return;

        if (roleRows && roleRows.length > 0) {
          const isAdminRole = roleRows.some((r: any) => r.role === 'admin');
          const isProfRole = roleRows.some((r: any) => r.role === 'professional' || r.role === 'admin');
          const resolvedRole = isAdminRole ? 'admin' : isProfRole ? 'professional' : 'patient';
          console.log('[UserRole] role from user_roles:', resolvedRole);
          setRole(resolvedRole as UserRole);
          return;
        }

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
        fetchingRef.current = false;
        if (isMounted) setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchUserRole();
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
