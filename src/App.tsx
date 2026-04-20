import { lazy, Suspense } from "react"; // v2
import { Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FullPageLoading } from "@/components/ui/loading-spinner";

// Eager load landing + auth (first interaction)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Lazy load everything else
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewPatient = lazy(() => import("./pages/NewPatient"));
const ProfessionalPatientView = lazy(() => import("./pages/ProfessionalPatientView"));
const PatientTimeline = lazy(() => import("./pages/PatientTimeline"));
const PatientDiagnoses = lazy(() => import("./pages/PatientDiagnoses"));
const PatientTreatments = lazy(() => import("./pages/PatientTreatments"));
const PatientExams = lazy(() => import("./pages/PatientExams"));
const PatientDocuments = lazy(() => import("./pages/PatientDocuments"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const Consultation = lazy(() => import("./pages/Consultation"));
const ProfessionalSettings = lazy(() => import("./pages/ProfessionalSettings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProfessionals = lazy(() => import("./pages/AdminProfessionals"));
const AdminPatients = lazy(() => import("./pages/AdminPatients"));
const PatientDashboardMain = lazy(() => import("./pages/PatientDashboardMain"));
const PatientProfessionals = lazy(() => import("./pages/PatientProfessionals"));
const PatientProfessionalView = lazy(() => import("./pages/PatientProfessionalView"));
const PatientDiagnosesView = lazy(() => import("./pages/PatientDiagnosesView"));
const PatientTreatmentsView = lazy(() => import("./pages/PatientTreatmentsView"));
const PatientDocumentsView = lazy(() => import("./pages/PatientDocumentsView"));
const PatientSettings = lazy(() => import("./pages/PatientSettings"));
const PatientCareTrails = lazy(() => import("./pages/PatientCareTrails"));
const PatientLabCharts = lazy(() => import("./pages/PatientLabCharts"));
const ProfPatientNutrition = lazy(() => import("./pages/ProfPatientNutrition"));
const ProfPatientTraining = lazy(() => import("./pages/ProfPatientTraining"));
const ProfPatientHealthSummary = lazy(() => import("./pages/ProfPatientHealthSummary"));
const ProfPatientLabCharts = lazy(() => import("./pages/ProfPatientLabCharts"));
const ProfPatientVitals = lazy(() => import("./pages/ProfPatientVitals"));

const PatientNutrition = lazy(() => import("./pages/PatientNutrition"));
const PatientTraining = lazy(() => import("./pages/PatientTraining"));
const PatientAlerts = lazy(() => import("./pages/PatientAlerts"));
const PatientHealthSummary = lazy(() => import("./pages/PatientHealthSummary"));
const PatientGoalsInsights = lazy(() => import("./pages/PatientGoalsInsights"));
const PatientVitals = lazy(() => import("./pages/PatientVitals"));
// PatientTrailsView removed - trails are now professional-only
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<FullPageLoading />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/prof/pacientes/novo" element={<NewPatient />} />
              <Route path="/prof/paciente/:id/timeline" element={<PatientTimeline />} />
              <Route path="/prof/paciente/:id/diagnosticos" element={<PatientDiagnoses />} />
              <Route path="/prof/paciente/:id/tratamentos" element={<PatientTreatments />} />
              <Route path="/prof/paciente/:id/exames" element={<PatientExams />} />
              <Route path="/prof/paciente/:id/documentos" element={<PatientDocuments />} />
              <Route path="/prof/paciente/:id/nutricao" element={<ProfPatientNutrition />} />
              <Route path="/prof/paciente/:id/treinos" element={<ProfPatientTraining />} />
              <Route path="/prof/paciente/:id/resumo" element={<ProfPatientHealthSummary />} />
              <Route path="/prof/paciente/:id/graficos-exames" element={<ProfPatientLabCharts />} />
              <Route path="/prof/paciente/:id/sinais-vitais" element={<ProfPatientVitals />} />
              
              {/* /prof/paciente/:id/metas removed */}
              <Route path="/prof/paciente/:id/*" element={<ProfessionalPatientView />} />
              <Route path="/patient/:id" element={<PatientDetail />} />
              <Route path="/consultation" element={<Consultation />} />
              <Route path="/prof/config" element={<ProfessionalSettings />} />
              <Route path="/pac/dashboard" element={<PatientDashboardMain />} />
              <Route path="/pac/profissionais" element={<PatientProfessionals />} />
              <Route path="/pac/profissional/:id" element={<PatientProfessionalView />} />
              <Route path="/pac/profissional/:professionalId/diagnosticos" element={<PatientDiagnosesView />} />
              <Route path="/pac/profissional/:professionalId/tratamentos" element={<PatientTreatmentsView />} />
              <Route path="/pac/profissional/:professionalId/exames" element={<PatientDocumentsView />} />
              <Route path="/pac/diagnosticos" element={<PatientDiagnosesView />} />
              <Route path="/pac/tratamentos" element={<PatientTreatmentsView />} />
              <Route path="/pac/documentos" element={<PatientDocumentsView />} />
              <Route path="/pac/exames-lab" element={<PatientLabCharts />} />
              <Route path="/pac/nutricao" element={<PatientNutrition />} />
              <Route path="/pac/treinos" element={<PatientTraining />} />
              <Route path="/pac/alertas" element={<PatientAlerts />} />
              <Route path="/pac/resumo" element={<PatientHealthSummary />} />
              {/* /pac/mensagens archived */}
              <Route path="/pac/insights" element={<Navigate to="/pac/objetivos?tab=insights" replace />} />
              <Route path="/pac/objetivos" element={<PatientGoalsInsights />} />
              <Route path="/pac/config" element={<PatientSettings />} />
              <Route path="/pac/sinais-vitais" element={<PatientVitals />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/profissionais" element={<AdminProfessionals />} />
              <Route path="/admin/pacientes" element={<AdminPatients />} />
              <Route path="/prof/trilhas" element={<PatientCareTrails />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
