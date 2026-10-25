/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
      },
      colors: {
        hazard: {
          pothole: '#F59E0B',
          construction: '#EAB308',
          roadblock: '#EF4444',
          accident: '#8B5CF6',
          other: '#6B7280'
        }
      }
    },
  },
  plugins: [],
}
