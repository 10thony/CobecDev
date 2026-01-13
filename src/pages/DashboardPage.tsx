import type React from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
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

type FeatureAccess = "Public" | "Signed-in" | "Admin";

type Feature = {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  access: FeatureAccess;
};

function AccessBadge({ access }: { access: FeatureAccess }) {
  const styles: Record<FeatureAccess, string> = {
    Public: "bg-tron-cyan/10 text-tron-cyan border border-tron-cyan/30",
    "Signed-in": "bg-tron-blue/10 text-tron-blue border border-tron-blue/30",
    Admin: "bg-tron-orange/10 text-tron-orange border border-tron-orange/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] ${styles[access]}`}
    >
      {access}
    </span>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <Link
      to={feature.to}
      className="group block tron-card p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-tron-cyan/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-tron-cyan tron-icon-glow flex-shrink-0">
              {feature.icon}
            </div>
            <h3 className="text-base font-semibold text-tron-white truncate">
              {feature.title}
            </h3>
          </div>
          <p className="mt-2 text-sm text-tron-muted leading-relaxed">
            {feature.description}
          </p>
        </div>
        <AccessBadge access={feature.access} />
      </div>

      <div className="mt-4 text-xs text-tron-gray group-hover:text-tron-white transition-colors">
        Open →
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { isSignedIn } = useAuth();

  const coreFeatures: Feature[] = [
    {
      title: "Procurement Links",
      description:
        "AI-assisted procurement link discovery, verification, scraping, and feedback workflows.",
      to: "/procurement-links",
      icon: <Globe className="w-5 h-5" />,
      access: "Public",
    },
    {
      title: "Government Links",
      description: "Browse and manage government procurement links by state.",
      to: "/government-links",
      icon: <Map className="w-5 h-5" />,
      access: "Public",
    },
    {
      title: "Leads Management",
      description: "Track and manage procurement opportunity leads.",
      to: "/leads-management",
      icon: <FileSearch className="w-5 h-5" />,
      access: "Signed-in",
    },
  ];

  const hrAndSearchFeatures: Feature[] = [
    {
      title: "HR Overview",
      description: "Job/resume matching and high-level HR insights.",
      to: "/hr-overview",
      icon: <Target className="w-5 h-5" />,
      access: "Signed-in",
    },
    {
      title: "Semantic Search",
      description: "AI-powered search across jobs, resumes, and embeddings.",
      to: "/semantic-search",
      icon: <Search className="w-5 h-5" />,
      access: "Signed-in",
    },
    {
      title: "Resume & Data Management",
      description: "Import, export, and manage job postings and resumes.",
      to: "/data-management",
      icon: <Database className="w-5 h-5" />,
      access: "Signed-in",
    },
    {
      title: "KFC Management",
      description:
        "Employee recognition with nominations, points, and approvals.",
      to: "/kfc-management",
      icon: <Users className="w-5 h-5" />,
      access: "Signed-in",
    },
  ];

  const adminAndConfigFeatures: Feature[] = [
    {
      title: "Embedding Management",
      description:
        "Manage embedding pipelines and system optimization workflows.",
      to: "/embedding-management",
      icon: <Settings className="w-5 h-5" />,
      access: "Admin",
    },
    {
      title: "Admin Panel",
      description: "Control visibility, configuration, and platform settings.",
      to: "/admin-panel",
      icon: <Shield className="w-5 h-5" />,
      access: "Admin",
    },
    {
      title: "Theme Config",
      description: "Customize Cobecium’s Tron theme colors and UI preferences.",
      to: "/theme-config",
      icon: <Palette className="w-5 h-5" />,
      access: "Signed-in",
    },
  ];

  return (
    <div className="min-h-full bg-tron-bg-deep">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <div className="tron-panel p-6 md:p-8 tron-grid-bg">
          <h1 className="text-3xl md:text-4xl font-bold text-tron-white tron-glow-text">
            Cobecium Dashboard
          </h1>
          <p className="mt-2 text-tron-muted max-w-3xl">
            A quick map of what Cobecium can do. Use the cards below to jump
            directly into each workflow.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/procurement-links"
              className="px-4 py-2 bg-tron-cyan/10 border border-tron-cyan/30 rounded-lg text-tron-cyan hover:bg-tron-cyan/20 transition-colors text-sm"
            >
              Start with Procurement Links
            </Link>
            {!isSignedIn && (
              <Link
                to="/sign-in"
                className="px-4 py-2 bg-tron-bg-elevated border border-tron-cyan/20 rounded-lg text-tron-white hover:bg-tron-cyan/10 transition-colors text-sm"
              >
                Sign in for full access
              </Link>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <section>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-tron-white">Core</h2>
              <div className="text-xs text-tron-muted">
                Public + core workflows
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {coreFeatures.map((feature) => (
                <FeatureCard key={feature.to} feature={feature} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-tron-white">
                HR & Search
              </h2>
              <div className="text-xs text-tron-muted">
                Matching, insights, and data
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {hrAndSearchFeatures.map((feature) => (
                <FeatureCard key={feature.to} feature={feature} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-tron-white">
                Admin & Config
              </h2>
              <div className="text-xs text-tron-muted">
                Controls and optimization tools
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {adminAndConfigFeatures.map((feature) => (
                <FeatureCard key={feature.to} feature={feature} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
