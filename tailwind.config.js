const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...fontFamily.sans],
      },
      borderRadius: {
        DEFAULT: "8px",
        secondary: "4px",
        container: "12px",
      },
      boxShadow: {
        DEFAULT: "0 1px 4px rgba(0, 0, 0, 0.1)",
        hover: "0 2px 8px rgba(0, 0, 0, 0.12)",
        'tron-glow': '0 0 10px rgba(0, 212, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.3)',
        'tron-glow-blue': '0 0 10px rgba(0, 102, 255, 0.5), 0 0 20px rgba(0, 102, 255, 0.3)',
        'tron-glow-orange': '0 0 10px rgba(255, 102, 0, 0.5), 0 0 20px rgba(255, 102, 0, 0.3)',
        'tron-glow-success': '0 0 10px rgba(0, 255, 136, 0.5)',
        'tron-glow-error': '0 0 10px rgba(255, 68, 68, 0.5)',
        'tron-inset': 'inset 0 0 20px rgba(0, 212, 255, 0.1)',
      },
      colors: {
        // Tron Dark Backgrounds
        tron: {
          bg: {
            deep: '#0a0a0f',
            panel: '#0d1117',
            card: '#161b22',
            elevated: '#21262d',
          },
          // Neon Accents
          cyan: {
            DEFAULT: '#00d4ff',
            dim: '#00a8cc',
            bright: '#4de8ff',
          },
          blue: {
            DEFAULT: '#0066ff',
            dim: '#0052cc',
            bright: '#3385ff',
          },
          orange: {
            DEFAULT: '#ff6600',
            dim: '#cc5200',
            bright: '#ff8533',
          },
          // Text
          white: '#f0f6fc',
          gray: '#8b949e',
          muted: '#484f58',
        },
        // Status colors with glow potential
        neon: {
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff4444',
          info: '#00ccff',
        },
        // Legacy colors for backward compatibility during migration
        yale_blue: {
          DEFAULT: '#134074',
          100: '#040d17',
          200: '#07192e',
          300: '#0b2644',
          400: '#0f325b',
          500: '#134074',
          600: '#1d63b3',
          700: '#3c88df',
          800: '#7db0ea',
          900: '#bed7f4'
        },
        berkeley_blue: {
          DEFAULT: '#13315c',
          100: '#040a13',
          200: '#081425',
          300: '#0b1e38',
          400: '#0f284b',
          500: '#13315c',
          600: '#21559f',
          700: '#397bd6',
          800: '#7ba7e4',
          900: '#bdd3f1'
        },
        oxford_blue: {
          DEFAULT: '#0b2545',
          100: '#02080e',
          200: '#050f1c',
          300: '#07172a',
          400: '#091e38',
          500: '#0b2545',
          600: '#174e90',
          700: '#2375da',
          800: '#6ca3e7',
          900: '#b5d1f3'
        },
        powder_blue: {
          DEFAULT: '#8da9c4',
          100: '#17222c',
          200: '#2e4459',
          300: '#456685',
          400: '#6088ad',
          500: '#8da9c4',
          600: '#a3bad0',
          700: '#baccdc',
          800: '#d1dde7',
          900: '#e8eef3'
        },
        mint_cream: {
          DEFAULT: '#eef4ed',
          100: '#283b24',
          200: '#507749',
          300: '#7dab75',
          400: '#b5cfb1',
          500: '#eef4ed',
          600: '#f1f6f0',
          700: '#f4f8f4',
          800: '#f8faf7',
          900: '#fbfdfb'
        },
        primary: {
          DEFAULT: '#134074',
          hover: '#0b2545',
        },
        secondary: {
          DEFAULT: '#8da9c4',
          hover: '#6088ad',
        },
        accent: {
          DEFAULT: '#eef4ed',
          hover: '#b5cfb1',
        },
      },
      borderColor: {
        'tron-glow': 'rgba(0, 212, 255, 0.5)',
      },
      backgroundImage: {
        'tron-grid': 'linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)',
        'tron-circuit': 'radial-gradient(circle at 25px 25px, rgba(0, 212, 255, 0.15) 2%, transparent 0%)',
        'tron-gradient': 'linear-gradient(180deg, rgba(0, 212, 255, 0.1) 0%, transparent 50%)',
      },
      animation: {
        'tron-pulse': 'tron-pulse 2s ease-in-out infinite',
        'tron-glow-pulse': 'tron-glow-pulse 3s ease-in-out infinite',
        'tron-scan': 'tron-scan 4s linear infinite',
        'tron-border': 'tron-border 2s linear infinite',
      },
      keyframes: {
        'tron-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'tron-glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)' },
        },
        'tron-scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'tron-border': {
          '0%': { borderColor: 'rgba(0, 212, 255, 0.3)' },
          '50%': { borderColor: 'rgba(0, 212, 255, 0.8)' },
          '100%': { borderColor: 'rgba(0, 212, 255, 0.3)' },
        },
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
      },
    },
  },
  plugins: [
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.rounded-container': {
          borderRadius: theme('borderRadius.container'),
        },
        '.tron-border': {
          border: '1px solid rgba(0, 212, 255, 0.3)',
          '&:hover': {
            borderColor: 'rgba(0, 212, 255, 0.6)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
          }
        },
        '.tron-panel': {
          backgroundColor: '#0d1117',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '8px',
        },
        '.tron-card': {
          backgroundColor: '#161b22',
          border: '1px solid rgba(0, 212, 255, 0.15)',
          borderRadius: '6px',
        },
        '.tron-text-glow': {
          textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
        },
        '.tron-neon-line': {
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
          }
        },
      }
      addUtilities(newUtilities)
    }
  ],
};
