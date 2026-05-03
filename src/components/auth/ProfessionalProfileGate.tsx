import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const ProfessionalProfileGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const checkedUserRef = useRef<string | null>(null);

  const allowList = ["/", "/auth", "/forgot-password", "/reset-password", "/completar-perfil"];

  useEffect(() => {
    if (loading) return;
    if (!user) {
      checkedUserRef.current = null;
      setChecked(true);
      return;
    }
    if (allowList.includes(location.pathname)) {
      setChecked(true);
      return;
    }
    // Only re-check DB if user changed (new login), not on every navigation
    if (checkedUserRef.current === user.id) {
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
      checkedUserRef.current = user.id;
      if (
        data?.role === "professional" &&
        (!data.specialty || data.specialty.trim() === "")
      ) {
        navigate("/completar-perfil", { replace: true });
      }
      setChecked(true);
    })();

    return () => { active = false; };
  }, [user, loading, location.pathname]);

  if (!checked) return null;
  return <>{children}</>;
};
