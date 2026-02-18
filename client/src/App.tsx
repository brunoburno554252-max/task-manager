import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { lazy, Suspense } from "react";

// Lazy-loaded pages for better initial load performance
const Home = lazy(() => import("./pages/Home"));
const Collaborators = lazy(() => import("./pages/Collaborators"));
const CollaboratorKanban = lazy(() => import("./pages/CollaboratorKanban"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Badges = lazy(() => import("./pages/Badges"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const Profile = lazy(() => import("./pages/Profile"));
const Chat = lazy(() => import("./pages/Chat"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const Cadastros = lazy(() => import("./pages/Cadastros"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path={"/"} component={Home} />
          <Route path={"/kanban"} component={Collaborators} />
          <Route path={"/collaborators"} component={Cadastros} />
          <Route path={"/kanban/:userId"} component={CollaboratorKanban} />
          <Route path={"/ranking"} component={Ranking} />
          <Route path={"/badges"} component={Badges} />
          <Route path={"/activity"} component={ActivityPage} />
          <Route path={"/chat"} component={Chat} />
          <Route path={"/profile"} component={Profile} />
          <Route path={"/settings"} component={AdminSettings} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
