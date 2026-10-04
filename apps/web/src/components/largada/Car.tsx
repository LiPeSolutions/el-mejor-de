import type { Avatar } from "@repo/shared";
import { useId } from "react";
import { Personaje, SPECIES } from "@/components/personaje/Personaje";
import { AVATAR_PALETTE, avatarLook } from "@/components/personaje/avatar";

/*
 * Largada's car and helmet, drawn from the design (docs/diseno/handoff-largada/
 * assets): the base car in the team's color, with the player's animal looking
 * out of the helmet's visor. Both are SVG groups at their own origin: the car
 * is 302 × 82 with the nose at x = 302, the helmet 36.4 × 25.4.
 */

export const CAR = { width: 302, height: 82 } as const;

export interface CarColors {
  main: string;
  dark: string;
  /** The highlight line along the body. */
  light: string;
}

/** The ghost car, for the best of the day of a place. */
export const GHOST_COLORS: CarColors = { main: "#999EAC", dark: "#7D818D", light: "#C4CBDD" };

/** The team's color is the character's color. */
export function carColors(avatar: Avatar): CarColors {
  // The penguin's and the cóndor's own colors are almost the asphalt's: their cars take the beak's and the head's.
  if (avatar.color === "natural" && avatar.species === "pinguino") return { main: "#F5A623", dark: "#C27C0E", light: "#FFD58A" };
  if (avatar.color === "natural" && avatar.species === "condor") return { main: "#C77B6B", dark: "#9A5548", light: "#EBB9AE" };
  const c = avatar.color === "natural" ? SPECIES[avatar.species].c : AVATAR_PALETTE[avatar.color];
  return { main: c.main, dark: c.dark, light: c.light };
}

const WHITE = "#F4F5FB";
const INK = "#23263A";

/** The animal's eyes, cropped to the visor; the ghost's are generic. */
function Visor({ avatar }: { avatar: Avatar | null }) {
  const clip = useId();
  if (!avatar) {
    return (
      <>
        <rect x="8.2" y="12.6" width="22.7" height="9.2" rx="1.6" fill="#B3B9CA" />
        <rect x="7.3" y="10.4" width="24" height="2.9" rx="1.2" fill="#9FA4B3" />
        <rect x="9.4" y="11.1" width="4.6" height="0.9" rx="0.45" fill="#FFFFFF" fillOpacity="0.55" />
        <ellipse cx="16" cy="17.7" rx="1.25" ry="1.6" fill={INK} />
        <circle cx="16.42" cy="17.1" r="0.45" fill="#FFFFFF" />
        <ellipse cx="24.8" cy="17.7" rx="1.25" ry="1.6" fill={INK} />
        <circle cx="25.22" cy="17.1" r="0.45" fill="#FFFFFF" />
        <path d="M14.2,14.9 L17.4,15.4 M23,14.9 L26.2,15.4" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
      </>
    );
  }
  const look = avatarLook(avatar);
  const eyeY = SPECIES[avatar.species].eyeY;
  return (
    <>
      <clipPath id={clip}>
        <rect x="7.3" y="10.2" width="24" height="12" rx="2.6" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x="7.3" y="10.2" width="24" height="12" fill="#E8EEFB" />
        {/* The helmet covers the head and the neck; only the face looks out. */}
        <Personaje {...look} head={null} hair={null} neck={null} hand={null} frame={{ x: 7.3, y: 10.2, width: 24, height: 12, viewBox: `22 ${eyeY - 12} 56 28` }} />
        <rect x="8.6" y="11.2" width="5" height="1" rx="0.5" fill="#FFFFFF" fillOpacity="0.6" />
      </g>
    </>
  );
}

