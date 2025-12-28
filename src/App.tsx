import React from "react";
import { useQuery } from "convex/react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ThemeConfigPage } from "./pages/ThemeConfigPage";
import { DataManagementPage } from "./pages/DataManagementPage";
import { JobDetailsPage } from "./pages/JobDetailsPage";
import { ResumeDetailsPage } from "./pages/ResumeDetailsPage";
import { KfcManagementPage } from "./pages/KfcManagementPage";
import { HRDashboardPage } from "./pages/HRDashboardPage";
import { LeadsManagementPage } from "./pages/LeadsManagementPage";
import { JobPostingsPage } from "./pages/JobPostingsPage";
import { ResumesPage } from "./pages/ResumesPage";
import { QuestionsPage } from "./pages/QuestionsPage";
import { CobeciumPage } from "./pages/CobeciumPage";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { GovernmentLinkHubPage } from "./pages/GovernmentLinkHubPage";
import TempChatPage from "./pages/TempChatPage";
import { useAuth } from "@clerk/clerk-react";
import { ThemeProvider } from "./lib/ThemeContext";
import { LinksLegend } from "./components/LinksLegend";
// Global data service removed - using Convex real-time queries instead

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-tron-bg-deep">
          <Routes>
            <Route path="/temp-chat" element={<TempChatPage />} />
            <Route path="/*" element={<AppContent />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const location = window.location.pathname;
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-tron-bg-deep flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
      </div>
    );
  }

  // Allow public access to government-links page (read-only for unauthenticated users)
  if (location === "/government-links" && !isSignedIn) {
    return <PublicGovernmentLinksPage />;
  }

  if (!isSignedIn) {
    return <UnauthenticatedApp />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const userRole = useQuery(api.userRoles.getCurrentUserRole);
  
  // Global data is now handled by Convex real-time queries in individual components
  
  if (userRole === undefined) {
    return (
      <div className="min-h-screen bg-tron-bg-deep flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HRDashboardPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/hr-dashboard" element={<HRDashboardPage />} />
        <Route path="/test-job" element={<div>Test Job Route Works!</div>} />
        <Route path="/job/:jobId" element={<JobDetailsPage />} />
        <Route path="/resume/:resumeId" element={<ResumeDetailsPage />} />
        <Route path="/job-postings" element={<JobPostingsPage />} />
        <Route path="/resumes" element={<ResumesPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/cobecium" element={<CobeciumPage />} />
        <Route path="/theme-config" element={<ThemeConfigPage />} />
        <Route path="/data-management" element={<DataManagementPage />} />
        <Route path="/kfc-management" element={<KfcManagementPage />} />
        <Route path="/leads-management" element={<LeadsManagementPage />} />
        <Route path="/admin-panel" element={<AdminPanelPage />} />
        <Route path="/government-links" element={<GovernmentLinkHubPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function UnauthenticatedApp() {
  return (
    <div className="min-h-screen bg-tron-bg-deep tron-grid-bg flex items-center justify-center p-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-tron-white mb-4 tron-glow-text">Cobecium</h1>
          <p className="text-xl text-tron-gray">Sign in to start chatting with AI</p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}

// Public read-only version of Government Links page (no authentication required)
function PublicGovernmentLinksPage() {
  // Get all active links for the legend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLinks = useQuery((api.links as any).getAllActiveLinks);

  return (
    <div className="h-screen bg-tron-bg-deep flex flex-col">
      {/* Simple header for public access */}
      <header className="bg-tron-bg-panel border-b border-tron-cyan/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-tron-white">Cobecium</h1>
          <span className="text-tron-gray">|</span>
          <span className="text-tron-cyan">Government Link Hub</span>
        </div>
        <div className="flex items-center gap-3">
          <LinksLegend links={allLinks} />
          <a
            href="/"
            className="px-4 py-2 bg-tron-cyan/10 border border-tron-cyan/30 rounded-lg text-tron-cyan hover:bg-tron-cyan/20 transition-colors text-sm"
          >
            Sign In for Full Access
          </a>
        </div>
      </header>
      {/* Render the page in read-only mode (isAdmin will be false) */}
      <div className="flex-1 overflow-auto">
        <GovernmentLinkHubPage isPublic={true} />
      </div>
    </div>
  );
}
