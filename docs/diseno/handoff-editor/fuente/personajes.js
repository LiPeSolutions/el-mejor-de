// Personajes v2 — El Mejor de. One rig per species, three ways to paint it:
// "fiel" (flat, like today, polished), "suave" (soft volume) and "sticker" (ink outline + white border).
// <em-pj sp="gato" estilo="sticker" size="96" color="violeta" detalle="rosa" ojos="pestanas" pelo="copete"
//        marcas="rayas" ropa="camiseta" ropa-color="azul" numero="10" cabeza="mono" cara="anteojos"
//        cuello="bufanda" mano="celu" face="joy" crop="head"></em-pj>
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#23263A', EYE = '#3C1E00', CHEEK = '#FF9EB5', TONGUE = '#FF7A8A';
  // AVATAR_PALETTE from apps/web/src/components/personaje/avatar.ts (main / light / dark).
  const PAL = {
    dorado: { m: '#FFC53D', l: '#FFF0C2', d: '#D9971A', b: '#FF8A3D' },
    coral: { m: '#FF6B4A', l: '#FFD1C4', d: '#C94F2E' },
    verde: { m: '#3ECF8E', l: '#CFF5E3', d: '#22A06B' },
    azul: { m: '#4F6BFF', l: '#C9D3FF', d: '#3449C9' },
    violeta: { m: '#8B6CFF', l: '#E4DBFF', d: '#6A4FD6' },
    rosa: { m: '#FF7AA2', l: '#FFD6E3', d: '#D9557F' },
    gris: { m: '#9AA3B5', l: '#E4E7EE', d: '#6C7489' },
  };
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const lum = (h) => { const [r, g, b] = rgb(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

  const N = (t, a, o) => Object.assign({ t, a: a || {} }, o || {});
  const E = (cx, cy, rx, ry, f, o) => N('ellipse', { cx, cy, rx, ry }, Object.assign({ f }, o));
  const C = (cx, cy, r, f, o) => N('circle', { cx, cy, r }, Object.assign({ f }, o));
  const R = (x, y, width, height, rx, f, o) => N('rect', { x, y, width, height, rx }, Object.assign({ f }, o));
  const PG = (points, f, o) => N('polygon', { points }, Object.assign({ f }, o));
  const PA = (d, f, o) => N('path', { d }, Object.assign({ f }, o));
  const ST = (d, s, w, o) => N('path', { d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, Object.assign({ s, sw: w }, o));
  const RING = (cx, cy, r, s, w) => N('circle', { cx, cy, r, fill: 'none' }, { s, sw: w });
  const G = (k, o) => N('g', {}, Object.assign({ k: k.filter(Boolean) }, o));
  const rot = (d, x, y) => `rotate(${d} ${x} ${y})`;
  const S = { sil: 1 };
  const feet = (f) => [E(41, 109, 7, 4.5, f, S), E(59, 109, 7, 4.5, f, S)];
  const arms = (f, cy, dx) => [E(50 - dx, cy, 6, 10, f, { sil: 1, arm: 'L', tr: rot(22, 50 - dx, cy) }), E(50 + dx, cy, 6, 10, f, { sil: 1, arm: 'R', tr: rot(-22, 50 + dx, cy) })];
  const torso = () => E(50, 89, 22, 19, 'm', { sil: 1, grad: 1 });
  const belly = (f = 'l', cy = 93, rx = 12, ry = 11) => E(50, cy, rx, ry, f, { belly: 1 });
  const headC = () => C(50, 48, 32, 'm', { sil: 1, grad: 1 });
  const wing = (x, f, d) => E(x, 90, 6, 11, f, { sil: 1, arm: x < 50 ? 'L' : 'R', tr: rot(d, x, 90) });

  /* ───────────── Species: the rig (viewBox 0 0 100 120, same anchors as today) ───────────── */
  const SP = {
    carpincho: () => ({
      c: { m: '#B9804A', l: '#E8CDA3', d: '#7D5330' },
      A: { T: 17, hw: 33, hc: 48, eyeY: 46, eyeDX: 12, mouthY: 62, neckY: 72, hb: 79, cheekY: 56, cheekDX: 21, arms: [23, 86] },
      back: [C(25, 22, 6.5, 'd', S), C(75, 22, 6.5, 'd', S)],
      body: [...feet('d'), ...arms('m', 86, 23), torso(), belly()],
      head: [R(17, 17, 66, 62, 28, 'm', { sil: 1, grad: 1 })],
      front: [E(50, 62, 15, 10, 'l'), E(50, 57, 3.6, 2.4, 'eye')],
    }),
    hornero: () => ({
      c: { m: '#D97B3E', l: '#F5D2B5', d: '#A6522A', b: '#F0A830' },
      A: { T: 16, hw: 32, eyeY: 47, eyeDX: 11, mouthY: 58, neckY: 72, hb: 80, cheekY: 57, cheekDX: 20, beak: 1, skin: 'l', arms: [18, 90] },
      back: [PG('38,94 9,107 40,104', 'd', S)],
      body: [...feet('b'), torso(), wing(68, 'd', -18), wing(32, 'd', 18), belly()],
      head: [headC()],
      front: [E(50, 55, 18, 13, 'l'), PG('43,57 50,52 57,57 50,62', 'b'), PG('43,57 57,57 50,62', 'd', { op: 0.35 })],
    }),
    pinguino: () => ({
      c: { m: '#2F3447', l: '#FFFFFF', d: '#1E2232', b: '#F5A623' },
      A: { T: 16, hw: 32, eyeY: 49, eyeDX: 9, mouthY: 58, neckY: 74, hb: 80, cheekY: 57, cheekDX: 17, beak: 1, skin: 'l', arms: [24, 86] },
      body: [...feet('b'), ...arms('m', 86, 24), torso(), belly('l', 93, 14, 13)],
      head: [headC()],
      front: [E(50, 52, 21, 18, 'l'), PG('45,58 55,58 50,64', 'b')],
    }),
    zorro: () => ({
      c: { m: '#FF7A3D', l: '#FFE3CF', d: '#C94F1A' },
      A: { T: 16, hw: 32, eyeY: 47, eyeDX: 11, mouthY: 62, neckY: 72, hb: 80, cheekY: 56, cheekDX: 21, arms: [23, 86] },
      back: [E(20, 98, 17, 9, 'm', { sil: 1, tr: rot(-28, 20, 98) }), E(8, 104, 6.5, 5.5, 'l', S), PG('20,34 27,6 44,24', 'm', S), PG('80,34 73,6 56,24', 'm', S), PG('25,30 29,14 39,25', 'd', { op: 0.55 }), PG('75,30 71,14 61,25', 'd', { op: 0.55 })],
      body: [...feet('d'), ...arms('m', 86, 23), torso(), belly()],
      head: [headC()],
      front: [E(50, 61, 14, 10, 'l'), E(50, 56, 3.2, 2.3, 'eye')],
    }),
    rana: () => ({
      c: { m: '#6CCB6C', l: '#D6F2BF', d: '#3D9B4B' },
      A: { T: 13, hw: 31, hc: 50, eyeY: 23, eyeDX: 13, mouthY: 60, mouthW: 9, neckY: 74, hb: 81, cheekY: 56, cheekDX: 21, eyeWhite: 1, arms: [23, 86] },
      body: [...feet('d'), ...arms('m', 86, 23), torso(), belly('l', 92, 14, 12)],
      head: [C(50, 50, 31, 'm', { sil: 1, grad: 1 }), C(37, 23, 9.5, 'm', { sil: 1, mv: 1 }), C(63, 23, 9.5, 'm', { sil: 1, mv: 1 })],
    }),
    llama: () => ({
      c: { m: '#F1E3C8', l: '#FFF8EA', d: '#C9A074' },
      A: { T: 16, hw: 21, hc: 35, eyeY: 33, eyeDX: 8, mouthY: 47, mouthW: 3, neckY: 62, nw: 10, hb: 54, cheekY: 40, cheekDX: 16, cheekR: 3.4, hugY: 101, body: [92, 26, 17], hand: [74, 88] },
      back: [E(39, 15, 4.5, 9, 'm', { sil: 1, tr: rot(-12, 39, 15) }), E(61, 15, 4.5, 9, 'm', { sil: 1, tr: rot(12, 61, 15) }), E(39, 16, 2, 5, 'cheek', { op: 0.6, tr: rot(-12, 39, 16) }), E(61, 16, 2, 5, 'cheek', { op: 0.6, tr: rot(12, 61, 16) })],
      body: [...feet('d'), E(50, 92, 26, 17, 'm', { sil: 1, grad: 1 })],
      deco: [R(30, 84, 40, 12, 4, '#FF6B4A'), R(30, 88, 40, 4, 0, '#4F6BFF')],
      bodyTop: [R(40, 40, 20, 40, 10, 'm', S)],
      head: [E(50, 35, 21, 19, 'm', { sil: 1, grad: 1 })],
      front: [E(50, 44, 11, 8, 'l'), E(47, 42, 1.3, 2, 'eye'), E(53, 42, 1.3, 2, 'eye'), C(50, 17, 5, 'l', S)],
      bodyClip: [E(50, 92, 26, 17)],
    }),
    pelusa: () => {
      const pts = [];
      for (let i = 0; i < 32; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 16;
        const r = i % 2 ? 33 : 41;
        pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`);
      }
      const p = pts.join(' ');
      return {
        c: { m: '#8B6CFF', l: '#E4DBFF', d: '#6A4FD6' },
        A: { T: 19, hw: 38, hc: 57, eyeY: 54, eyeDX: 10, mouthY: 65, neckY: 80, hb: 98, cheekY: 63, cheekDX: 20, hugY: 90, body: [62, 40, 38], hand: [78, 88], arms: [31, 88] },
        body: [...feet('d'), ...arms('m', 88, 31)],
        head: [PG(p, 'm', { sil: 1, grad: 1, s: 'm', sw: 6, a2: 1 })],
        front: [E(50, 81, 12, 10, 'l', { belly: 1 })],
        headClip: [PG(p)],
        bodyClip: [PG(p)],
      };
    },
    nioqui: () => ({
      c: { m: '#FFC53D', l: '#FFE9A8', d: '#E09A1A' },
      A: { T: 18, hw: 30, eyeY: 50, eyeDX: 10, mouthY: 61, neckY: 76, hb: 106, cheekY: 58, cheekDX: 20, hugY: 88, body: [76, 30, 30], hand: [79, 80], arms: [29, 80] },
      body: [...feet('d'), ...arms('m', 80, 29)],
      head: [R(20, 18, 60, 88, 30, 'm', { sil: 1, grad: 1 }), ST('M50 19 Q51 8 59 9', 'd', 2.5, S), C(59.5, 9, 3, 'd', S)],
      front: [E(50, 84, 14, 13, 'l', { belly: 1 })],
      headClip: [R(20, 18, 60, 88, 30)],
      bodyClip: [R(20, 18, 60, 88, 30)],
    }),
    yaguarete: () => ({
      c: { m: '#F0A93B', l: '#FFF1D9', d: '#6B4A1E', x: '#B5654A' },
      A: { T: 16, hw: 32, eyeY: 47, eyeDX: 11, mouthY: 63, neckY: 74, hb: 80, cheekY: 57, cheekDX: 22, arms: [23, 86] },
      back: [ST('M60 102 Q92 106 88 80', 'm', 7, S), ST('M83 94.2 L87.8 97.8', 'd', 2.2), ST('M85.2 88.7 L91.1 89.7', 'd', 2.2), C(26, 25, 9, 'm', S), C(74, 25, 9, 'm', S), C(26, 26, 4.6, 'l'), C(74, 26, 4.6, 'l')],
      body: [...feet('p'), ...arms('m', 86, 23), torso(), belly()],
      natBody: [C(31, 84, 1.6, 'd'), C(34, 81, 1.6, 'd'), C(35.5, 85.5, 1.6, 'd'), C(68.5, 92, 1.6, 'd'), C(65.5, 89, 1.6, 'd'), C(64.5, 93.5, 1.6, 'd'), C(33, 98, 1.4, 'd'), C(67, 101, 1.4, 'd')],
      head: [headC()],
      natHead: [C(37, 25, 2.6, 'd'), C(50, 20.5, 2.2, 'd'), C(63, 25, 2.6, 'd'), C(27, 42, 2.2, 'd'), C(73, 42, 2.2, 'd'), C(30, 33, 1.6, 'd'), C(70, 33, 1.6, 'd')],
      front: [E(44, 62, 8, 6, 'l'), E(56, 62, 8, 6, 'l'), E(50, 67, 6, 4, 'l'), PG('45.5,55.5 54.5,55.5 50,60', 'x')],
    }),
    tero: () => ({
      c: { m: '#B9C2CC', l: '#FFFFFF', d: '#2F3447', b: '#FF8A6E' },
      A: { T: 16, hw: 32, eyeY: 46, eyeDX: 11, mouthY: 57, neckY: 74, hb: 80, cheekY: 56, cheekDX: 20, beak: 1, eyeRing: 'b', arms: [18, 90] },
      back: [ST('M58 19 Q74 2 88 7', 'd', 3.6, S), PG('40,95 11,104 40,105', 'd', S)],
      body: [...feet('b'), torso(), wing(68, 'd', -18), wing(32, 'd', 18), belly()],
      head: [headC()],
      natHead: [R(48, 16, 4, 17, 2, 'd')],
      front: [E(50, 80, 15, 5.5, 'd', { belly: 1 }), PG('45,56 55,56 50,63', 'b'), PG('48.2,61 51.8,61 50,63', 'd')],
    }),
    mulita: () => ({
      c: { m: '#B98A6A', l: '#F0DCC8', d: '#7E5A44', x: '#E8A9A0' },
      A: { T: 21, hw: 29, hc: 50, eyeY: 53, eyeDX: 12, eyeScale: 0.82, mouthY: 76, neckY: 78, hb: 79, cheekY: 62, cheekDX: 19, skin: 'l', noMouth: 1, arms: [23, 88] },
      back: [E(33, 20, 6, 11, 'm', { sil: 1, tr: rot(-15, 33, 20) }), E(67, 20, 6, 11, 'm', { sil: 1, tr: rot(15, 67, 20) }), E(33, 21, 3, 7, 'x', { tr: rot(-15, 33, 21) }), E(67, 21, 3, 7, 'x', { tr: rot(15, 67, 21) }), PG('60,96 89,111 58,105', 'd', S)],
      body: [...feet('d'), ...arms('l', 88, 23), torso(), belly('l', 104, 10, 5)],
      natBody: [ST('M36 73 Q32 89 36 106', 'd', 2), ST('M50 71 L50 108', 'd', 2), ST('M64 73 Q68 89 64 106', 'd', 2)],
      head: [C(50, 50, 29, 'l', { sil: 1, grad: 1 }), PA('M21 49 A29 29 0 0 1 79 49 Q50 41 21 49 Z', 'm', { grad: 1 })],
      natHead: [ST('M37 25 Q35 35 37 45', 'd', 1.8), ST('M50 22 L50 42', 'd', 1.8), ST('M63 25 Q65 35 63 45', 'd', 1.8)],
      front: [PA('M42.5 58 Q50 53.5 57.5 58 L53.6 75.5 Q50 79 46.4 75.5 Z', 'm', { op: 0.45 }), C(50, 75.2, 2.7, 'eye')],
      headClip: [C(50, 50, 29)],
    }),
    condor: () => ({
      c: { m: '#2F3447', l: '#FFFFFF', d: '#1E2232', b: '#EDE6D6', x: '#C77B6B', y: '#8C3B3B' },
      A: { T: 20, hw: 27, hc: 47, eyeY: 45, eyeDX: 10, mouthY: 56, neckY: 73, hb: 74, cheekY: 53, cheekDX: 17, beak: 1, skin: 'x', hand: [76, 88], arms: [27, 86] },
      back: [G([E(23, 86, 11, 19, 'm', { sil: 1, tr: rot(18, 23, 86) }), E(24, 91, 5, 11, '#DCE0EE', { tr: rot(18, 24, 91) })], { sil: 1, arm: 'L', piv: [31, 72] }), G([E(77, 86, 11, 19, 'm', { sil: 1, tr: rot(-18, 77, 86) }), E(76, 91, 5, 11, '#DCE0EE', { tr: rot(-18, 76, 91) })], { sil: 1, arm: 'R', piv: [69, 72] }), E(50, 22, 5, 7, 'y', S)],
      body: [...feet('#9AA3AD'), torso()],
      bodyTop: [C(31, 73, 6.5, 'l', S), C(40, 76.5, 6.5, 'l', S), C(50, 77.5, 6.5, 'l', S), C(60, 76.5, 6.5, 'l', S), C(69, 73, 6.5, 'l', S)],
      head: [C(50, 47, 27, 'x', { sil: 1, grad: 1 })],
      front: [PG('44,55 56,55 53,64 50,66 47,64', 'b'), PG('47.6,63 52.4,63 50,66', 'd')],
    }),
    nandu: () => ({
      c: { m: '#B3A595', l: '#E6DED3', d: '#776A5C', b: '#D9B38C' },
      A: { T: 18, hw: 16, hc: 34, eyeY: 32, eyeDX: 6.5, mouthY: 44, neckY: 64, nw: 7, hb: 50, cheekY: 39, cheekDX: 11, cheekR: 2.6, beak: 1, noMouth: 1, body: [88, 27, 17], hand: [76, 88], arms: [23, 88] },
      body: [R(40.5, 98, 4.5, 10, 2, 'b', S), R(55, 98, 4.5, 10, 2, 'b', S), E(41, 109, 6, 3.6, 'b', S), E(59, 109, 6, 3.6, 'b', S), E(26, 88, 7, 12, 'd', { sil: 1, arm: 'L', tr: rot(25, 26, 88) }), E(74, 88, 7, 12, 'd', { sil: 1, arm: 'R', tr: rot(-25, 74, 88) }), E(50, 88, 27, 17, 'm', { sil: 1, grad: 1 })],
      natBody: [ST('M28 90 Q34 96 40 90 Q46 96 52 90 Q58 96 64 90 Q69 95 73 90', 'l', 1.8, { op: 0.7 })],
      bodyTop: [R(43, 40, 14, 42, 7, 'm', S), E(50, 72, 8, 4, 'd', { belly: 1 })],
      head: [C(50, 34, 16, 'm', { sil: 1, grad: 1 })],
      front: [E(50, 42.5, 7, 3.2, 'b')],
      bodyClip: [E(50, 88, 27, 17)],
    }),
    oso: () => ({
      c: { m: '#8B7A6A', l: '#D9CDBF', d: '#2F3447', x: '#FFFFFF' },
      A: { T: 21, hw: 25, hc: 45, eyeY: 41, eyeDX: 11, mouthY: 0, neckY: 72, hb: 69, cheekY: 49, cheekDX: 17, noMouth: 1, neckUnder: 1, arms: [23, 86] },
      back: [E(20, 93, 12, 18, 'm', { sil: 1, tr: rot(-35, 20, 93) }), C(30, 28, 5.5, 'm', S), C(70, 28, 5.5, 'm', S), C(30, 28.5, 2.8, 'l'), C(70, 28.5, 2.8, 'l')],
      body: [...feet('d'), ...arms('m', 86, 23), torso(), belly('l', 97, 11, 8)],
      natBody: [PG('27,83 37,71 77,94 69,105', 'x'), PG('31,81 37,74 74,95 69,101', 'd')],
      head: [E(50, 45, 25, 24, 'm', { sil: 1, grad: 1 })],
      front: [PA('M43 52 L57 52 L54 81 Q50 86 46 81 Z', 'm', S), E(50, 82.5, 3.4, 2.4, 'eye')],
    }),
    vizcacha: () => ({
      c: { m: '#9C958C', l: '#EDE9E3', d: '#2F3447', x: '#D98C8C' },
      A: { T: 18, hw: 32, hc: 48, eyeY: 43, eyeDX: 12, mouthY: 63, neckY: 74, hb: 80, cheekY: 57, cheekDX: 23, arms: [23, 86] },
      back: [E(33, 17, 7, 13, 'm', { sil: 1, tr: rot(-14, 33, 17) }), E(67, 17, 7, 13, 'm', { sil: 1, tr: rot(14, 67, 17) }), E(33, 18, 3.6, 8, '#E3C4BC', { tr: rot(-14, 33, 18) }), E(67, 18, 3.6, 8, '#E3C4BC', { tr: rot(14, 67, 18) })],
      body: [...feet('p'), ...arms('m', 86, 23), torso(), belly()],
      head: [headC()],
      natHead: [R(16, 49, 68, 6.5, 3.2, 'd')],
      front: [E(38, 60, 11, 7.5, 'l'), E(62, 60, 11, 7.5, 'l'), PG('47.5,58 52.5,58 50,61', 'x'), ST('M38 61 L21 59 M38 64 L21 65 M62 61 L79 59 M62 64 L79 65', 'd', 0.9)],
    }),
    perro: () => ({
      c: { m: '#C98C55', l: '#F3DEC8', d: '#8A5A33' },
      A: { T: 16, hw: 32, eyeY: 45, eyeDX: 11, mouthY: 64, neckY: 74, hb: 80, cheekY: 57, cheekDX: 19, arms: [23, 86] },
      back: [ST('M60 102 Q81 103 86 89', 'm', 7.5, S)],
      body: [...feet('p'), ...arms('m', 86, 23), torso(), belly()],
      head: [headC()],
      front: [E(50, 62, 15, 11, 'l'), E(50, 56, 4.6, 3.3, 'eye'), E(20, 47, 8.5, 16, 'd', { sil: 1, tr: rot(16, 20, 47) }), E(80, 47, 8.5, 16, 'd', { sil: 1, tr: rot(-16, 80, 47) })],
    }),
    gato: () => ({
      c: { m: '#8D96AB', l: '#E9ECF2', d: '#5E6680', x: '#F2B8C0' },
      A: { T: 16, hw: 32, eyeY: 47, eyeDX: 11, mouthY: 62, neckY: 74, hb: 80, cheekY: 57, cheekDX: 21, arms: [23, 86] },
      back: [ST('M60 103 Q93 107 88 80', 'm', 7, S), PG('21,37 25,8 45,23', 'm', S), PG('79,37 75,8 55,23', 'm', S), PG('26,31 27.5,15.5 38,24', 'x'), PG('74,31 72.5,15.5 62,24', 'x')],
      body: [...feet('p'), ...arms('m', 86, 23), torso(), belly()],
      head: [headC()],
      natHead: [R(48.8, 17, 2.4, 10, 1.2, 'd'), R(42, 19.5, 2.4, 7.5, 1.2, 'd'), R(55.6, 19.5, 2.4, 7.5, 1.2, 'd')],
      front: [E(44.5, 61, 7, 5.5, 'l'), E(55.5, 61, 7, 5.5, 'l'), PG('47,56.5 53,56.5 50,59.5', 'x'), ST('M36 60 L19 57 M36 63 L19 64 M64 60 L81 57 M64 63 L81 64', 'd', 0.9)],
    }),
  };

  /* ───────────── Options (head / body pieces drawn for the standard head: center 50,48 · r 32 · top 16) ───────────── */
  const HAIR = {
    copete: () => [E(50, 9, 3.4, 8.5, 'd'), E(43.5, 11.5, 3, 7, 'd', { tr: rot(-30, 43.5, 11.5) }), E(56.5, 11.5, 3, 7, 'd', { tr: rot(30, 56.5, 11.5) })],
    jopo: () => [PA('M27 27 Q29 1 58 3 Q75 5 73 18 Q61 9 46 15.5 Q35 20 27 27 Z', 'd')],
    rulos: () => [C(37, 18, 6.5, 'd'), C(45, 12.5, 7, 'd'), C(55, 12.5, 7, 'd'), C(63, 18, 6.5, 'd'), C(50, 18.5, 6.5, 'd')],
    cresta: () => [PG('36,22 39,4 45,16 50,-1 55,16 61,4 64,22', 'd')],
    pluma: () => [PA('M51 17 Q45 2 59 -5 Q61 8 51 17 Z', 'd'), ST('M51 16 Q52 5 58 -3', 'w', 1, { op: 0.6 })],
    flequillo: () => [PA('M23 31 Q28 13.5 50 13.5 Q72 13.5 77 31 Q72 25.5 67.5 31 Q63 25 58.5 31 Q54 25 50 31 Q46 25 41.5 31 Q37 25 32.5 31 Q28 25.5 23 31 Z', 'd')],
  };
  const MARKS = {
    manchas: { head: () => [C(29, 38, 5.5, 'd'), C(69, 28, 3.6, 'd'), C(73, 50, 4.2, 'd')], body: () => [C(37, 92, 4.6, 'd'), C(63, 84, 3.6, 'd'), C(59, 102, 3, 'd')] },
    rayas: { head: () => [R(14, 41, 12, 3, 1.5, 'd'), R(14, 48, 11, 3, 1.5, 'd'), R(74, 41, 12, 3, 1.5, 'd'), R(75, 48, 11, 3, 1.5, 'd')], body: () => [R(25, 81, 12, 3.2, 1.6, 'd'), R(25, 89, 11, 3.2, 1.6, 'd'), R(63, 81, 12, 3.2, 1.6, 'd'), R(64, 89, 11, 3.2, 1.6, 'd')] },
  };
  const HATS = {
    boina: () => [E(50, 20, 26, 7, '#2F2A3A'), C(50, 13, 2.4, '#2F2A3A')],
    gorra: () => [PA('M26 25 A24 14 0 0 1 74 25 Z', '#4F6BFF'), R(50, 21, 32, 6.5, 3.2, '#4F6BFF'), C(50, 11.6, 2, '#3449C9')],
    gorro: () => [PA('M22 28 Q22 3 50 3 Q78 3 78 28 Z', '#FF6B4A'), R(20, 22, 60, 10, 5, '#FFD1C4'), ST('M30 24.5 L30 29.5 M38 24.5 L38 29.5 M46 24.5 L46 29.5 M54 24.5 L54 29.5 M62 24.5 L62 29.5 M70 24.5 L70 29.5', '#F2AE9C', 1.6), C(50, 2, 5.5, '#FFFFFF')],
    vincha: () => [PA('M19 36 Q50 15 81 36 L80 43 Q50 23 20 43 Z', '#FFFFFF'), PA('M19.5 38.4 Q50 18 80.5 38.4 L80.3 40.6 Q50 20.6 19.7 40.6 Z', '#4F6BFF')],
    auriculares: () => [ST('M20 46 Q20 9 50 9 Q80 9 80 46', '#23263A', 4.4), R(12, 37, 11, 20, 5.5, '#4F6BFF'), R(77, 37, 11, 20, 5.5, '#4F6BFF'), R(19.5, 40, 3.5, 14, 1.75, '#23263A'), R(77, 40, 3.5, 14, 1.75, '#23263A')],
    mono: () => [PG('66,20 55,12.5 55,27.5', '#FF7AA2'), PG('66,20 77,12.5 77,27.5', '#FF7AA2'), C(66, 20, 3.4, '#D9557F')],
    sombrero: () => [E(50, 21, 37, 6.8, '#E9C77B'), PA('M33 21.5 Q33 2 50 2 Q67 2 67 21.5 Z', '#E9C77B'), R(33, 14.5, 34, 5, 0, '#C94F2E'), E(50, 23, 30, 3, '#D4A957', { op: 0.55 })],
    corona: () => [PG('34,21 34,11 42,17 50,5 58,17 66,11 66,21', '#FFC53D'), R(34, 18, 32, 3.5, 0, '#E09A1A')],
  };
  const COVERS_HAIR = ['boina', 'gorra', 'gorro', 'sombrero', 'corona'];

  function faceAcc(kind, A, o) {
    const L = 50 - A.eyeDX, Rx = 50 + A.eyeDX, y = A.eyeY;
    const lr = Math.max(4.6, Math.min(7.5, A.eyeDX * 0.72));
    if (kind === 'anteojos') {
      return [G([C(L, y, lr), C(Rx, y, lr), N('path', { d: `M${L + lr} ${y} L${Rx - lr} ${y} M${L - lr} ${y - 1} L${L - lr - 5.5} ${y - 3} M${Rx + lr} ${y - 1} L${Rx + lr + 5.5} ${y - 3}`, fill: 'none' })], { raw: 1, a: { fill: 'rgba(255,255,255,.28)', stroke: '#E8503A', 'stroke-width': 2.2, 'stroke-linecap': 'round' } })];
    }
    if (kind === 'lentes') {
      const lens = (x) => R(x - lr - 0.8, y - lr * 0.78, 2 * lr + 1.6, lr * 1.56, lr * 0.62, '#23263A', { op: 0.94 });
      const shine = (x) => ST(`M${x - lr + 1.6} ${y - lr * 0.25} L${x - lr * 0.15} ${y - lr * 0.5}`, '#FFFFFF', 1, { op: 0.7 });
      return [lens(L), lens(Rx), ST(`M${L + lr} ${y - 1} L${Rx - lr} ${y - 1}`, '#23263A', 1.8), shine(L), shine(Rx)];
    }
    if (kind === 'curita') {
      const cx = 50 + A.cheekDX - 1, cy = A.cheekY - 1;
      return [G([R(cx - 6.5, cy - 2.7, 13, 5.4, 2.7, '#F5D2B5'), R(cx - 2, cy - 2.7, 4, 5.4, 0, '#E3B48C'), C(cx - 4.4, cy - 0.9, 0.55, '#E3B48C'), C(cx + 4.4, cy + 0.9, 0.55, '#E3B48C')], { tr: rot(-28, cx, cy) })];
    }
    if (kind === 'pintura') {
      const pc = (PAL[o.ropaColor] || PAL.azul).m;
      const s = (x) => [R(x - 5, y + 6, 10, 2.4, 1.2, pc), R(x - 5, y + 9.2, 10, 2.4, 1.2, '#FFFFFF')];
      return [...s(L), ...s(Rx)];
    }
    return [];
  }
  function neckAcc(kind, ny) {
    if (kind === 'bufanda') return [R(29, ny - 4, 42, 9, 4.5, '#4F6BFF'), R(58, ny + 3, 10, 16, 4, '#4F6BFF'), G([R(36, ny - 4, 6, 9), R(48, ny - 4, 6, 9), R(58, ny + 10, 10, 3.5)], { raw: 1, a: { fill: 'rgba(255,255,255,.7)' } })];
    if (kind === 'panuelo') return [PG(`34,${ny - 3} 66,${ny - 3} 50,${ny + 12}`, '#FF6B4A'), R(32, ny - 5.5, 36, 5.5, 2.75, '#FF6B4A'), C(45, ny + 1, 1.1, '#FFFFFF', { op: 0.85 }), C(55, ny + 1, 1.1, '#FFFFFF', { op: 0.85 }), C(50, ny + 6, 1.1, '#FFFFFF', { op: 0.85 })];
    if (kind === 'monito') return [PG(`50,${ny + 1} 40,${ny - 5} 40,${ny + 7}`, '#23263A'), PG(`50,${ny + 1} 60,${ny - 5} 60,${ny + 7}`, '#23263A'), C(50, ny + 1, 2.6, '#4B5070')];
    if (kind === 'collar') return [R(30, ny - 2.5, 40, 5.5, 2.75, '#8B6CFF'), C(50, ny + 6.2, 3.9, '#FFC53D'), C(50, ny + 6.2, 1.2, '#D9971A')];
    return [];
  }
  const pent = (cx, cy, r) => Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  function handObj(kind, A, c) {
    const [hx, hy] = A.hand;
    if (kind === 'mate') return [ST(`M${hx + 6} ${hy + 2} L${hx + 12} ${hy - 14}`, '#9AA3AD', 2.2), C(hx + 12, hy - 14.5, 1.6, '#9AA3AD'), E(hx + 6, hy + 9, 6.5, 8, '#8B5A2B'), E(hx + 6, hy + 2, 4.8, 2, '#4C9A5A')];
    if (kind === 'pelota') {
      const cx = hx + 9, cy = hy + 5, p = pent(cx, cy, 2.9);
      const spokes = p.map(([x, y]) => { const dx = x - cx, dy = y - cy, k = 7.6 / 2.9; return `M${x.toFixed(2)} ${y.toFixed(2)} L${(cx + dx * k).toFixed(2)} ${(cy + dy * k).toFixed(2)}`; }).join(' ');
      return [C(cx, cy, 7.8, '#FFFFFF', { s: '#23263A', sw: 1.1 }), PG(p.map((q) => q.map((v) => v.toFixed(2)).join(',')).join(' '), '#23263A'), ST(spokes, '#23263A', 1)];
    }
    if (kind === 'celu') return [R(hx + 3, hy - 11, 9.5, 16.5, 2.4, '#23263A'), R(hx + 4.3, hy - 9.6, 6.9, 12.2, 1.2, '#C9D3FF'), C(hx + 7.75, hy + 3.9, 0.7, '#6C7191')];
    if (kind === 'termo') return [R(hx + 3.5, hy - 17, 8.5, 24, 3, '#22A06B'), R(hx + 4.6, hy - 20.5, 6.3, 4.6, 1.6, '#9AA3B5'), ST(`M${hx + 12} ${hy - 12} Q${hx + 16.5} ${hy - 6} ${hx + 12} ${hy}`, '#1B7F55', 1.8), R(hx + 3.5, hy - 6, 8.5, 2.2, 0, '#1B7F55')];
    if (kind === 'banderin') return [ST(`M${hx + 7} ${hy - 34} L${hx + 5.5} ${hy + 3}`, '#6C7191', 2.1), PG(`${hx + 7},${hy - 34} ${hx + 26},${hy - 28} ${hx + 7},${hy - 22}`, '#4F6BFF'), PG(`${hx + 7},${hy - 30} ${hx + 18},${hy - 28} ${hx + 7},${hy - 26}`, '#FFFFFF')];
    if (kind === 'tubo') {
      const x = hx + 5, top = hy - 30, w = 10, len = 30;
      return [G([R(x, top, w, len, w / 2, '#FFFFFF'), R(x, top + 12, w, len - 12, w / 2, '#2EC4B6'), R(x, top + 12, w, 5, 0, '#2EC4B6'), R(x + 2, top + 3, 2.2, 8, 1.1, '#FFFFFF', { op: 0.9 }), N('rect', { x, y: top, width: w, height: len, rx: w / 2, fill: 'none' }, { s: '#B8BDD6', sw: 1.4 }), R(x - 1.8, top - 2, w + 3.6, 3.6, 1.8, '#B8BDD6')], { tr: rot(14, x + w / 2, top + len / 2), allSil: 1 })];
    }
    if (kind === 'bandera') {
      const cells = [[5, 0], [15, 0], [0, 5], [10, 5], [5, 10], [15, 10]].map(([x, y]) => R(x, y, 5, 5, 0, '#23263A'));
      return [ST(`M${hx + 7} ${hy - 38} L${hx + 5.3} ${hy + 2}`, '#6C7191', 2.2), G([R(0, 0, 20, 15, 0, '#FFFFFF'), ...cells], { tr: `translate(${hx + 7} ${hy - 39})`, allSil: 1 })];
    }
    if (kind === 'rayo') return [PG(`${hx + 12},${hy - 22} ${hx + 3},${hy - 4} ${hx + 10},${hy - 4} ${hx + 6},${hy + 12} ${hx + 19},${hy - 8} ${hx + 12},${hy - 8} ${hx + 17},${hy - 22}`, '#FFC53D')];
    return [];
  }
  function outfit(kind, A, o) {
    const oc = PAL[o.ropaColor] || PAL.azul;
    const caps = (f) => (A.arms ? [E(50 - A.arms[0] + 1.5, A.arms[1] - 5, 7, 6.5, f), E(50 + A.arms[0] - 1.5, A.arms[1] - 5, 7, 6.5, f)] : []);
    const full = (f) => (A.arms ? [E(50 - A.arms[0], A.arms[1], 6.3, 10.3, f, { tr: rot(22, 50 - A.arms[0], A.arms[1]) }), E(50 + A.arms[0], A.arms[1], 6.3, 10.3, f, { tr: rot(-22, 50 + A.arms[0], A.arms[1]) })] : []);
    const base = R(0, 64, 100, 56, 0, oc.m);
    const numColor = lum(oc.m) > 0.62 ? INK : '#FFFFFF';
    const num = N('text', { x: 50, y: 102, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, 'font-family': 'Outfit, system-ui, sans-serif' }, { f: numColor, txt: String(o.numero || '10') });
    if (kind === 'remera') return { body: [base, ST('M41 72 Q50 80 59 72', oc.d, 1.8)], sleeves: caps(oc.m) };
    if (kind === 'camiseta') return { body: [base, R(0, 64, 100, 3.5, 0, '#FFFFFF', { op: 0.85 }), num], sleeves: caps(oc.m) };
    if (kind === 'rayada') return { body: [R(0, 64, 100, 56, 0, '#FFFFFF'), R(29, 64, 8, 56, 0, oc.m), R(46, 64, 8, 56, 0, oc.m), R(63, 64, 8, 56, 0, oc.m)], sleeves: caps('#FFFFFF') };
    if (kind === 'buzo') return { body: [base, R(37, 95, 26, 10, 5, oc.d), ST('M46 79 L45 89 M54 79 L55 89', '#FFFFFF', 1.4)], sleeves: full(oc.m) };
    return null;
  }
  function star(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 4; const rr = i % 2 ? r * 0.38 : r; pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`); }
    return pts.join(' ');
  }

  /* ───────────── Face ───────────── */
  function faceNodes(A, o, c, style) {
    const out = [];
    const sticker = style === 'sticker';
    const face = o.face || 'happy';
    const opt = o.ojos || 'redondos';
    const L = 50 - A.eyeDX, Rx = 50 + A.eyeDX, y = A.eyeY;
    const ink = sticker ? 'ink' : 'eye';
    const skin = A.skin || 'm';
    const marks = o.marcas || 'ninguna';
    // Cheeks first, under everything else of the face.
    const cr = A.cheekR || 4;
    [50 - A.cheekDX, 50 + A.cheekDX].forEach((x) => {
      if (style === 'suave') out.push(C(x, A.cheekY, cr * 1.25, 'blush'));
      else out.push(E(x, A.cheekY, sticker ? cr * 1.1 : cr, sticker ? cr * 0.8 : cr, 'cheek', { op: sticker ? 0.6 : 0.75 }));
    });
    if (marks === 'pecas') [50 - A.cheekDX, 50 + A.cheekDX].forEach((x) => out.push(C(x - 3, A.cheekY, 1.05, 'd', { op: 0.85 }), C(x, A.cheekY - 2.4, 1.05, 'd', { op: 0.85 }), C(x + 3, A.cheekY, 1.05, 'd', { op: 0.85 })));
    if (marks === 'antifaz') out.push(R(L - 8, y - 5.8, 2 * A.eyeDX + 16, 11.6, 5.8, 'd'));
    if (marks === 'parche') out.push(C(L, y, 7.8, 'd'));
    let r = (style === 'suave' ? 4.1 : style === 'sticker' ? 3.2 : 3.7) * (opt === 'grandes' ? 1.28 : opt === 'brillo' ? 1.12 : 1) * (face === 'wow' ? 1.12 : 1);
    if (A.eyeDX < 8) r *= 0.78;
    if (A.eyeScale) r *= A.eyeScale;
    const whites = A.eyeWhite || sticker || marks === 'antifaz' || (marks === 'parche');
    const arc = (x, up) => ST(up ? `M${x - 4} ${y + 1.5} Q${x} ${y - 4} ${x + 4} ${y + 1.5}` : `M${x - 4} ${y - 1} Q${x} ${y + 3.5} ${x + 4} ${y - 1}`, ink, sticker ? 2.8 : 2.4);
    const open = (x, side) => {
      const g = [];
      const sw = A.eyeWhite && !sticker ? 6.2 : null;
      const white = whites && (sticker || A.eyeWhite || marks === 'antifaz' || (marks === 'parche' && side < 0));
      if (sw) g.push(C(x, y, sw, 'w'));
      else if (white) g.push(E(x, y, r + 1.7, r + 2.1, 'w', sticker ? { s: 'ink', sw: 0.9 } : {}));
      if (A.eyeRing) g.push(RING(x, y, r + (white ? 2.8 : 1.7), A.eyeRing, 1.6));
      const py = sticker ? y + 0.6 : y;
      if (opt === 'almendra') g.push(E(x, py + 0.2, r * 1.2, r * 0.8, ink));
      else g.push(C(x, py, r, ink));
      const hx = x + r * 0.36, hy = py - r * 0.4;
      if (opt === 'brillo') g.push(PG(star(hx, hy, r * 0.6), 'w'), C(x - r * 0.38, py + r * 0.42, r * 0.17, 'w'));
      else {
        g.push(C(hx, hy, r * (opt === 'grandes' ? 0.36 : 0.3), 'w'));
        if (opt === 'grandes' || style === 'suave') g.push(C(x - r * 0.34, py + r * 0.4, r * 0.15, 'w'));
      }
      if (opt === 'dormilon') {
        const rr = (white ? r + 2.2 : r + 1.2);
        g.push(PA(`M${x - rr} ${y - 0.2} A${rr} ${rr} 0 0 1 ${x + rr} ${y - 0.2} Z`, white && !sw ? skin : skin), ST(`M${x - rr} ${y - 0.2} L${x + rr} ${y - 0.2}`, ink, 1.5));
      }
      if (opt === 'pestanas') {
        g.push(ST(`M${x + side * r * 0.5} ${y - r * 0.85} L${x + side * (r + 1.7)} ${y - r - 1.7} M${x + side * r * 0.95} ${y - r * 0.3} L${x + side * (r + 2.9)} ${y - r * 0.6} M${x} ${y - r} L${x + side * 0.7} ${y - r - 2.4}`, ink, 1.3));
      }
      if (sticker) g.push(ST(`M${x - 3.6} ${y - r - (face === 'wow' ? 6.2 : 4.6)} Q${x} ${y - r - (face === 'wow' ? 8.6 : 6.8)} ${x + 3.6} ${y - r - (face === 'wow' ? 6.2 : 4.6)}`, 'ink', 1.7));
      return g;
    };
    if (face === 'joy') out.push(arc(L, true), arc(Rx, true));
    else if (face === 'sleep') out.push(arc(L, false), arc(Rx, false));
    else if (face === 'wink') out.push(...open(L, -1), arc(Rx, true));
    else out.push(...open(L, -1), ...open(Rx, 1));
    // Mouth
    const mY = A.mouthY, mw = A.mouthW || 4;
    if (!A.noMouth) {
      if (!A.beak) {
        if (face === 'wow') out.push(E(50, mY + 2, 3.6, 4.8, ink), E(50, mY + 4.2, 2.2, 1.8, 'tongue'));
        else if (face === 'joy') out.push(PA(`M${50 - mw - 3} ${mY - 1} Q50 ${mY + 9 + mw * 0.4} ${50 + mw + 3} ${mY - 1} Z`, ink), PA(`M${50 - mw * 0.8} ${mY + 3} Q50 ${mY + 6.5} ${50 + mw * 0.8} ${mY + 3} Z`, 'tongue'));
        else if (face === 'sleep') out.push(C(50, mY + 1, 1.8, ink));
        else out.push(ST(`M${50 - mw} ${mY} Q50 ${mY + 4 + (mw > 5 ? 3 : 0)} ${50 + mw} ${mY}`, ink, sticker ? 2.2 : 2));
      } else if (face === 'joy' || face === 'wow') out.push(PA(`M44 ${mY + 5} Q50 ${mY + 13} 56 ${mY + 5} Z`, ink));
    }
    return out;
  }

  /* ───────────── Render ───────────── */
  let UID = 0;
  function h(tag, attrs, ...kids) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, String(attrs[k]));
    for (const k of kids.flat()) if (k) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
    return e;
  }

  function draw(o0) {
    let o = o0;
    const spec = (SP[o.sp] || SP.nioqui)();
    const A = Object.assign({ skin: 'm', hand: [73, 86], cheekR: 4, nw: 21, body: [89, 22, 19] }, spec.A);
    if (A.hc === undefined) A.hc = A.T + A.hw;
    const style = ['fiel', 'suave', 'sticker', 'linea'].includes(o.estilo) ? o.estilo : 'fiel';
    const pose = o.pose || 'quieto';
    if (pose === 'dormido') o = Object.assign({}, o, { face: 'sleep' });
    if (['festejo', 'salto', 'corona'].includes(pose) && !o.face) o = Object.assign({}, o, { face: 'joy' });
    // Hugging the crown: it is in the arms, so not on the head, and the hand is busy.
    if (pose === 'corona') o = Object.assign({}, o, { corona: false, mano: undefined, prop: undefined });
    const up = pose === 'festejo' || pose === 'salto';
    const raise = (n) => {
      if (!n.arm || (pose === 'saludo' && n.arm !== 'L')) return n;
      const sd = n.arm === 'L' ? -1 : 1;
      if (n.t === 'g') return Object.assign({}, n, { tr: rot(-sd * 135, n.piv[0], n.piv[1]) });
      const cx = n.a.cx + sd * 6, cy = n.a.cy - 17;
      return Object.assign({}, n, { a: Object.assign({}, n.a, { cx, cy }), tr: rot(sd * 30, cx, cy) });
    };
    if (up || pose === 'saludo') {
      spec.body = (spec.body || []).map(raise);
      spec.back = (spec.back || []).map(raise);
      if (up) A.hand = [A.hand[0] + 5, A.hand[1] - 30];
    }
    let hug = null;
    if (pose === 'corona') {
      const cy = A.hugY || A.body[0] + 4;
      const arms = [...(spec.body || []), ...(spec.back || [])].filter((n) => n.arm).map((n) => {
        const sd = n.arm === 'L' ? -1 : 1;
        if (n.t === 'g') return Object.assign({}, n, { tr: rot(sd * 18, n.piv[0], n.piv[1]) });
        const cx = 50 + sd * 16, ay = cy + 3;
        return Object.assign({}, n, { a: Object.assign({}, n.a, { cx, cy: ay, rx: 6, ry: 10 }), tr: rot(sd * 40, cx, ay) });
      });
      spec.body = (spec.body || []).filter((n) => !n.arm);
      spec.back = (spec.back || []).filter((n) => !n.arm);
      hug = [
        PG(`32,${cy + 5} 32,${cy - 9} 41,${cy - 1} 50,${cy - 15} 59,${cy - 1} 68,${cy - 9} 68,${cy + 5}`, '#FFC53D', S),
        C(32, cy - 9, 1.9, '#FFC53D', S), C(50, cy - 15, 2.1, '#FFC53D', S), C(68, cy - 9, 1.9, '#FFC53D', S),
        R(31, cy + 3, 38, 9, 3, '#FFC53D', S), R(31, cy + 3, 38, 2.8, 0, '#E09A1A'),
        C(50, cy - 4, 2.6, '#FF6B4A'), C(41, cy + 7.6, 1.7, '#4F6BFF'), C(59, cy + 7.6, 1.7, '#3ECF8E'), C(50, cy + 7.6, 1.7, '#FF7AA2'),
        ...arms,
      ];
    }
    const turn = o.vista === 'tres' ? (o.mirar === 'izq' ? -1 : 1) : 0;
    if (turn) A.eyeDX -= 1.6;
    const shiftX = (k, dx) => (turn ? G(k, { tr: `translate(${(dx * turn).toFixed(2)} 0)` }) : G(k, {}));
    const uid = 'pj' + ++UID;
    const base = spec.c;
    const c = Object.assign({}, base, PAL[o.color] || {});
    if (!PAL[o.color] || !PAL[o.color].b) c.b = base.b;
    if (o.detalle && o.detalle !== 'igual') c.d = o.detalle === 'natural' ? base.d : (PAL[o.detalle] || {}).m || c.d;
    c.p = mix(c.l, c.m, 0.45); // paws: a step darker than the light tone, so they read on white too
    const TOK = { eye: EYE, cheek: CHEEK, ink: INK, w: '#FFFFFF', tongue: TONGUE };
    const col = (t) => (t === undefined ? undefined : t[0] === '#' || t.startsWith('rgba') ? t : t === 'blush' ? `url(#${uid}-blush)` : c[t] || TOK[t] || t);
    const defs = [];
    const grads = {};
    const grad = (t) => {
      const v = col(t);
      if (!v || v[0] !== '#') return v;
      if (!grads[t]) {
        const id = `${uid}-g-${t.replace(/[^a-z0-9]/gi, '')}`;
        grads[t] = id;
        defs.push(h('radialGradient', { id, cx: '0.36', cy: '0.3', r: '0.85' }, h('stop', { offset: '0', 'stop-color': mix(v, '#FFFFFF', 0.34) }), h('stop', { offset: '0.55', 'stop-color': v }), h('stop', { offset: '1', 'stop-color': mix(v, '#23263A', 0.16) })));
      }
      return `url(#${grads[t]})`;
    };
    if (style === 'suave') defs.push(h('radialGradient', { id: `${uid}-blush` }, h('stop', { offset: '0', 'stop-color': CHEEK, 'stop-opacity': '0.85' }), h('stop', { offset: '1', 'stop-color': CHEEK, 'stop-opacity': '0' })));

    function el(n, mode, inh) {
      if (!n) return null;
      if (n.t === 'g') {
        const ga = mode === 'color' && n.raw ? Object.assign({}, n.a) : {};
        if (n.tr) ga.transform = n.tr;
        if (n.clip && mode === 'color') ga['clip-path'] = `url(#${uid}-${n.clip})`;
        if (n.op !== undefined && mode === 'color') ga.opacity = n.op;
        const g = h('g', ga);
        for (const k of n.k) {
          if (mode !== 'color' && mode !== 'clip' && !(k.sil || n.allSil || k.t === 'g')) continue;
          const e = el(k, mode, inh || n.allSil);
          if (e) g.appendChild(e);
        }
        return g;
      }
      if (n.t === 'text') return mode === 'color' ? h('text', Object.assign({}, n.a, { fill: col(n.f) }), n.txt) : null;
      const a = Object.assign({}, n.a);
      if (n.tr) a.transform = n.tr;
      if (mode === 'clip') {
        if (a.fill === 'none') return null;
        delete a.fill;
        return h(n.t, a);
      }
      if (mode === 'color') {
        if (n.f !== undefined) a.fill = n.grad && style === 'suave' ? grad(n.f) : col(n.f);
        if (n.s !== undefined) a.stroke = col(n.s);
        if (n.sw !== undefined) a['stroke-width'] = n.sw;
        if (n.a2) a['stroke-linejoin'] = 'round';
        if (n.op !== undefined) a.opacity = n.op;
        if (style === 'linea' && (n.sil || inh) && n.f !== undefined && n.a.fill !== 'none' && n.t !== 'text') {
          const fc = col(n.f);
          if (fc && fc[0] === '#') { a.stroke = mix(fc, INK, 0.42); a['stroke-width'] = (n.sw || 0) + 1.5; a['stroke-linejoin'] = 'round'; }
        }
      } else {
        const W = mode === 'outline' ? 4.6 : 10;
        const k = mode === 'outline' ? INK : '#FFFFFF';
        const filled = n.f !== undefined && n.a.fill !== 'none';
        a.fill = filled ? k : 'none';
        a.stroke = k;
        a['stroke-width'] = (n.sw || 0) + W;
        a['stroke-linejoin'] = 'round';
        a['stroke-linecap'] = 'round';
        delete a.opacity;
      }
      return h(n.t, a);
    }

    const fit = o.ropa && o.ropa !== 'nada' ? outfit(o.ropa, A, o) : null;
    const headXf = `translate(50 ${A.hc}) scale(${(A.hw / 32).toFixed(3)}) translate(-50 -48)`;
    const [bcy, brx, bry] = A.body;
    const bodyXf = `translate(50 ${bcy}) scale(${(brx / 22).toFixed(3)} ${(bry / 19).toFixed(3)}) translate(-50 -89)`;
    const accXf = `translate(50 ${A.T}) scale(${(A.hw / 32).toFixed(3)}) translate(-50 -16)`;
    const ns = Math.max(0.6, Math.min(1, A.nw / 21));
    const neckXf = `translate(50 ${A.neckY}) scale(${ns.toFixed(3)}) translate(-50 ${-A.neckY})`;
    const cabeza = o.corona ? 'corona' : o.cabeza && o.cabeza !== 'nada' ? o.cabeza : null;
    const hideHair = cabeza && COVERS_HAIR.includes(cabeza) && o.pelo !== 'flequillo';
    const hair = !hideHair && HAIR[o.pelo] ? shiftX([G(HAIR[o.pelo](), { tr: accXf, allSil: 1, sil: 1 })], 2.5) : null;
    const hat = cabeza && HATS[cabeza] ? shiftX([G(HATS[cabeza](), { tr: accXf, allSil: 1, sil: 1 })], 2.5) : null;
    const faceA = o.cara && o.cara !== 'nada' ? G(faceAcc(o.cara, A, o), {}) : null;
    const neck = o.cuello && o.cuello !== 'nada' ? shiftX([G(neckAcc(o.cuello, A.neckY), { tr: neckXf, allSil: 1, sil: 1 })], 2.5) : null;
    const hand = o.mano && o.mano !== 'nada' ? G(handObj(o.mano, A, c), { allSil: 1, sil: 1 }) : null;
    const prop = o.prop ? G(handObj(o.prop, A, c), { allSil: 1, sil: 1 }) : null;
    const marks = MARKS[o.marcas];

    const shadeBody = style === 'fiel'
      ? [E(50, A.hb + 1.5, A.hw * 0.52, 3.6, 'ink', { op: 0.08 })]
      : style === 'suave'
        ? [E(50, A.hb + 1, A.hw * 0.62, 5.5, 'ink', { op: 0.13 }), E(50 - brx * 0.45, bcy - bry * 0.32, brx * 0.24, bry * 0.15, 'w', { op: 0.18 })]
        : [E(50 + brx * 0.55, bcy + bry * 0.6, brx * 0.9, bry * 0.62, 'ink', { op: 0.1 })];
    const shadeHead = style === 'suave'
      ? [E(50 - A.hw * 0.36, A.hc - A.hw * 0.52, A.hw * 0.3, A.hw * 0.17, 'w', { op: 0.32, tr: rot(-28, 50 - A.hw * 0.36, A.hc - A.hw * 0.52) })]
      : style === 'sticker' || style === 'linea' ? [E(50 + A.hw * 0.5, A.hc + A.hw * 0.56, A.hw * 0.95, A.hw * 0.7, 'ink', { op: style === 'linea' ? 0.07 : 0.09 })] : [];

    const bodyN = (spec.body || []).filter((n) => !(fit && n.belly)).map((n) => (turn && n.belly ? Object.assign({}, n, { a: Object.assign({}, n.a, { cx: n.a.cx + 3 * turn }) }) : n));
    const frontN = (spec.front || []).filter((n) => !(fit && n.belly));
    const bodyOver = G([
      shiftX([...(spec.natBody || []), marks ? G(marks.body(), { tr: bodyXf }) : null, fit ? G(fit.body, { tr: bodyXf }) : null], 2.5),
      ...shadeBody,
    ], { clip: 'body' });
    const armNodes = bodyN.filter((n) => n.arm);
    const sleeveList = fit && o.ropa === 'buzo' && armNodes.length
      ? armNodes.map((n) => Object.assign({}, n, { f: (PAL[o.ropaColor] || PAL.azul).m, grad: 0, a: Object.assign({}, n.a, { rx: n.a.rx + 0.3, ry: n.a.ry + 0.3 }) }))
      : fit ? fit.sleeves : [];
    const sleeves = sleeveList.length ? G(sleeveList, { sil: 1, allSil: 1 }) : null;
    const headOver = G([...(spec.natHead || []), marks ? G(marks.head(), { tr: headXf }) : null, ...shadeHead], { clip: 'head' });
    const tilt = { festejo: -5, salto: -4, saludo: 4, dormido: 7, corona: 5 }[pose] || 0;
    const headTr = [style === 'sticker' ? `translate(50 ${A.hb}) scale(1.06) translate(-50 ${-A.hb})` : '', tilt ? rot(tilt, 50, A.hb) : ''].join(' ').trim();
    const headG = G([...spec.head.filter((n) => !n.mv), shiftX(spec.head.filter((n) => n.mv), 5.5), headOver, shiftX([...frontN, ...faceNodes(A, o, c, style), faceA], 5.5), hair, hat], { tr: headTr || undefined });
    const bodyTopN = (spec.bodyTop || []).filter((n) => !(fit && n.belly));
    // Long snouts (oso) hang in front of whatever is worn on the neck.
    const hugG = hug ? G(hug, { sil: 1, allSil: 1 }) : null;
    const all = [...(spec.back || []), ...bodyN, ...(!fit && spec.deco ? spec.deco : []), bodyOver, sleeves, ...bodyTopN, A.neckUnder ? neck : null, A.neckUnder ? hugG : null, headG, A.neckUnder ? null : neck, A.neckUnder ? null : hugG, hand, prop].filter(Boolean);

    const layer = (mode) => {
      const g = h('g', {});
      for (const n of all) {
        if (mode !== 'color' && !(n.sil || n.t === 'g')) continue;
        const e = el(n, mode);
        if (e) g.appendChild(e);
      }
      return g;
    };
    const kids = [];
    const shadow = style === 'suave' ? E(50, 116.5, 27, 4, 'ink', { op: 0.13 }) : style === 'sticker' ? E(50, 117, 25, 3.6, 'ink', { op: 0.16 }) : E(50, 116, 24, 3.5, 'ink', { op: 0.1 });
    const framed = o.marco === 'circulo';
    const ring = framed ? { top: A.T - 12, s: A.neckY + 24 - (A.T - 12) } : null;
    if (framed) {
      const cy = ring.top + ring.s / 2, r = ring.s / 2 - 1;
      const bg = (PAL[o.fondo] || { l: '#E6EAFF' }).l;
      kids.push(h('circle', { cx: 50, cy, r, fill: bg }));
      defs.push(h('clipPath', { id: `${uid}-marco` }, h('circle', { cx: 50, cy, r }), h('rect', { x: 50 - ring.s, y: ring.top - 30, width: 2 * ring.s, height: ring.s / 2 + 30 })));
    } else kids.push(el(pose === 'salto' ? E(50, 116, 16, 2.6, 'ink', { op: 0.07 }) : shadow, 'color'));
    const body = h('g', framed ? { 'clip-path': `url(#${uid}-marco)` } : pose === 'salto' ? { transform: 'translate(0 -10)' } : {});
    if (style === 'sticker') { body.appendChild(layer('border')); body.appendChild(layer('outline')); }
    body.appendChild(layer('color'));
    kids.push(body);
    const headClip = spec.headClip || spec.head.filter((n) => n.sil && n.a.fill !== 'none' && n.t !== 'path');
    const bodyClip = spec.bodyClip || [E(50, 89, 22, 19)];
    defs.push(h('clipPath', { id: `${uid}-head` }, headClip.map((n) => el(n, 'clip'))));
    defs.push(h('clipPath', { id: `${uid}-body` }, bodyClip.map((n) => el(n, 'clip'))));

    const size = o.size || 120;
    let vb = '0 0 100 120';
    let hgt = size * 1.2;
    if (ring) {
      vb = `${(50 - ring.s / 2).toFixed(1)} ${ring.top.toFixed(1)} ${ring.s.toFixed(1)} ${ring.s.toFixed(1)}`;
      hgt = size;
    } else if (o.crop === 'head' || o.crop === 'bust') {
      const top = A.T - 15;
      const bottom = o.crop === 'bust' ? A.neckY + 16 : A.hc + A.hw + 6;
      const s = Math.max(bottom - top, 2 * A.hw + 22);
      vb = `${(50 - s / 2).toFixed(1)} ${(top - (s - (bottom - top)) / 2).toFixed(1)} ${s.toFixed(1)} ${s.toFixed(1)}`;
      hgt = size;
    }
    const svg = h('svg', { viewBox: vb, width: size, height: hgt, 'aria-hidden': o.title ? undefined : 'true', role: o.title ? 'img' : undefined, 'aria-label': o.title }, h('defs', {}, ...defs), ...kids);
    svg.style.display = 'block';
    svg.style.overflow = 'visible';
    if (o.anim === 'float') svg.style.animation = 'float 4s ease-in-out infinite';
    if (o.anim === 'bob') svg.style.animation = 'bob 3.2s ease-in-out infinite';
    return svg;
  }

  const ATTRS = ['sp', 'estilo', 'size', 'color', 'detalle', 'ojos', 'pelo', 'marcas', 'ropa', 'ropa-color', 'numero', 'cabeza', 'cara', 'cuello', 'mano', 'prop', 'face', 'crop', 'anim', 'corona', 'title', 'pose', 'vista', 'mirar', 'marco', 'fondo'];
  const QUEUE = new Set();
  let pumping = false;
  const idle = (f) => (window.requestIdleCallback ? window.requestIdleCallback(f, { timeout: 120 }) : setTimeout(f, 16));
  function pump() {
    if (pumping) return;
    pumping = true;
    const step = () => {
      let n = 0;
      for (const el of QUEUE) {
        QUEUE.delete(el);
        if (el.isConnected) el.render();
        if (++n >= 16) break;
      }
      if (QUEUE.size) idle(step);
      else pumping = false;
    };
    idle(step);
  }
  class EmPj extends HTMLElement {
    static get observedAttributes() { return ATTRS; }
    connectedCallback() { this.schedule(); }
    attributeChangedCallback() { this.schedule(); }
    schedule() {
      // Reserve the box right away, draw in idle chunks: a page with hundreds of characters loads at once.
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      if (!this._st) { this._st = document.createElement('style'); root.appendChild(this._st); }
      if (!this._img) {
        const size = Number(this.getAttribute('size')) || 120;
        const sq = this.getAttribute('crop') || this.getAttribute('marco') === 'circulo';
        this._st.textContent = `:host{display:block;line-height:0;width:${size}px;height:${sq ? size : size * 1.2}px}`;
      }
      QUEUE.add(this);
      pump();
    }
    render() {
      const v = (n) => { const x = this.getAttribute(n); return x === null || x === '' || x === 'undefined' ? undefined : x; };
      const o = { sp: v('sp'), estilo: v('estilo'), size: Number(v('size')) || 120, color: v('color'), detalle: v('detalle'), ojos: v('ojos'), pelo: v('pelo'), marcas: v('marcas'), ropa: v('ropa'), ropaColor: v('ropa-color'), numero: v('numero'), cabeza: v('cabeza'), cara: v('cara'), cuello: v('cuello'), mano: v('mano'), prop: v('prop'), face: v('face'), crop: v('crop'), anim: v('anim'), corona: v('corona') === 'true', title: v('title'), pose: v('pose'), vista: v('vista'), mirar: v('mirar'), marco: v('marco'), fondo: v('fondo') };
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      let svg;
      try { svg = draw(o); } catch (err) { console.warn('em-pj', o.sp, err); return; }
      // One <img> per character: cheap for the page (no big SVG tree in the DOM) and screenshot-friendly.
      const W = Number(svg.getAttribute('width')), H = Number(svg.getAttribute('height'));
      const anim = svg.style.animation;
      svg.removeAttribute('style');
      svg.setAttribute('xmlns', NS);
      // Pad the viewBox so tails, hats and the sticker border never get cut at the image edge.
      const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
      const p = vw * 0.14;
      svg.setAttribute('viewBox', `${vx - p} ${vy - p} ${vw + 2 * p} ${vh + 2 * p}`);
      const IW = W * (vw + 2 * p) / vw, IH = H * (vh + 2 * p) / vh;
      svg.setAttribute('width', IW.toFixed(2));
      svg.setAttribute('height', IH.toFixed(2));
      const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
      let img = this._img;
      if (!img) {
        img = this._img = document.createElement('img');
        img.draggable = false;
        img.decoding = 'async';
        if (!this._st) this._st = document.createElement('style');
        root.replaceChildren(this._st, img);
      }
      this._st.textContent = `:host{display:block;line-height:0;width:${W}px;height:${H}px}img{display:block;pointer-events:none;margin:${(-(IH - H) / 2).toFixed(2)}px ${(-(IW - W) / 2).toFixed(2)}px}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`;
      img.alt = o.title || '';
      img.width = IW;
      img.height = IH;
      img.style.animation = anim || '';
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    }
  }
  if (!customElements.get('em-pj')) customElements.define('em-pj', EmPj);
  function toSVG(o) {
    const svg = draw(Object.assign({ size: 200 }, o));
    svg.removeAttribute('style');
    svg.setAttribute('xmlns', NS);
    const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
    const p = vw * 0.14;
    const W = Number(svg.getAttribute('width')), H = Number(svg.getAttribute('height'));
    svg.setAttribute('viewBox', [vx - p, vy - p, vw + 2 * p, vh + 2 * p].map((v) => +v.toFixed(2)).join(' '));
    svg.setAttribute('width', Math.round((W * (vw + 2 * p)) / vw));
    svg.setAttribute('height', Math.round((H * (vh + 2 * p)) / vh));
    return new XMLSerializer().serializeToString(svg);
  }
  window.EmPersonajes = { draw, toSVG, species: Object.keys(SP) };
})();
