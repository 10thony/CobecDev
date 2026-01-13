import type React from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Database,
  FileSearch,
  Globe,
  Map,
  Palette,
  Search,
  Settings,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { Hero } from "../components/Hero";

type Feature = {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  access: "Public" | "Signed-in" | "Admin";
  span?: "1x1" | "1x2" | "2x1" | "2x2" | "2x3" | "3x2";
};

export function DashboardPage() {
  const { isSignedIn } = useAuth();

  const coreFeatures: Feature[] = [
    {
      title: "Procurement Links",
      description:
        "Find and verify procurement opportunities faster. Automate discovery and validation workflows.",
      to: "/procurement-links",
      icon: <Globe className="w-6 h-6" strokeWidth={1.5} />,
      access: "Public",
      span: "2x2",
    },
    {
      title: "Government Links",
      description: "Browse procurement links organized by state. Quick access to opportunities.",
      to: "/government-links",
      icon: <Map className="w-6 h-6" strokeWidth={1.5} />,
      access: "Public",
      span: "1x1",
    },
    {
      title: "Leads Management",
      description: "Track procurement leads that matter. Keep opportunities organized.",
      to: "/leads-management",
      icon: <FileSearch className="w-6 h-6" strokeWidth={1.5} />,
      access: "Signed-in",
      span: "1x1",
    },
  ];

  const hrAndSearchFeatures: Feature[] = [
    {
      title: "HR Overview",
      description: "Match jobs with resumes. Get insights that help you hire better.",
      to: "/hr-overview",
      icon: <Target className="w-6 h-6" strokeWidth={1.5} />,
      access: "Signed-in",
      span: "1x1",
    },
    {
      title: "Semantic Search",
      description: "Search across jobs and resumes using natural language. Find what you need faster.",
      to: "/semantic-search",
      icon: <Search className="w-6 h-6" strokeWidth={1.5} />,
      access: "Signed-in",
      span: "2x1",
    },
    {
      title: "Resume & Data Management",
      description: "Import, export, and organize job postings and resumes. Keep your data clean.",
      to: "/data-management",
      icon: <Database className="w-6 h-6" strokeWidth={1.5} />,
      access: "Signed-in",
      span: "1x1",
    },
    {
      title: "KFC Management",
      description:
        "Employee recognition that works. Handle nominations, points, and approvals.",
      to: "/kfc-management",
      icon: <Users className="w-6 h-6" strokeWidth={1.5} />,
      access: "Signed-in",
      span: "1x1",
    },
  ];

  const adminAndConfigFeatures: Feature[] = [
    {
      title: "Embedding Management",
      description:
        "Optimize search performance. Manage embedding pipelines and system workflows.",
      to: "/embedding-management",
      icon: <Settings className="w-6 h-6" strokeWidth={1.5} />,
      access: "Admin",
      span: "1x1",
    },
    {
      title: "Admin Panel",
      description: "Control what users see. Configure visibility and platform settings.",
      to: "/admin-panel",
      icon: <Shield className="w-6 h-6" strokeWidth={1.5} />,
      access: "Admin",
      span: "1x1",
    },
    {
      title: "Theme Config",
      description: "Customize colors and UI preferences. Make it yours.",
      to: "/theme-config",
      icon: <Palette className="w-6 h-6" strokeWidth={1.5} />,
      access: "Signed-in",
      span: "1x1",
    },
  ];

  // Combine all features for the book animation
  const allFeatures = [
    ...coreFeatures,
    ...hrAndSearchFeatures,
    ...adminAndConfigFeatures,
  ];

  return (
    <div className="min-h-full bg-tron-bg-deep">
      {/* Hero Section */}
      <Hero
        title="Cobecium"
        subtitle="Everything you need to find opportunities and manage workflows. Built for speed."
        ctaText={isSignedIn ? "Explore Features" : "Get Started"}
        ctaHref={isSignedIn ? "/procurement-links" : "/sign-in"}
        features={allFeatures}
      />
    </div>
  );
}
