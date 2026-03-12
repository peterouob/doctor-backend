/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Noto Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Figtree", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#F0FDFA",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134E4A",
          950: "#042f2e",
        },
        medical: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22D3EE",
          500: "#06b6d4",
          600: "#0891B2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
        success: {
          500: "#22C55E",
          600: "#16a34a",
        }
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
      backgroundImage: {
        "subtle-grid": "radial-gradient(#e5e7eb 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
