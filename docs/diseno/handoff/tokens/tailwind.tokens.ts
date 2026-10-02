// Tokens de "El Mejor de" — copiar dentro de theme.extend en tailwind.config.ts
// (o importar este objeto y hacer `theme: { extend: tokens }`).
import type { Config } from 'tailwindcss';

export const tokens: NonNullable<Config['theme']>['extend'] = {
  colors: {
    brand: { DEFAULT: '#4F6BFF', 100: '#E6EAFF', 500: '#4F6BFF', 600: '#3F58E6' },
    ink: { DEFAULT: '#23263A', 300: '#B8BDD6', 500: '#6C7191', 700: '#4B5070', 900: '#23263A' },
    sky: { 100: '#C3DAF8', 200: '#DAE1F6', 300: '#E8EAF6' },
    surface: { DEFAULT: '#FFFFFF', 2: '#F1F2FA', line: '#EDEFF8' },
    gold: { DEFAULT: '#FFC53D', soft: '#FFF3D6', ink: '#5A4300', text: '#9A6200', dark: '#D9971A' },
    success: '#1FA093',
    danger: '#E2504C',
    whatsapp: '#25D366',
    // juegos: base / oscuro (texto, cabecera en juego) / claro
    letras: { DEFAULT: '#FF6B4A', dark: '#C94F2E', light: '#FFD1C4' },
    preguntas: { DEFAULT: '#8B6CFF', dark: '#6A4FD6', light: '#E4DBFF' },
    reflejos: { DEFAULT: '#2EC4B6', dark: '#158A7F', light: '#CFF3EE' },
    secuencia: { DEFAULT: '#FFC53D', dark: '#D9971A', light: '#FFF0C2' },
  },
  fontFamily: {
    display: ['var(--font-outfit)', 'Outfit', 'system-ui', 'sans-serif'],
    sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
  },
  fontSize: {
    'display-xl': ['84px', { lineHeight: '1', letterSpacing: '-0.05em', fontWeight: '800' }],
    'display-lg': ['42px', { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '800' }],
    display: ['34px', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
    title: ['28px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '800' }],
    label: ['11px', { lineHeight: '1', letterSpacing: '0.06em', fontWeight: '700' }],
  },
  borderRadius: { hero: '28px', card: '22px', tile: '20px', row: '16px', key: '14px' },
  boxShadow: {
    sm: '0 6px 16px rgba(35,38,58,.06)',
    md: '0 8px 20px rgba(35,38,58,.08)',
    lg: '0 10px 30px rgba(35,38,58,.12)',
    btn: '0 12px 24px rgba(79,107,255,.35)',
    'btn-gold': '0 12px 24px rgba(255,197,61,.4)',
    'btn-letras': '0 16px 32px rgba(255,107,74,.35)',
    'btn-preguntas': '0 16px 32px rgba(139,108,255,.35)',
    'btn-reflejos': '0 16px 32px rgba(46,196,182,.35)',
    'btn-secuencia': '0 16px 32px rgba(255,197,61,.4)',
  },
  backgroundImage: {
    sky: 'linear-gradient(180deg,#C3DAF8 0%,#DAE1F6 42%,#E8EAF6 100%)',
    festejo: 'linear-gradient(180deg,#3B4FD8 0%,#4F6BFF 55%,#8FA6FF 100%)',
    'tile-shine': 'linear-gradient(160deg,rgba(255,255,255,.3),rgba(255,255,255,0) 55%)',
    'btn-shine': 'linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,255,255,0) 55%)',
    'hero-brand': 'linear-gradient(165deg,#6280FF 0%,#4F6BFF 60%,#4560F0 100%)',
    'hero-letras': 'linear-gradient(165deg,#FF8A6E 0%,#FF6B4A 60%,#F05A3A 100%)',
    'hero-preguntas': 'linear-gradient(165deg,#A48CFF 0%,#8B6CFF 60%,#7A5BEE 100%)',
    'hero-reflejos': 'linear-gradient(165deg,#4FD6C9 0%,#2EC4B6 60%,#22B0A3 100%)',
    'hero-secuencia': 'linear-gradient(165deg,#FFD978 0%,#FFC53D 60%,#F2B52A 100%)',
  },
  spacing: { safe: '44px', status: '66px', screen: '20px' },
  height: { btn: '56px', 'btn-tall': '74px', 'btn-gold': '66px', 'btn-2': '52px', field: '50px', row: '50px', chip: '32px', pill: '38px', key: '56px' },
  keyframes: {
    bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
    float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
    pop: { '0%': { transform: 'translateY(-90px) scale(.5)', opacity: '0' }, '70%': { transform: 'translateY(6px) scale(1.06)', opacity: '1' }, '100%': { transform: 'translateY(0) scale(1)', opacity: '1' } },
    rain: { '0%': { transform: 'translateY(0) rotate(0deg)' }, '100%': { transform: 'translateY(900px) rotate(620deg)' } },
  },
  animation: {
    bob: 'bob 3.2s ease-in-out infinite',
    float: 'float 4s ease-in-out infinite',
    pop: 'pop .8s cubic-bezier(.2,.9,.3,1.25) both',
    rain: 'rain 4.5s linear infinite',
  },
  transitionDuration: { DEFAULT: '160ms' },
};

export default tokens;