/** The helmet, at its own origin. */
export function HelmetShape({ colors, avatar }: { colors: CarColors; avatar: Avatar | null }) {
  return (
    <>
      <path d="M0,25.4 L0,18.2 C0,8.15 8.15,0 18.2,0 C28.25,0 36.4,8.15 36.4,18.2 L36.4,25.4 Z" fill={colors.main} />
      <path d="M4,23 L4,18.2 A14.2,14.2 0 0 1 29.08,9.07" fill="none" stroke={WHITE} strokeWidth="3" strokeLinejoin="round" />
      <Visor avatar={avatar} />
      <rect x="0.2" y="22.8" width="36.4" height="2.8" rx="1.3" fill={WHITE} />
    </>
  );
}

/** The helmet on its own, e.g. in the grid's boxes. */
export function Helmet({ avatar, width = 38 }: { avatar: Avatar | null; width?: number }) {
  return (
    <svg viewBox="-1 -1 38.4 27.6" width={width} height={(width * 27.6) / 38.4} aria-hidden className="block shrink-0">
      <HelmetShape colors={avatar ? carColors(avatar) : GHOST_COLORS} avatar={avatar} />
    </svg>
  );
}

/** The car, at its own origin (302 × 82, nose at x = 302). */
export function CarShape({ colors, avatar, number }: { colors: CarColors; avatar: Avatar | null; number: number | null }) {
  return (
    <>
      {/* Rear wing. */}
      <path
        d="M14.2,4.4 L38.4,4.4 Q39.4,4.4 39.4,5.4 L39.4,13.4 C37.4,14.6 35.6,16.8 35.3,19.6 C35,22.4 36.6,24.4 38.8,25.4 L41.5,28 L28,47 L20.5,44.4 L1.8,34.6 Q0.7,34 0.7,32.8 L0.7,15.2 Q0.7,13.6 2.3,13.6 L4.6,13.6 C8.7,13.6 11.2,11.9 12.3,8.8 C13.1,6.6 13.2,4.4 14.2,4.4 Z"
        fill={colors.dark}
      />
      <path
        d="M14.2,4.4 L38.4,4.4 Q39.4,4.4 39.4,5.4 L39.4,13.4 C37.4,14.6 35.6,16.8 35.3,19.6 C35,22.4 36.6,24.4 38.8,25.4 L41.5,28 L28,44 L21.4,41.4 L1.8,31.6 Q0.7,31 0.7,29.8 L0.7,15.2 Q0.7,13.6 2.3,13.6 L4.6,13.6 C8.7,13.6 11.2,11.9 12.3,8.8 C13.1,6.6 13.2,4.4 14.2,4.4 Z"
        fill={colors.main}
      />
      <path d="M1.4,31.4 L21.4,41.4" fill="none" stroke={WHITE} strokeWidth="1.4" strokeLinecap="round" />
      <g transform="translate(125,7.6)">
        <HelmetShape colors={colors} avatar={avatar} />
      </g>
      {/* Body. */}
      <path
        d="M55,31.2 L96.6,11.3 C98.6,10.3 100.6,9.7 103,9.5 L120.6,8.3 C122.6,8.2 123.9,9.3 124,11.1 C124.1,13.4 122.2,14.9 120.6,16.4 C119.2,17.8 119,19.6 120.4,21 C122.4,22.9 123.6,24.4 123.6,27 L123.6,32.8 L159.5,32.5 C163.8,32.3 166.8,30.2 169.8,28.6 C171.8,27.6 173.8,27.3 176.6,27.4 L190,28.3 L200,29.8 L212,32.3 L247,39.2 L260,43.5 L270,46.7 L280,50.2 L290,54.1 C294,55.6 296.6,56.8 298.2,58 C299.6,59.1 299.4,60.6 298.2,61.5 L296.4,63.2 L284,62.4 L268,62 L265,64 L264.5,71.2 L246,71.2 L234,64 L207,73 L66,72.5 Z"
        fill={colors.main}
      />
      <path
        d="M86.6,52.3 C100,50 118,47.6 136,46.6 L183.6,46.6 C186.3,46.6 188,48.3 188,51 L188,64 L176,70 L171,77.8 L86.4,77.8 C84.6,77.8 83.5,76.7 83.5,74.9 L83.5,55.4 C83.5,53.7 84.8,52.6 86.6,52.3 Z"
        fill={colors.dark}
      />
      <path d="M187,46.6 L204.5,46.6 L222,58 L207,73 L194,73 L194,63.8 L187,63.8 Z" fill={colors.dark} />
      <path d="M238,51 L251,53.4 L296.2,62.9 L296.4,63.2 L284,62.4 L268,62 L265,64 L264.5,71.2 L246,71.2 L234,64 Z" fill={colors.dark} />
      <path d="M167,77.8 C171.6,76.6 174.4,70.4 177.4,66.4 C178.6,64.8 180,63.8 182,63.8 L192.8,63.8 C194,63.8 194.8,64.6 194.9,65.8 L195.3,72.4 L197.6,72.4 L197.6,77.8 Z" fill={colors.dark} />
      <path
        d="M268.5,59.2 C264.5,59.2 262.3,61.5 262.3,65.5 L262.3,70 C262.3,73.8 264.4,75.8 268,75.8 L293.8,76.2 C295.4,76.2 296.2,75.2 296.4,73.8 L297.2,70.4 L300.5,67.2 C301.2,66.5 301,65.6 300.1,65.1 L297,63.3 C296,62.8 295.2,62.6 294.2,62.5 Z"
        fill={WHITE}
      />
      <path d="M86.2,52.4 C100,50.1 118,47.7 136,46.7 L204,46.7 M251,53.4 L294.5,62.6" fill="none" stroke={WHITE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M154.5,57.1 L133.6,57.1 C129.9,57.1 127.6,59.1 127.6,61.7 C127.6,64.4 129.9,66.3 133.6,66.3 L146.5,66.5" fill="none" stroke={colors.main} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M186,31 L200,32.8 L212,35.3 L247,42.4 L260,46.6 L270,49.8 L285.5,55.3" fill="none" stroke={colors.light} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="125.2" y="30.4" width="36.4" height="2.8" rx="1.3" fill={WHITE} />
      {/* Mirror and steering wheel. */}
      <path
        d="M180.6,22.3 C181.4,21.3 183.2,20.9 185.4,21 C188.4,21.2 191.2,22.6 193.6,24.6 C195.3,26 196.6,27.6 197.4,29.6 L192.2,29.8 C191.4,28.2 190.4,26.6 188.8,25.6 C187.4,24.7 185.6,24.4 183.2,24.4 C181.6,24.4 180.4,24 180.2,23.4 C180.1,23 180.3,22.6 180.6,22.3 Z"
        fill={INK}
      />
      <path
        d="M110.2,6 C108.6,6 108.6,4.4 109.8,3.7 L113.4,1.6 C114.2,1.1 115.2,0.8 116.2,0.7 L120.4,0.3 C121.1,0.3 121.6,0.7 121.6,1.4 L121.6,4.1 C121.6,4.7 121.1,5.1 120.5,5.1 L116.7,5.3 L116.7,9.4 L114.1,9.4 L114.1,5.6 Z"
        fill={INK}
      />
      {number !== null && (
        <text x="24.4" y="22.9" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#FFFFFF" className="font-display">
          {number}
        </text>
      )}
      <Wheel cx={47.5} cy={53.5} r={28.5} />
      <Wheel cx={226} cy={57} r={25} />
    </>
  );
}

/** A wheel with its rim: hub and six bolts. */
function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const rim = r * 0.6;
  const bolt = r * 0.14;
  const ring = r * 0.27;
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={INK} />
      <circle cx={cx} cy={cy} r={rim} fill={WHITE} />
      <circle cx={cx} cy={cy} r={r * 0.19} fill={INK} />
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <circle key={angle} cx={cx + ring * Math.cos((angle * Math.PI) / 180)} cy={cy + ring * Math.sin((angle * Math.PI) / 180)} r={bolt} fill={INK} />
      ))}
    </>
  );
}
