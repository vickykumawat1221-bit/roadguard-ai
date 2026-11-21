/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B132B',
          800: '#1C2541',
          700: '#233156',
          600: '#3A506B',
        },
        accent: {
          blue: '#1E6091',
          cyan: '#48CAE4',
          highlight: '#00B4D8',
        },
        severity: {
          low: '#10B981',    // green
          medium: '#F59E0B', // orange
          high: '#EF4444',   // red
        }
      }
    },
  },
  plugins: [],
}
