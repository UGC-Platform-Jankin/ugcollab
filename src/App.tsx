import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import BrandAuth from "./pages/BrandAuth.tsx";
import NotFound from "./pages/NotFound.tsx";
import DashboardLayout from "./components/dashboard/DashboardLayout.tsx";
import BrandLayout from "./components/brand/BrandLayout.tsx";
import Gigs from "./pages/dashboard/Gigs.tsx";
import Profile from "./pages/dashboard/Profile.tsx";
import ProfileSetup from "./pages/dashboard/ProfileSetup.tsx";
import Messages from "./components/dashboard/Messages.tsx";
import BrandSetup from "./pages/brand/BrandSetup.tsx";
import BrandDashboard from "./pages/brand/BrandDashboard.tsx";
import CreateCampaign from "./pages/brand/CreateCampaign.tsx";
import BrandProfileContent from "./pages/brand/BrandProfile.tsx";
import BrandCampaigns from "./pages/brand/BrandCampaigns.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout><Gigs /></DashboardLayout>} />
            <Route path="/dashboard/messages" element={<DashboardLayout><Messages /></DashboardLayout>} />
            <Route path="/dashboard/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
            <Route path="/dashboard/setup" element={<ProfileSetup />} />
            <Route path="/brand/auth" element={<BrandAuth />} />
            <Route path="/brand/setup" element={<BrandSetup />} />
            <Route path="/brand/dashboard" element={<BrandDashboard />} />
            <Route path="/brand/campaigns" element={<BrandLayout><BrandCampaigns /></BrandLayout>} />
            <Route path="/brand/campaigns/new" element={<CreateCampaign />} />
            <Route path="/brand/messages" element={<BrandLayout><Messages /></BrandLayout>} />
            <Route path="/brand/profile" element={<BrandLayout><BrandProfileContent /></BrandLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
