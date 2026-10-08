/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
 
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
     // ... existing config
  theme: {
    extend: {
      animation: {
        slideUp: 'slideUp 0.3s ease',
        messageSlide: 'messageSlide 0.3s ease',
        bounce: 'bounce 1.4s infinite',
      },
      keyframes: {
        slideUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        messageSlide: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        bounce: {
          '0%, 60%, 100%': { opacity: 0.3, transform: 'translateY(0)' },
          '30%': { opacity: 1, transform: 'translateY(-6px)' },
        },
      },
    },
  },
    extend: {},
  },
  plugins: [],
}

