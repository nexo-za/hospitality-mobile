/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
      },
      spacing: {
        // Add spacing for space-x and space-y utilities
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
      },
    },
  },
  plugins: [
    // React Native compatible spacing utilities
    function({ addUtilities, theme }) {
      const spacingScale = theme('spacing');
      const spacingUtilities = {};
      
      // Generate space utilities for common values
      for (let i = 0; i <= 12; i++) {
        // Regular values (1, 2, 3, etc.)
        spacingUtilities[`.space-y-${i}`] = { 'gap-y': spacingScale[i] || `${i * 0.25}rem` };
        spacingUtilities[`.space-x-${i}`] = { 'gap-x': spacingScale[i] || `${i * 0.25}rem` };
        
        // Add .5 versions (0.5, 1.5, 2.5, etc.)
        if (i < 12) {
          const halfKey = `${i}.5`;
          spacingUtilities[`.space-y-${i}\\.5`] = { 'gap-y': spacingScale[halfKey] || `${(i + 0.5) * 0.25}rem` };
          spacingUtilities[`.space-x-${i}\\.5`] = { 'gap-x': spacingScale[halfKey] || `${(i + 0.5) * 0.25}rem` };
        }
      }
      
      addUtilities(spacingUtilities);
    },
  ],
};
