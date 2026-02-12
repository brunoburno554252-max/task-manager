import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Tasks from "./pages/Tasks";
import Ranking from "./pages/Ranking";
import Badges from "./pages/Badges";
import Reports from "./pages/Reports";
import ActivityPage from "./pages/ActivityPage";
import Profile from "./pages/Profile";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/tasks"} component={Tasks} />
        <Route path={"/ranking"} component={Ranking} />
        <Route path={"/badges"} component={Badges} />
        <Route path={"/reports"} component={Reports} />
        <Route path={"/activity"} component={ActivityPage} />
        <Route path={"/profile"} component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
