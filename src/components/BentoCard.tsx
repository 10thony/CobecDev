import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  span?: "1x1" | "1x2" | "2x1" | "2x2" | "2x3" | "3x2";
  href?: string;
  onClick?: () => void;
  delay?: number;
}

const spanClasses: Record<string, string> = {
  "1x1": "col-span-1 row-span-1",
  "1x2": "col-span-1 row-span-2",
  "2x1": "col-span-2 row-span-1",
  "2x2": "col-span-2 row-span-2",
  "2x3": "col-span-2 row-span-3",
  "3x2": "col-span-3 row-span-2",
};

export function BentoCard({
  children,
  className = "",
  span = "1x1",
  href,
  onClick,
  delay = 0,
}: BentoCardProps) {
  const baseClasses = `
    glass-card
    rounded-3xl
    p-6
    transition-all
    duration-300
    ease-out
    hover:scale-[1.02]
    hover:shadow-lg
    hover:shadow-tron-cyan/10
    focus:outline-none
    focus-visible:ring-2
    focus-visible:ring-tron-cyan/60
    ${spanClasses[span]}
    ${className}
  `;

  const motionProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] },
    whileHover: { scale: 1.02, transition: { duration: 0.2 } },
  };

  if (href) {
    return (
      <motion.div {...motionProps}>
        <Link to={href} className={baseClasses}>
          {children}
        </Link>
      </motion.div>
    );
  }

  if (onClick) {
    return (
      <motion.button
        {...motionProps}
        onClick={onClick}
        className={baseClasses}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div {...motionProps} className={baseClasses}>
      {children}
    </motion.div>
  );
}
