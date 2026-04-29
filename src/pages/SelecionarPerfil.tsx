import { useNavigate } from "react-router-dom";

export default function SelecionarPerfil() {
  const navigate = useNavigate();

  const escolher = (perfil: 'patient' | 'professional') => {
    localStorage.setItem('helperht_active_profile', perfil);
    navigate(perfil === 'patient' ? '/pac/dashboard' : '/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Como você quer entrar?</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta tem acesso a dois perfis
          </p>
        </div>

        <button
          type="button"
          onClick={() => escolher('professional')}
          className="w-full p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left space-y-1"
        >
          <div className="text-3xl">👩‍⚕️</div>
          <div className="font-semibold text-foreground">Profissional de Saúde</div>
          <div className="text-sm text-muted-foreground">
            Acesse seus pacientes e ferramentas clínicas
          </div>
        </button>

        <button
          type="button"
          onClick={() => escolher('patient')}
          className="w-full p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left space-y-1"
        >
          <div className="text-3xl">🧑</div>
          <div className="font-semibold text-foreground">Paciente</div>
          <div className="text-sm text-muted-foreground">
            Acesse seus dados de saúde e treinos
          </div>
        </button>
      </div>
    </div>
  );
}
