import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, ThemeApplier } from "@/contexts/ThemeContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import BrandAuth from "./pages/BrandAuth.tsx";
import GetStarted from "./pages/GetStarted.tsx";
import NotFound from "./pages/NotFound.tsx";
import DashboardLayout from "./components/dashboard/DashboardLayout.tsx";
import BrandLayout from "./components/brand/BrandLayout.tsx";
import CreatorOverview from "./pages/dashboard/CreatorOverview.tsx";
import Gigs from "./pages/dashboard/Gigs.tsx";
import Profile from "./pages/dashboard/Profile.tsx";
import ProfileSetup from "./pages/dashboard/ProfileSetup.tsx";
import Messages from "./components/dashboard/Messages.tsx";
import VideoSubmissions from "./pages/dashboard/VideoSubmissions.tsx";
import PostedVideos from "./pages/dashboard/PostedVideos.tsx";
import CreatorGigDetail from "./pages/dashboard/CreatorGigDetail.tsx";
import BrandSetup from "./pages/brand/BrandSetup.tsx";
import BrandOverview from "./pages/brand/BrandOverview.tsx";
import CreateCampaign from "./pages/brand/CreateCampaign.tsx";
import BrandProfileContent from "./pages/brand/BrandProfile.tsx";
import BrandCampaigns from "./pages/brand/BrandCampaigns.tsx";
import BrandCampaignDetail from "./pages/brand/BrandCampaignDetail.tsx";
import FindCreators from "./pages/brand/FindCreators.tsx";
import VideoReview from "./pages/brand/VideoReview.tsx";
import BrandPostedVideos from "./pages/brand/BrandPostedVideos.tsx";
import BrandPublicProfile from "./pages/brand/BrandPublicProfile.tsx";
import ReviewsPage from "./pages/Reviews.tsx";
import AdminPanel from "./pages/dashboard/AdminPanel.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ThemeApplier />
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/dashboard" element={<DashboardLayout><CreatorOverview /></DashboardLayout>} />
              <Route path="/dashboard/gigs" element={<DashboardLayout><Gigs /></DashboardLayout>} />
              <Route path="/dashboard/messages" element={<DashboardLayout><Messages /></DashboardLayout>} />
              <Route path="/dashboard/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
              <Route path="/dashboard/admin" element={<DashboardLayout><AdminPanel /></DashboardLayout>} />
              <Route path="/dashboard/videos" element={<DashboardLayout><VideoSubmissions /></DashboardLayout>} />
              <Route path="/dashboard/posted-videos" element={<DashboardLayout><PostedVideos /></DashboardLayout>} />
              <Route path="/dashboard/gig/:campaignId" element={<DashboardLayout><CreatorGigDetail /></DashboardLayout>} />
              <Route path="/dashboard/gig/:campaignId/posted" element={<DashboardLayout><CreatorGigDetail /></DashboardLayout>} />
              <Route path="/dashboard/gig/:campaignId/schedule" element={<DashboardLayout><CreatorGigDetail /></DashboardLayout>} />
              <Route path="/dashboard/setup" element={<ProfileSetup />} />
              <Route path="/brand/auth" element={<BrandAuth />} />
              <Route path="/brand/setup" element={<BrandSetup />} />
              <Route path="/brand/dashboard" element={<BrandLayout><BrandOverview /></BrandLayout>} />
              <Route path="/brand/campaigns" element={<BrandLayout><BrandCampaigns /></BrandLayout>} />
              <Route path="/brand/campaigns/new" element={<CreateCampaign />} />
              <Route path="/brand/campaigns/:campaignId" element={<BrandLayout><BrandCampaignDetail /></BrandLayout>} />
              <Route path="/brand/campaigns/:campaignId/videos" element={<BrandLayout><BrandCampaignDetail /></BrandLayout>} />
              <Route path="/brand/campaigns/:campaignId/posted" element={<BrandLayout><BrandCampaignDetail /></BrandLayout>} />
              <Route path="/brand/campaigns/:campaignId/schedule" element={<BrandLayout><BrandCampaignDetail /></BrandLayout>} />
              <Route path="/brand/messages" element={<BrandLayout><Messages /></BrandLayout>} />
              <Route path="/brand/creators" element={<BrandLayout><FindCreators /></BrandLayout>} />
              <Route path="/brand/profile" element={<BrandLayout><BrandProfileContent /></BrandLayout>} />
              <Route path="/brand/video-review" element={<BrandLayout><VideoReview /></BrandLayout>} />
              <Route path="/brand/posted-videos" element={<BrandLayout><BrandPostedVideos /></BrandLayout>} />
              <Route path="/brand/public/:brandUserId" element={<BrandPublicProfile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
