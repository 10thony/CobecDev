import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { OrganicUnderline } from "./OrganicShapes";
import { RevolvingBookAnimation, type Feature } from "./RevolvingBookAnimation";

interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  showUnderline?: boolean;
  features?: Feature[];
}

export function Hero({
  title = "Cobecium",
  subtitle = "Find procurement opportunities faster. Build tools that actually scale.",
  ctaText = "Get Started",
  ctaHref = "/procurement-links",
  showUnderline = true,
  features = [],
}: HeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative py-16 md:py-24 px-4 md:px-6 lg:px-8 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-tron-bg-deep via-tron-bg-panel to-tron-bg-deep opacity-50" />
      
      {/* Grain texture */}
      <div className="absolute inset-0 grain-overlay" />

      <div className="relative max-w-5xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-tron-white mb-6 leading-tight"
        >
          {title}
        </motion.h1>

        {showUnderline && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-8 max-w-md mx-auto"
          >
            <OrganicUnderline color="#00d4ff" />
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-tron-gray max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to={ctaHref}
            className="
              group
              inline-flex
              items-center
              gap-2
              px-6
              py-3
              bg-tron-cyan
              text-tron-bg-deep
              font-semibold
              rounded-xl
              transition-all
              duration-300
              hover:bg-tron-cyan-dim
              hover:shadow-lg
              hover:shadow-tron-cyan/30
              hover:scale-105
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-tron-cyan
              focus-visible:ring-offset-2
              focus-visible:ring-offset-tron-bg-deep
            "
          >
            {ctaText}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </Link>
        </motion.div>

        {/* Revolving book animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 flex justify-center"
        >
          <RevolvingBookAnimation features={features} rotationSpeed={30} />
        </motion.div>
      </div>
    </motion.section>
  );
}
