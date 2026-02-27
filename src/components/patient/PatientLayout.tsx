import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  LogOut,
} from "lucide-react";

interface PatientLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showHeader?: boolean;
  breadcrumb?: ReactNode;
}

const PatientLayout = ({ children, title, subtitle, showHeader = false, breadcrumb }: PatientLayoutProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();
      if (data) {
        setUserName(data.name);
      }
    };
    fetchUserName();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      {showHeader && (
        <header className="border-b bg-card px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                {userName || "Paciente"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Portal do Paciente</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigate("/pac/config")}
                title="Configurações"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowLogoutDialog(true)}
                className="hidden sm:flex"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowLogoutDialog(true)}
                className="sm:hidden"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="px-4 sm:px-6 py-3 border-b bg-muted/30">
          {breadcrumb}
        </div>
      )}

      {/* Page Title Section */}
      {title && (
        <div className="border-b bg-card/50 px-4 sm:px-6 py-3 sm:py-4">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
            <AlertDialogDescription>
              Você realmente deseja sair da sua conta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientLayout;