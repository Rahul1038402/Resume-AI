import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import ScrollToTop from "@/components/ScrollToTop";
import Loader from '@/components/common/Loader';
import { Analytics } from '@vercel/analytics/react';

// Lazy load all route components
const Index = lazy(() => import("./LandingPage/index"));
const Analyzer = lazy(() => import("./ResumeAnalyzer/index"));
const About = lazy(() => import("./AboutUs/index"));
const NotFound = lazy(() => import("./NotFound/index"));
const JobTracker = lazy(() => import("./JobTracker/index"));
{/*const ATSComparisonPage = lazy(() => import("./ATSComp/index"));*/}
const ResumeBuilder = lazy(() => import("./ResumeBuilder/index"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/analyzer" element={<Analyzer />} />
                <Route path="/about" element={<About />} />
                <Route path="/builder" element={<ResumeBuilder />} />
                <Route path="/tracker" element={<JobTracker />} />
                {/*<Route path="/ats" element={<ATSComparisonPage />} /> */}
                {/* Any other route except all above are redirected here */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Analytics />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;