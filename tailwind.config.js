export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ad-bg': '#0B0508',
        'ad-bg-secondary': '#19090F',
        'ad-burgundy': '#460B1B',
        'ad-red': '#8B1732',
        'ad-gold': '#D5AA6D',
        'ad-text': '#F5E9EC',
        'ad-text-secondary': '#BA9BA4',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'card-flip': 'cardFlip 0.6s ease-in-out',
        'curtain-reveal': 'curtainReveal 1.2s ease-out',
        'spin-wheel': 'spinWheel 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 23, 50, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(139, 23, 50, 0.6)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        curtainReveal: {
          '0%': { clipPath: 'inset(0 50% 0 50%)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        spinWheel: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(1800deg)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'ad-gradient': 'linear-gradient(135deg, #0B0508 0%, #19090F 50%, #460B1B 100%)',
        'ad-card-gradient': 'linear-gradient(180deg, rgba(70,11,27,0.4) 0%, rgba(11,5,8,0.9) 100%)',
      },
    },
  },
  plugins: [],
};
