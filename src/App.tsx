import React from "react";
import { useQuery } from "convex/react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { VisibilityWrapper } from "./components/VisibilityWrapper";
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
import { ProcurementLinksPage } from "./pages/ProcurementLinksPage";
import { HROverviewPage } from "./pages/HROverviewPage";
import { SemanticSearchPage } from "./pages/SemanticSearchPage";
import { EmbeddingManagementPage } from "./pages/EmbeddingManagementPage";
import TempChatPage from "./pages/TempChatPage";
import { useAuth } from "@clerk/clerk-react";
import { ThemeProvider } from "./lib/ThemeContext";
import { LinksLegend } from "./components/LinksLegend";
import { PublicNavigation } from "./components/PublicNavigation";
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
  const location = useLocation().pathname;
  
  // Check if procurement-links requires auth - MUST call all hooks before any conditional returns
  const procurementLinksRequiresAuth = useQuery(
    api.hrDashboardComponents.getComponentAuthRequirement,
    { componentId: "procurement-links" }
  );
  
  // Check if government-links requires auth - MUST call all hooks before any conditional returns
  const governmentLinksRequiresAuth = useQuery(
    api.hrDashboardComponents.getComponentAuthRequirement,
    { componentId: "government-links" }
  );
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-tron-bg-deep flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
      </div>
    );
  }

  // Allow public access to government-links page if it doesn't require auth
  if (location === "/government-links" && !isSignedIn) {
    // Default to allowing public access (government-links should be public by default)
    // Only require auth if explicitly set to true
    if (governmentLinksRequiresAuth === true) {
      // Auth is required, fall through to sign-in
    } else {
      // Auth is not required (false or undefined), show public page
      return <PublicGovernmentLinksPage />;
    }
  }

  // Always show ProcurementLinksPage for "/" and "/procurement-links" routes, even if unauthenticated
  if ((location === "/" || location === "/procurement-links") && !isSignedIn) {
    if (procurementLinksRequiresAuth === undefined) {
      // Still loading, show loading state
      return (
        <div className="min-h-screen bg-tron-bg-deep flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tron-cyan"></div>
        </div>
      );
    }
    // Always show ProcurementLinksPage for these routes, regardless of auth requirement
    return <PublicProcurementLinksPage />;
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
        {/* ProcurementLinks is the homepage */}
        <Route
          path="/"
          element={
            <VisibilityWrapper componentId="procurement-links">
              <ProcurementLinksPage />
            </VisibilityWrapper>
          }
        />
        {/* All components at the same level with visibility checks */}
        <Route
          path="/procurement-links"
          element={
            <VisibilityWrapper componentId="procurement-links">
              <ProcurementLinksPage />
            </VisibilityWrapper>
          }
        />
        <Route
          path="/hr-overview"
          element={
            <VisibilityWrapper componentId="overview">
              <HROverviewPage />
            </VisibilityWrapper>
          }
        />
        <Route
          path="/semantic-search"
          element={
            <VisibilityWrapper componentId="search">
              <SemanticSearchPage />
            </VisibilityWrapper>
          }
        />
        <Route
          path="/leads-management"
          element={
            <VisibilityWrapper componentId="leads-management">
              <LeadsManagementPage />
            </VisibilityWrapper>
          }
        />
        <Route
          path="/kfc-management"
          element={
            <VisibilityWrapper componentId="kfc-management">
              <KfcManagementPage />
            </VisibilityWrapper>
          }
        />
        <Route
          path="/data-management"
          element={
            <VisibilityWrapper componentId="data-management">
              <DataManagementPage />
            </VisibilityWrapper>
          }
        />
        <Route
          path="/embedding-management"
          element={
            <VisibilityWrapper componentId="embeddings">
              <EmbeddingManagementPage />
            </VisibilityWrapper>
          }
        />
        {/* Legacy HR Dashboard route - redirects to first visible component */}
        <Route path="/hr-dashboard" element={<Navigate to="/" replace />} />
        {/* Other routes that don't need visibility checks */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/test-job" element={<div>Test Job Route Works!</div>} />
        <Route path="/job/:jobId" element={<JobDetailsPage />} />
        <Route path="/resume/:resumeId" element={<ResumeDetailsPage />} />
        <Route path="/job-postings" element={<JobPostingsPage />} />
        <Route path="/resumes" element={<ResumesPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/cobecium" element={<CobeciumPage />} />
        <Route path="/theme-config" element={<ThemeConfigPage />} />
        <Route path="/admin-panel" element={<AdminPanelPage />} />
        <Route
          path="/government-links"
          element={
            <VisibilityWrapper componentId="government-links">
              <GovernmentLinkHubPage />
            </VisibilityWrapper>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function UnauthenticatedApp() {
  const location = useLocation().pathname;
  
  // For routes other than "/" and "/procurement-links", show sign-in page
  if (location !== "/" && location !== "/procurement-links") {
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
  
  // For "/" and "/procurement-links", show ProcurementLinksPage with sign-in option
  return (
    <div className="h-screen bg-tron-bg-deep flex flex-col">
      {/* Simple header for public access */}
      <header className="bg-tron-bg-panel border-b border-tron-cyan/20 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-6">
        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6">
          <h1 className="text-lg sm:text-xl font-bold text-tron-white">Cobecium</h1>
          <PublicNavigation />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/sign-in"
            className="px-3 sm:px-4 py-2 bg-tron-cyan/10 border border-tron-cyan/30 rounded-lg text-tron-cyan hover:bg-tron-cyan/20 transition-colors text-xs sm:text-sm whitespace-nowrap"
          >
            <span className="hidden sm:inline">Sign In for Full Access</span>
            <span className="sm:hidden">Sign In</span>
          </Link>
        </div>
      </header>
      {/* Render the ProcurementLinksPage */}
      <div className="flex-1 overflow-auto">
        <ProcurementLinksPage />
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
      <header className="bg-tron-bg-panel border-b border-tron-cyan/20 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-6">
        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6">
          <h1 className="text-lg sm:text-xl font-bold text-tron-white">Cobecium</h1>
          <PublicNavigation />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <LinksLegend links={allLinks} />
          </div>
          <Link
            to="/sign-in"
            className="px-3 sm:px-4 py-2 bg-tron-cyan/10 border border-tron-cyan/30 rounded-lg text-tron-cyan hover:bg-tron-cyan/20 transition-colors text-xs sm:text-sm whitespace-nowrap text-center"
          >
            <span className="hidden sm:inline">Sign In for Full Access</span>
            <span className="sm:hidden">Sign In</span>
          </Link>
        </div>
      </header>
      {/* Render the page in read-only mode (isAdmin will be false) */}
      <div className="flex-1 overflow-auto">
        <GovernmentLinkHubPage isPublic={true} />
      </div>
    </div>
  );
}

// Public version of Procurement Links page (no authentication required)
function PublicProcurementLinksPage() {
  return (
    <div className="h-screen bg-tron-bg-deep flex flex-col">
      {/* Simple header for public access */}
      <header className="bg-tron-bg-panel border-b border-tron-cyan/20 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-6">
        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6">
          <h1 className="text-lg sm:text-xl font-bold text-tron-white">Cobecium</h1>
          <PublicNavigation />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/sign-in"
            className="px-3 sm:px-4 py-2 bg-tron-cyan/10 border border-tron-cyan/30 rounded-lg text-tron-cyan hover:bg-tron-cyan/20 transition-colors text-xs sm:text-sm whitespace-nowrap"
          >
            <span className="hidden sm:inline">Sign In for Full Access</span>
            <span className="sm:hidden">Sign In</span>
          </Link>
        </div>
      </header>
      {/* Render the page in public mode */}
      <div className="flex-1 overflow-auto">
        <ProcurementLinksPage />
      </div>
    </div>
  );
}
