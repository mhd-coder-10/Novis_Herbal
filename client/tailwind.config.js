/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#16a34a',
          800: '#135234',
          900: '#0B3B24',
          950: '#062315',
        },
        gold: {
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#d4af37',
          600: '#c5a059',
          700: '#a17c38',
        },
        cream: {
          50: '#FFFFFF',
          100: '#FDFBF7',
          200: '#F7F3EB',
          300: '#EFE9DD'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        admin: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        'luxury': '0 20px 40px -15px rgba(11, 59, 36, 0.08), 0 0 1px 1px rgba(11, 59, 36, 0.04)',
        'glow-gold': '0 0 25px -5px rgba(212, 175, 55, 0.4)',
      }
    },
  },
  plugins: [],
}
