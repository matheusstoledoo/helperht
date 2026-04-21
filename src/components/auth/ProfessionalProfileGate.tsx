import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Verifica se o profissional logado já preencheu sua especialidade.
 * Caso contrário, redireciona para /completar-perfil.
 * Não bloqueia a navegação para usuários não autenticados ou pacientes.
 */
export const ProfessionalProfileGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const allowList = ["/", "/auth", "/forgot-password", "/reset-password", "/completar-perfil"];
    if (loading) return;
    if (!user) {
      setChecked(true);
      return;
    }
    if (allowList.includes(location.pathname)) {
      setChecked(true);
      return;
    }

    let active = true;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("role, specialty")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      if (
        data?.role === "professional" &&
        (!data.specialty || data.specialty.trim() === "")
      ) {
        navigate("/completar-perfil", { replace: true });
      }
      setChecked(true);
    })();

    return () => {
      active = false;
    };
  }, [user, loading, location.pathname, navigate]);

  if (!checked) return null;
  return <>{children}</>;
};
