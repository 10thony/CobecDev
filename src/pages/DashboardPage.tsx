import type React from "react";
import { useAuth } from "@clerk/clerk-react";
import { motion } from "framer-motion";
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
  ArrowRight,
} from "lucide-react";
import { BentoCard } from "../components/BentoCard";
import { Hero } from "../components/Hero";

type FeatureAccess = "Public" | "Signed-in" | "Admin";

type Feature = {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  access: FeatureAccess;
  span?: "1x1" | "1x2" | "2x1" | "2x2" | "2x3" | "3x2";
};

function AccessBadge({ access }: { access: FeatureAccess }) {
  const styles: Record<FeatureAccess, string> = {
    Public: "bg-tron-cyan/10 text-tron-cyan border border-tron-cyan/30",
    "Signed-in": "bg-gray-500/20 text-gray-400 border border-gray-500/30",
    Admin: "bg-gray-600/20 text-gray-300 border border-gray-600/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wide ${styles[access]}`}
    >
      {access}
    </span>
  );
}

function FeatureCard({ feature, delay = 0 }: { feature: Feature; delay?: number }) {
  return (
    <BentoCard
      href={feature.to}
      span={feature.span || "1x1"}
      delay={delay}
      className="flex flex-col"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="text-tron-cyan flex-shrink-0">
          {feature.icon}
        </div>
        <AccessBadge access={feature.access} />
      </div>
      <h3 className="text-lg font-display font-semibold text-tron-white mb-2">
        {feature.title}
      </h3>
      <p className="text-sm text-tron-gray leading-relaxed flex-grow mb-4">
        {feature.description}
      </p>
      <div className="flex items-center gap-2 text-xs text-tron-gray group-hover:text-tron-cyan transition-colors mt-auto">
        <span>Open</span>
        <ArrowRight className="w-3 h-3" strokeWidth={2} />
      </div>
    </BentoCard>
  );
}

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

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

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {/* Core Features - Bento Grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-2xl font-display font-semibold text-tron-white">
                Core Features
              </h2>
              <div className="text-xs text-tron-muted uppercase tracking-wide">
                Public access
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
              {coreFeatures.map((feature, index) => (
                <FeatureCard
                  key={feature.to}
                  feature={feature}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </motion.section>

          {/* HR & Search Features - Bento Grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-2xl font-display font-semibold text-tron-white">
                HR & Search
              </h2>
              <div className="text-xs text-tron-muted uppercase tracking-wide">
                Signed-in required
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
              {hrAndSearchFeatures.map((feature, index) => (
                <FeatureCard
                  key={feature.to}
                  feature={feature}
                  delay={index * 0.1 + 0.3}
                />
              ))}
            </div>
          </motion.section>

          {/* Admin & Config Features - Bento Grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-2xl font-display font-semibold text-tron-white">
                Admin & Configuration
              </h2>
              <div className="text-xs text-tron-muted uppercase tracking-wide">
                Admin access
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
              {adminAndConfigFeatures.map((feature, index) => (
                <FeatureCard
                  key={feature.to}
                  feature={feature}
                  delay={index * 0.1 + 0.6}
                />
              ))}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
