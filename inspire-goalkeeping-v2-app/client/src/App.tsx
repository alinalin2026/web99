import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SiteLayout from "./components/SiteLayout";
import Home from "./pages/Home";
import Coaching from "./pages/Coaching";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

// This site is deployed under the /inspire-goalkeeping-v2/ subpath (see vite.config.ts
// "base"), so wouter needs the same prefix or every route but "/" 404s in production.
const BASE_PATH = "/inspire-goalkeeping-v2";

function Router() {
  return (
    <WouterRouter base={BASE_PATH}>
      <SiteLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/coaching" component={Coaching} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </SiteLayout>
    </WouterRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
