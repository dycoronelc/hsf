/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Paleta Hospital Santa Fe */
        hospital: {
          main: '#00816D',        /* Color principal para fondos */
          'main-dark': '#006055', /* Variante oscura (hover) */
          accent: '#00AA83',      /* Verde/teal acento */
          violet: '#7574C0',     /* Morado/lila acento */
          white: '#FFFFFF',
          /* Aliases para compatibilidad con clases existentes (hospital-blue = main) */
          blue: '#00816D',
          'blue-dark': '#006055',
          'blue-light': '#00AA83',
          green: '#00AA83',
          'green-dark': '#00816D',
          gray: '#6b7280',
          'gray-light': '#f3f4f6',
          'gray-dark': '#374151',
        },
      },
    },
  },
  plugins: [],
}
