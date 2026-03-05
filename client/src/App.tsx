import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import RoleSelection from "@/pages/Login";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Properties from "@/pages/Properties";
import Dashboard from "@/pages/Dashboard";
import NewProperty from "@/pages/NewProperty";
import PropertyDetail from "@/pages/PropertyDetail";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ThemeModePicker from "./components/ThemeModePicker";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={RoleSelection} />
      <Route path={"/auth"} component={Auth} />
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/dashboard/landlord"} component={Dashboard} />
      <Route path={"/dashboard/tenant"} component={Dashboard} />
      <Route path={"/properties"} component={Properties} />
      <Route path={"/properties/new"} component={NewProperty} />
      <Route path={"/property/:id"} component={PropertyDetail} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable={true}
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <ThemeModePicker />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
