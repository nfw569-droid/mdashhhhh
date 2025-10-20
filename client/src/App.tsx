import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const base = (import.meta as any).env?.BASE_URL || "/";

  return (
    <WouterRouter base={base}>
      <Switch>
        <Route path="/" component={Dashboard} />
        {/* Allow direct /dashboard links to render the same Dashboard component */}
        <Route path="/dashboard" component={Dashboard} />
        {/* Also accept nested dashboard routes like /dashboard/anything */}
        <Route path="/dashboard/:rest*" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
