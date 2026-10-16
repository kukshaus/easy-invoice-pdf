import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "Arial",
          "Helvetica",
          "sans-serif",
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // szamlazz.hu-inspired palette (blue accent instead of orange)
        ink: {
          DEFAULT: "#102126",
          muted: "#293D42",
          soft: "#5B6E74",
        },
        brand: {
          DEFAULT: "#066FC3",
          50: "#EAF4FC",
          100: "#D3E7F8",
          200: "#BFDDF5",
          300: "#69B2EB",
          600: "#055392",
          700: "#044374",
        },
        surface: {
          DEFAULT: "#F3F5F6",
          strong: "#E7ECEE",
        },
        line: {
          DEFAULT: "#CDD7DB",
          soft: "#E7ECEE",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        heartbeat: {
          "0%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.4)" },
          "50%": { transform: "scale(1)" },
          "75%": { transform: "scale(1.4)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        heartbeat: "heartbeat 3s ease-in-out infinite 25s", // 3s = duration of animation, infinite = repeat forever, 25s = delay before starting animation
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
