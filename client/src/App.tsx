import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PublicSite } from "./portfolio/PublicSite";

const AdminApp = lazy(() => import("./admin/AdminApp"));

function AdminRoute() {
  return (
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster richColors position="top-right" />
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">A carregar o painel…</div>
          }
        >
          <AdminApp />
        </Suspense>
      </TooltipProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/admin" component={AdminRoute} />
        <Route path="/admin/*?" component={AdminRoute} />
        <Route component={PublicSite} />
      </Switch>
    </ErrorBoundary>
  );
}

export default App;
