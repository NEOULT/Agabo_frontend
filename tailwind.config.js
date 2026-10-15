/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 🎨 NARANJA PARCHITA — vibrante, análogos incluidos
        // Inspirado en: #f38e00, #ffa216, #dcf500, #f2ff20, #ff1800
        brand: {
          50: '#fff8ee',
          100: '#ffefd0',
          200: '#ffd699',
          300: '#ffbc5c',
          400: '#ffa216',
          500: '#f38e00',   // ★ Color principal
          600: '#d97700',
          700: '#b86000',
          800: '#934c00',
          900: '#763d00',
          950: '#421f00',
        },

        // 🏠 Fondos de superficie — tonos cálidos y acogedores
        surface: {
          primary: '#ffffff',
          secondary: '#fffbf5',    // Crema cálido (no gris frío)
          tertiary: '#fef7ed',     // Tono durazno sutil
        },

        // 📝 Textos — escala piedra cálida
        text: {
          primary: '#1c1917',
          secondary: '#44403c',
          tertiary: '#78716c',
          muted: '#a8a29e',
          disabled: '#d6d3d1',
        },

        // 🔲 Bordes — tonos miel/ámbar
        border: {
          default: '#e7e5e4',
          input: '#d6d3d1',
          subtle: '#f5f5f4',
        },

        // 🟢🟡🔴 Análogos del naranja — vibrantes
        semantic: {
          success: {
            50: '#f7fee7',
            100: '#ecfccb',
            400: '#bef264',
            500: '#a3e635',       // Lima vibrante (~dcf500)
            600: '#65a30d',
            700: '#4d7c0f',
            800: '#3f6212',
          },
          warning: {
            50: '#fefce8',
            100: '#fef9c3',
            400: '#fde047',
            500: '#eab308',
            600: '#ca8a04',
            800: '#854d0e',
          },
          danger: {
            50: '#fff1f0',
            100: '#ffd5d2',
            200: '#ffbab3',
            300: '#ff8a80',
            500: '#ff1800',       // Rojo intenso (análogo naranja)
            600: '#d91500',
            700: '#b31200',
            800: '#8c0e00',
          },
          // 🟡 Acento amarillo-lima ultra vibrante
          accent: {
            50: '#fefff0',
            100: '#fcffcc',
            500: '#f2ff20',       // Amarillo lima brillante
            600: '#d1db00',
          },
        },

        // 🧭 Header — naranja vibrante
        header: {
          bg: '#f38e00',
          text: '#ffffff',
          muted: '#ffd699',
          hover: '#d97700',
          border: '#ffa216',
          avatar: '#ffa216',
          select: '#d97700',
          ring: '#ffbc5c',
        },

        // 📋 Sidebar — cálida y clara (ni blanca fría, ni negra)
        sidebar: {
          bg: '#fffbf5',
          border: '#fde68a',
          text: '#44403c',
          muted: '#a8a29e',
          active: '#f38e00',
          activeText: '#ffffff',
          hover: '#fef3c7',
          logo: '#f38e00',
          toggleBorder: '#fde68a',
          toggleHover: '#fef3c7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      // ✨ Animaciones sutiles — solo transform/opacity (compositor, sin reflow)
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'grow-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'fade-in-up': 'fade-in-up 0.3s ease-out both',
        'scale-in': 'scale-in 0.18s ease-out both',
        'slide-in-right': 'slide-in-right 0.25s ease-out both',
        'grow-x': 'grow-x 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
      },

      // 🪄 Elevación sutil para tarjetas y superficies
      boxShadow: {
        soft: '0 1px 2px rgba(28, 25, 23, 0.04), 0 1px 3px rgba(28, 25, 23, 0.06)',
        elevated: '0 8px 24px -8px rgba(28, 25, 23, 0.16)',
      },
    },
  },
  plugins: [],
};
