/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 1s ease-out',
        'fade-in-delay': 'fadeIn 2s ease-in',
        'gradient-slow': 'gradientBG 15s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        gradientBG: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundSize: {
        '200%': '200% 200%',
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.8s ease-out forwards",
        "fade-in-delay": "fadeIn 0.6s ease-out 0.3s forwards",
        "title-bounce": "titleBounce 1s ease-out forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        titleBounce: {
          "0%": { opacity: "0", transform: "translateY(30px) scale(0.9)" },
          "50%": { opacity: "0.7", transform: "translateY(-10px) scale(1.1)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      colors: {
        primary: "hsl(229.7, 93.5%, 81.8%)",
        secondary: "hsl(280, 80%, 65%)", 
        purpleCustom: "hsl(292, 91.4%, 72.5%)",
        coral: {
          400: "#FF7043", // Lighter coral for reference
          500: "#F4511E",
          600: "#D84315",
          700: "#BF360C",
          800: "#A12708",
          900: "#871C05",
        },
        gray: { 100: "#F3F4F6", 700: "#374151", 800: "#1F2A44" },
        blue: { 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8" },
        indigo: { 600: "#4F46E5", 700: "#4338CA", 800: "#3730A3" },
      },
      
    },
  },
  plugins: [daisyui, typography],
}
