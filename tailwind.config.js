/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'sans-serif'],
      },
      colors: {
        'zenith-active': 'var(--zenith-active)',
        'zenith-bg': 'var(--zenith-bg)',
        'zenith-surface': 'var(--zenith-surface)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.3)',
        'glass-strong': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'glow-primary': '0 0 20px rgba(0, 200, 83, 0.4)',
        'glow-white': '0 0 15px rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
}