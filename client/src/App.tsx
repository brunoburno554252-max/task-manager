import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Collaborators from "./pages/Collaborators";
import CollaboratorKanban from "./pages/CollaboratorKanban";
import Ranking from "./pages/Ranking";
import Badges from "./pages/Badges";
import ActivityPage from "./pages/ActivityPage";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/kanban"} component={Collaborators} />
        <Route path={"/kanban/:userId"} component={CollaboratorKanban} />
        <Route path={"/ranking"} component={Ranking} />
        <Route path={"/badges"} component={Badges} />
        <Route path={"/activity"} component={ActivityPage} />
        <Route path={"/chat"} component={Chat} />
        <Route path={"/profile"} component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" theme="dark" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
