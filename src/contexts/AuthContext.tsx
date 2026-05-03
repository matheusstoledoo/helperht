import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'patient' | 'professional' | 'admin' | null;
  roleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role: 'patient' | 'professional', cpf: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  getActiveRole: (userId?: string) => Promise<'patient' | 'professional' | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'patient' | 'professional' | 'admin' | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    setRoleLoading(true);
    try {
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(5);

      if (roleRows && roleRows.length > 0) {
        const isAdmin = roleRows.some((r: any) => r.role === 'admin');
        const isProfessional = roleRows.some((r: any) => r.role === 'professional' || r.role === 'admin');
        setRole(isAdmin ? 'admin' : isProfessional ? 'professional' : 'patient');
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      setRole((data?.role as any) ?? null);
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          fetchRole(session.user.id);
        } else {
          setRole(null);
          setRoleLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err: any) {
      console.error('[SignIn] Network/unexpected error:', err);
      return { error: { message: err?.message || 'Falha de conexão. Verifique sua internet.' } };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'patient' | 'professional', cpf: string) => {
    const redirectUrl = role === 'patient' 
      ? `${window.location.origin}/pac/dashboard`
      : `${window.location.origin}/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role,
          cpf,
        }
      }
    });

    console.log('[SignUp] Auth result:', { userId: data?.user?.id, error });

    if (!error && data.user) {
      const { error: bootstrapError } = await supabase.rpc('bootstrap_user_profile', {
        _name: name,
        _cpf: cpf,
        _role: role
      });
      
      if (bootstrapError) {
        console.error('[SignUp] Error bootstrapping profile:', bootstrapError);
        const { error: directInsertError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            name,
            email,
            role: role as any,
            cpf,
          });
        if (directInsertError) {
          console.error('[SignUp] Fallback insert also failed:', directInsertError);
        } else {
          console.log('[SignUp] Fallback insert succeeded');
        }
      } else {
        console.log('[SignUp] Bootstrap succeeded for user:', data.user.id);
      }
    }

    return { error, role } as any;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const getActiveRole = async (userId?: string): Promise<'patient' | 'professional' | null> => {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      uid = user.id;
    }

    const { data: rows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid)
      .limit(5);

    if (rows && rows.length > 0) {
      const isProfessional = rows.some((r: any) => r.role === 'professional');
      return isProfessional ? 'professional' : 'patient';
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', uid)
      .maybeSingle();

    return (userRow?.role as 'patient' | 'professional') ?? null;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, roleLoading, signIn, signUp, signOut, getActiveRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
