"use client";

import {
  AVATAR_COLORS,
  AVATAR_EYES,
  AVATAR_FACEWEAR,
  AVATAR_HAIR,
  AVATAR_HEADWEAR,
  AVATAR_HELD,
  AVATAR_MARKS,
  AVATAR_NECKWEAR,
  AVATAR_NUMBER,
  AVATAR_OUTFITS,
  AVATAR_PALETTE_COLORS,
  AVATAR_SPECIES,
  avatarWear,
  avatarWithZones,
  type Article,
  type Avatar,
  type AvatarHeadwear,
} from "@repo/shared";
import { Shuffle, Undo2 } from "lucide-react";
import { memo, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Personaje, SPECIES, type Crop } from "@/components/personaje/Personaje";
import {
  AVATAR_PALETTE,
  COLOR_NAMES,
  OPTION_NAMES,
  SHORT_NAMES,
  SPECIES_NAMES,
  avatarLook,
  randomAvatar,
  swatchColor,
  type AvatarLook,
} from "@/components/personaje/avatar";
import { BADGE_BACKGROUND } from "@/components/personaje/palette";
import { COVERS_HAIR } from "@/components/personaje/pieces";
import { RankingRow } from "@/components/ranking/Ranking";
import { Cloud } from "@/components/ui/Cloud";
import { cx } from "@/components/ui/cx";

/*
 * The character editor (design 18, "1a · Vitrina fija", docs/diseno/handoff-editor):
 * the character stays on the blue card, and a white drawer below scrolls
 * through every option, each one drawn on the player's own character.
 */

export interface EditorState {
  avatar: Avatar;
  /** "El / La Mejor de…": on the card only when editing. */
  article: Article | null;
}

/** Taps on the same control closer than this go back as one change (the number). */
const BURST_MS = 300;

/** What the player can change, with the defaults spelled out: two states that look the same have the same key. */
function stateKey({ avatar, article }: EditorState): string {
  const wear = avatarWear(avatar);
  return [
    avatar.species,
    avatar.color,
    avatar.detail ?? "",
    avatar.eyes ?? AVATAR_EYES[0],
    avatar.hair ?? "",
    avatar.marks ?? "",
    avatar.outfit ?? "",
    avatar.outfitColor ?? "azul",
    avatar.number ?? AVATAR_NUMBER.fallback,
    wear.head ?? "",
    wear.face ?? "",
    wear.neck ?? "",
    wear.hand ?? "",
    avatar.background ?? "",
    article ?? "",
  ].join("|");
}

/** The editor's state and "Deshacer": each change keeps the state before it, for as long as the screen is open. */
export function useEditorHistory(initial: () => EditorState) {
  const [history, setHistory] = useState(() => ({ now: initial(), past: [] as EditorState[], burst: null as { key: string; at: number } | null }));
  return {
    state: history.now,
    canUndo: history.past.length > 0,
    /** `burst` names a control tapped many times in a row: until it rests, it's one change. False if nothing changed. */
    change(next: EditorState, burst?: string): boolean {
      if (stateKey(next) === stateKey(history.now)) return false;
      const at = Date.now();
      setHistory((current) => {
        const joined = burst !== undefined && current.burst?.key === burst && at - current.burst.at < BURST_MS;
        return { now: next, past: joined ? current.past : [...current.past, current.now], burst: burst === undefined ? null : { key: burst, at } };
      });
      return true;
    },
    /** Goes back one change, and says to what. */
    undo(): EditorState | null {
      const previous = history.past.at(-1);
      if (!previous) return null;
      setHistory((current) => ({ now: current.past.at(-1) ?? current.now, past: current.past.slice(0, -1), burst: null }));
      return previous;
    },
  };
}

interface CharacterEditorProps {
  state: EditorState;
  onChange: (next: EditorState, burst?: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  /** Editing: the apodo, and El / La, go on the card. */
  name?: string;
  /** Creating: «Seguir», fixed over the bottom of the drawer. */
  footer?: ReactNode;
}

/** The card and the drawer: they fill what's left of the screen below the header (a `Screen` with `fill`). */
export function CharacterEditor({ state, onChange, onUndo, canUndo, name, footer }: CharacterEditorProps) {
  const [hops, setHops] = useState(0);
  const [spins, setSpins] = useState(0);
  const avatar = useMemo(() => avatarWithZones(state.avatar), [state.avatar]);
  // The cells draw the change a moment later: the card and the ring of the chosen cell answer the tap first.
  const drawn = useDeferredValue(avatar);
  // The same function on every render, so the parts that didn't change aren't drawn again.
  const latest = useRef({ state, avatar, onChange });
  useLayoutEffect(() => {
    latest.current = { state, avatar, onChange };
  });
  const [set] = useState<SetAvatar>(() => (changes: Partial<Avatar>, burst?: string) => {
    const { state: now, avatar: current, onChange: change } = latest.current;
    change({ ...now, avatar: { ...current, ...changes } }, burst);
    setHops((count) => count + 1);
  });

  return (
    <>
      <Card
        avatar={avatar}
        name={name}
        article={state.article}
        onArticle={(article) => onChange({ ...state, article })}
        hops={hops}
        spins={spins}
        onRandom={() => {
          onChange({ ...state, avatar: randomAvatar(avatar.species) });
          setHops((count) => count + 1);
          setSpins((count) => count + 1);
        }}
        onUndo={() => {
          onUndo();
          setHops((count) => count + 1);
        }}
        canUndo={canUndo}
      />
      <Drawer groups={PARTS.map(({ name: part, Part }) => ({ name: part, content: <Part avatar={avatar} drawn={drawn} set={set} name={name} /> }))} footer={footer} />
    </>
  );
}

/* ───────────── The card ───────────── */

interface CardProps {
  avatar: Avatar;
  name?: string;
  article: Article | null;
  onArticle: (article: Article) => void;
  hops: number;
  spins: number;
  onRandom: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

/** Alternating between two equal animations restarts them on every change. */
const again = (count: number, first: string, second: string) => (count === 0 ? undefined : count % 2 ? first : second);

/** The blue card: it never scrolls, so the character is always in view. */
function Card({ avatar, name, article, onArticle, hops, spins, onRandom, onUndo, canUndo }: CardProps) {
  const pill = "bg-white/22 transition active:scale-[.97]";
  return (
    <div className="relative mx-5 mt-3.5 flex h-[206px] shrink-0 items-end justify-between overflow-hidden rounded-hero bg-hero-brand pr-2 pl-[18px] text-white shadow-hero short:h-[168px]">
      <span aria-hidden className="absolute inset-0 bg-hero-glow" />
      {/* Narrower phones: a smaller cloud, so it doesn't go under Deshacer (it's see-through). */}
      <Cloud className="-right-[34px] -bottom-[34px] w-[210px] opacity-95 max-[380px]:w-[178px]" />
      <div className={cx("relative flex min-w-0 flex-col justify-center self-stretch", name === undefined ? "gap-4 short:gap-3" : "gap-3 short:gap-2.5")}>
        {name === undefined ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-[.06em] text-white/85">Tu personaje</p>
            <h1 className="mt-1.5 font-display text-[27px] leading-[1.05] font-extrabold tracking-[-.02em] short:text-2xl">
              Así te van
              <br />a ver
            </h1>
          </div>
        ) : (
          <>
            <h1 className={cx("font-display leading-none font-extrabold tracking-[-.02em] [overflow-wrap:anywhere]", name.length > 10 ? "text-[22px]" : "text-[30px]")}>
              {name}
            </h1>
            <ArticleSwitch value={article} onChange={onArticle} />
          </>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onRandom} className={cx("inline-flex h-11 items-center gap-[7px] rounded-full pr-[15px] pl-[13px] text-[13px] font-extrabold", pill)}>
            <Shuffle aria-hidden className={cx("size-4", again(spins, "animate-half-turn", "animate-half-turn-again"))} strokeWidth={2.6} />
            Al azar
          </button>
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Deshacer" className={cx("grid size-11 place-items-center rounded-full disabled:opacity-45", pill)}>
            <Undo2 aria-hidden className="size-[17px]" strokeWidth={2.6} />
          </button>
        </div>
      </div>
      <div className="relative flex h-[186px] w-[150px] shrink-0 items-end justify-center short:h-[154px] short:w-[124px]">
        <div className={cx("origin-bottom", again(hops, "animate-hop", "animate-hop-again"))}>
          <Personaje
            {...avatarLook(avatar)}
            size={150}
            anim="bob"
            className="short:h-[149px] short:w-[124px]"
            title={name ? `El personaje de ${name}` : "Tu personaje"}
          />
        </div>
      </div>
    </div>
  );
}

/** "El / La" on the card, next to "Mejor de…", so it reads as the crown says it. */
function ArticleSwitch({ value, onChange }: { value: Article | null; onChange: (article: Article) => void }) {
  return (
    <div className="flex items-center gap-[7px]">
      <div role="radiogroup" aria-label="Cómo te nombramos" className="flex rounded-full bg-white/22 p-[3px]">
        {(["el", "la"] as const).map((article) => (
          <label key={article} className="cursor-pointer">
            <input type="radio" name="article" className="peer sr-only" checked={value === article} onChange={() => onChange(article)} />
            <span
              className={cx(
                "grid h-[38px] place-items-center rounded-full px-3 font-display text-sm font-extrabold transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white",
                value === article ? "bg-white text-brand" : "text-white",
              )}
            >
              {article === "el" ? "El" : "La"}
            </span>
          </label>
        ))}
      </div>
      <span className="font-display text-sm font-extrabold whitespace-nowrap">Mejor de…</span>
    </div>
  );
}

/* ───────────── The drawer ───────────── */

interface Group {
  name: string;
  content: ReactNode;
}

/** The drawer's list starts this far below its top edge: a tapped tab leaves its title there. */
const LIST_TOP = 16;

/** Keeps the tabs from following the scroll for `ms` (a tapped tab's scroll would make them flicker). */
function holdFor(hold: RefObject<number | null>, ms: number) {
  if (hold.current !== null) window.clearTimeout(hold.current);
  hold.current = window.setTimeout(() => {
    hold.current = null;
  }, ms);
}

/** The white drawer: fixed tabs, and every option in one list that scrolls on its own. */
function Drawer({ groups, footer }: { groups: Group[]; footer?: ReactNode }) {
  const listRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<(HTMLElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const barRef = useRef<HTMLSpanElement>(null);
  /** While a tapped tab scrolls the list, the tabs don't follow it. */
  const hold = useRef<number | null>(null);
  const [active, setActive] = useState(0);

  // The tab of the part that crosses the top of the list; at the very bottom, the last one.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const follow = () => {
      frame = 0;
      const line = list.scrollTop + LIST_TOP + 8;
      let index = 0;
      groupRefs.current.forEach((group, i) => {
        if (group && group.offsetTop <= line) index = i;
      });
      if (list.scrollTop > 0 && list.scrollTop + list.clientHeight >= list.scrollHeight - 4) index = groupRefs.current.length - 1;
      setActive(index);
    };
    const onScroll = () => {
      if (hold.current !== null) {
        holdFor(hold, 150);
        return;
      }
      if (!frame) frame = window.requestAnimationFrame(follow);
    };
    // The player taking over stops the tapped tab's scroll from holding the tabs.
    const release = () => {
      if (hold.current !== null) window.clearTimeout(hold.current);
      hold.current = null;
    };
    list.addEventListener("scroll", onScroll, { passive: true });
    list.addEventListener("touchstart", release, { passive: true });
    list.addEventListener("wheel", release, { passive: true });
    return () => {
      list.removeEventListener("scroll", onScroll);
      list.removeEventListener("touchstart", release);
      list.removeEventListener("wheel", release);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  // The blue pill goes to the active tab (and follows it if the font changes its width).
  useLayoutEffect(() => {
    const bar = barRef.current;
    const place = () => {
      const tab = tabRefs.current[active];
      if (!bar || !tab) return;
      bar.style.width = `${tab.offsetWidth}px`;
      bar.style.transform = `translateX(${tab.offsetLeft - 4}px)`;
    };
    place();
    const frame = window.requestAnimationFrame(() => bar?.setAttribute("data-ready", ""));
    const observer = new ResizeObserver(place);
    for (const tab of tabRefs.current) if (tab) observer.observe(tab);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active]);

  const go = (index: number) => {
    const list = listRef.current;
    const group = groupRefs.current[index];
    if (!list || !group) return;
    setActive(index);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    holdFor(hold, still ? 100 : 900);
    list.scrollTo({ top: index === 0 ? 0 : group.offsetTop - LIST_TOP, behavior: still ? "instant" : "smooth" });
  };

  return (
    <div className="relative mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-10px_30px_rgba(35,38,58,.08)] short:mt-2.5">
      <nav aria-label="Partes del personaje" className="px-3.5 pt-3.5">
        <div className="relative flex rounded-full bg-surface-2 p-1">
          <span
            ref={barRef}
            aria-hidden
            className="absolute inset-y-1 left-1 rounded-full bg-brand shadow-[0_6px_14px_rgba(79,107,255,.35)] data-ready:transition-[transform,width] data-ready:duration-200 data-ready:ease-out"
          />
          {groups.map((group, index) => (
            <button
              key={group.name}
              ref={(tab) => {
                tabRefs.current[index] = tab;
              }}
              type="button"
              aria-current={index === active ? "true" : undefined}
              onClick={() => go(index)}
              className={cx(
                // 36 px, and 44 to the touch with the bar's padding.
                "relative flex h-9 flex-auto items-center justify-center rounded-full px-1.5 text-[13px] whitespace-nowrap transition-colors duration-200 before:absolute before:inset-x-0 before:-inset-y-1",
                index === active ? "font-extrabold text-white" : "font-bold text-ink-500",
              )}
            >
              {group.name}
            </button>
          ))}
        </div>
      </nav>
      <div
        ref={listRef}
        className={cx(
          "relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4",
          footer ? "pb-[calc(env(safe-area-inset-bottom)+120px)]" : "pb-[calc(env(safe-area-inset-bottom)+44px)]",
        )}
      >
        {groups.map((group, index) => (
          <section
            key={group.name}
            ref={(section) => {
              groupRefs.current[index] = section;
            }}
            aria-label={group.name}
          >
            {index > 0 && (
              <h2 aria-hidden className="mt-[22px] border-t border-line pt-[18px] pb-0.5 font-display text-[17px] font-extrabold tracking-[-.01em]">
                {group.name}
              </h2>
            )}
            {group.content}
          </section>
        ))}
      </div>
      {footer ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0,#fff_32px)] px-5 pt-8 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <div className="pointer-events-auto">{footer}</div>
        </div>
      ) : (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0),#fff_70%)]" />
      )}
    </div>
  );
}

/* ───────────── The sections ───────────── */

/** One section: its name on the left and what's chosen on the right, in brand blue. `spacing` is the room above it. */
function Section({ legend, value, spacing, gap = "mt-2.5", children }: { legend: string; value?: string; spacing: string; gap?: string; children: ReactNode }) {
  return (
    <div className={spacing}>
      <fieldset className="min-w-0">
        <legend className="sr-only">{legend}</legend>
        <div aria-hidden className="flex items-baseline justify-between gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[.06em] text-ink-500">{legend}</span>
          {value && <span className="text-xs font-extrabold text-brand">{value}</span>}
        </div>
        <div className={gap}>{children}</div>
      </fieldset>
    </div>
  );
}

/** Opens and closes in 200 ms, without jumps: a grid row from 0 to its content's height. */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div inert={!open} className={cx("grid transition-[grid-template-rows,margin-bottom] duration-200 ease-out", open ? "-mb-2 grid-rows-[1fr]" : "grid-rows-[0fr]")}>
      <div className="-mx-2 min-h-0 overflow-hidden">
        {/* Room for the selection rings, which go outside the cells. */}
        <div className="px-2 pb-2">{children}</div>
      </div>
    </div>
  );
}

/** A cell's character: drawn again only when what it shows changes (about 90 of them change with the species). */
const Picture = memo(
  function Picture({ look, size, crop, className }: { look: AvatarLook; size: number; crop?: Crop; className?: string; drawn: string }) {
    return <Personaje {...look} size={size} crop={crop} className={className} />;
  },
  (before, after) => before.drawn === after.drawn && before.size === after.size && before.crop === after.crop && before.className === after.className,
);

const picture = (look: AvatarLook, size: number, crop?: Crop) => (
  // The crops shrink on short screens, with their cells.
  <Picture look={look} drawn={JSON.stringify(look)} size={size} crop={crop} className={crop ? "short:size-14" : undefined} />
);

interface Option<T> {
  value: T;
  /** What screen readers say, and the section shows when it's chosen. */
  label: string;
  /** Under the cell, when the name doesn't fit. */
  caption?: string;
}

/** Cells that show the player's character with each option (hidden radios, as in `Choices`). */
function Cells<T extends string | null>({
  group,
  options,
  value,
  onChange,
  columns,
  height,
  draw,
}: {
  group: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  columns: 4 | 5;
  height: string;
  draw: (value: T) => ReactNode;
}) {
  return (
    <div className={cx("grid gap-2", columns === 5 ? "grid-cols-5" : "grid-cols-4")}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label key={String(option.value)} className="flex min-w-0 cursor-pointer flex-col items-center gap-[3px]">
            <input type="radio" name={group} className="peer sr-only" checked={selected} onChange={() => onChange(option.value)} aria-label={option.label} />
            <span
              className={cx(
                "grid w-full place-items-center overflow-hidden rounded-row transition-[background-color,box-shadow] duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                height,
                selected ? "bg-brand-100 shadow-[0_0_0_2px_var(--color-brand)]" : "bg-surface-2",
              )}
            >
              {draw(option.value)}
            </span>
            <span className={cx("max-w-full truncate text-[10px] leading-tight", selected ? "font-extrabold text-brand" : "font-bold text-ink-500")}>
              {option.caption ?? option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Round color swatches (34 px). `spread`: eight across the whole width; if not, 13 px apart. */
function Swatches<T extends string | null>({
  group,
  options,
  value,
  onChange,
  spread,
}: {
  group: string;
  options: readonly (Option<T> & { fill: string })[];
  value: T;
  onChange: (value: T) => void;
  spread: boolean;
}) {
  return (
    <div className={cx("flex justify-between px-1", !spread && "max-w-[324px]")}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          // 44 px to the touch.
          <label key={String(option.value)} className="relative cursor-pointer before:absolute before:-inset-[5px]">
            <input type="radio" name={group} className="peer sr-only" checked={selected} onChange={() => onChange(option.value)} aria-label={option.label} />
            <span
              className={cx(
                "block size-[34px] rounded-full transition-shadow duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[7px] peer-focus-visible:outline-brand",
                selected ? "shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--color-brand)]" : "shadow-[inset_0_0_0_1px_rgba(35,38,58,.1)]",
              )}
              style={{ background: option.fill }}
            />
          </label>
        );
      })}
    </div>
  );
}

/** The shirt's number: − and + in a gray pill. */
function NumberStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const button =
    "grid size-10 place-items-center rounded-full bg-white font-display text-[22px] leading-none font-extrabold shadow-[0_4px_10px_rgba(35,38,58,.08)] transition active:scale-95 disabled:opacity-45";
  const step = (by: number) => onChange(Math.min(AVATAR_NUMBER.max, Math.max(AVATAR_NUMBER.min, value + by)));
  return (
    <div className="flex items-center gap-3.5">
      <div className="flex h-12 items-center gap-1 rounded-full bg-surface-2 p-1">
        <button type="button" aria-label="Uno menos" disabled={value <= AVATAR_NUMBER.min} onClick={() => step(-1)} className={button}>
          −
        </button>
        <output aria-live="polite" className="w-[46px] text-center font-display text-[22px] font-extrabold tabular-nums">
          {value}
        </output>
        <button type="button" aria-label="Uno más" disabled={value >= AVATAR_NUMBER.max} onClick={() => step(1)} className={button}>
          +
        </button>
      </div>
      <p className="text-xs leading-[1.4] font-semibold text-ink-500">
        Del {AVATAR_NUMBER.min} al {AVATAR_NUMBER.max}.
        <br />
        Solo con la camiseta.
      </p>
    </div>
  );
}

/** The hats that hide the hair, with their article: «La boina tapa el pelo.» */
const HATS: Partial<Record<AvatarHeadwear, string>> = { boina: "la boina", gorra: "la gorra", gorro: "el gorro", sombrero: "el sombrero" };

/** "La boina tapa el pelo", with a button to take it off. It keeps the last hat while it closes. */
function HatNotice({ hat, onTakeOff }: { hat: AvatarHeadwear | null; onTakeOff: () => void }) {
  const covering = hat !== null && COVERS_HAIR.includes(hat) ? hat : null;
  const [shown, setShown] = useState(covering);
  if (covering && covering !== shown) setShown(covering);
  const name = shown ? (HATS[shown] ?? OPTION_NAMES.head[shown].toLowerCase()) : "";
  return (
    <Collapse open={covering !== null}>
      <div className="flex items-center gap-2.5 rounded-key bg-gold-soft py-1.5 pr-1.5 pl-3">
        <p className="flex-1 text-[12.5px] leading-[1.35] font-bold text-gold-ink">{`${name.charAt(0).toUpperCase()}${name.slice(1)} tapa el pelo.`}</p>
        <button type="button" onClick={onTakeOff} className="flex h-[34px] shrink-0 items-center rounded-full bg-white px-[13px] text-xs font-extrabold shadow-[0_4px_10px_rgba(35,38,58,.06)] transition active:scale-95">
          Sacar {name}
        </button>
      </div>
      <div className="h-2.5" />
    </Collapse>
  );
}

const nameOr = (name: string | undefined, nothing = "Nada") => name ?? nothing;
const withNothing = <T extends string>(values: readonly T[], names: Record<T, string>, nothing = "Nada"): Option<T | null>[] => [
  { value: null, label: nothing },
  ...values.map((value) => ({ value, label: names[value], caption: (SHORT_NAMES as Partial<Record<string, string>>)[value] })),
];

const CROP_CELL = "h-[76px] short:h-[68px]";

type SetAvatar = (changes: Partial<Avatar>, burst?: string) => void;

interface PartProps {
  avatar: Avatar;
  /** What the cells draw: the character, a moment late (see `useDeferredValue` in CharacterEditor). */
  drawn: Avatar;
  set: SetAvatar;
  name?: string;
}

/** A part draws again only when the fields it shows change, or the cells' character: picking a hair leaves the other four alone. */
const sameFor =
  (fields: readonly (keyof Avatar)[]) =>
  (before: PartProps, after: PartProps): boolean =>
    before.drawn === after.drawn && before.set === after.set && before.name === after.name && fields.every((field) => before.avatar[field] === after.avatar[field]);

const look = (drawn: Avatar, changes: Partial<Avatar>) => avatarLook({ ...drawn, ...changes });
const palette = (fill: (color: (typeof AVATAR_PALETTE_COLORS)[number]) => string) =>
  AVATAR_PALETTE_COLORS.map((color) => ({ value: color, label: COLOR_NAMES[color], fill: fill(color) }));

const BichoPart = memo(function BichoPart({ avatar, drawn, set }: PartProps) {
  const body = avatar.color === "natural" ? SPECIES[avatar.species].c : AVATAR_PALETTE[avatar.color];
  return (
    <>
      <Section legend="Elegí tu bicho" value={SPECIES_NAMES[avatar.species]} spacing="">
        <Cells
          group="editor-species"
          options={AVATAR_SPECIES.map((species) => ({ value: species, label: SPECIES_NAMES[species], caption: SHORT_NAMES[species] }))}
          value={avatar.species}
          onChange={(species) => set({ species })}
          columns={5}
          height="h-[58px]"
          // Each species alone, in your colors (pantallas/05).
          draw={(species) => picture(avatarLook({ species, color: drawn.color, detail: drawn.detail, accessory: null }), 40)}
        />
      </Section>
      <Section legend="Color del cuerpo" value={COLOR_NAMES[avatar.color]} spacing="pt-[22px]" gap="mt-3">
        <Swatches
          group="editor-color"
          options={AVATAR_COLORS.map((color) => ({ value: color, label: COLOR_NAMES[color], fill: swatchColor(color, avatar.species) }))}
          value={avatar.color}
          onChange={(color) => set({ color })}
          spread
        />
      </Section>
      <Section legend="Color de detalle" value={avatar.detail ? COLOR_NAMES[avatar.detail] : "Igual"} spacing="pt-[22px]" gap="mt-3">
        <Swatches
          group="editor-detail"
          options={[
            { value: null, label: "Igual al cuerpo", fill: `linear-gradient(135deg, ${body.main} 50%, ${body.dark} 50%)` },
            ...palette((color) => AVATAR_PALETTE[color].main),
          ]}
          value={avatar.detail ?? null}
          onChange={(detail) => set({ detail })}
          spread
        />
      </Section>
    </>
  );
}, sameFor(["species", "color", "detail"]));

const CaraPart = memo(function CaraPart({ avatar, drawn, set }: PartProps) {
  return (
    <>
      <Section legend="Ojos" value={OPTION_NAMES.eyes[avatar.eyes ?? AVATAR_EYES[0]]} spacing="pt-3">
        <Cells
          group="editor-eyes"
          options={AVATAR_EYES.map((eyes) => ({ value: eyes, label: OPTION_NAMES.eyes[eyes] }))}
          value={avatar.eyes ?? AVATAR_EYES[0]}
          onChange={(eyes) => set({ eyes })}
          columns={4}
          height={CROP_CELL}
          draw={(eyes) => picture(look(drawn, { eyes, face: null }), 62, "head")}
        />
      </Section>
      <Section legend="Pelo" value={nameOr(avatar.hair ? OPTION_NAMES.hair[avatar.hair] : undefined)} spacing="pt-[22px]">
        <HatNotice hat={avatar.head ?? null} onTakeOff={() => set({ head: null })} />
        <Cells
          group="editor-hair"
          options={withNothing(AVATAR_HAIR, OPTION_NAMES.hair)}
          value={avatar.hair ?? null}
          onChange={(hair) => set({ hair })}
          columns={4}
          height={CROP_CELL}
          draw={(hair) => picture(look(drawn, { hair, head: null }), 62, "head")}
        />
      </Section>
      <Section legend="Marcas" value={nameOr(avatar.marks ? OPTION_NAMES.marks[avatar.marks] : undefined, "Ninguna")} spacing="pt-[22px]">
        <Cells
          group="editor-marks"
          options={withNothing(AVATAR_MARKS, OPTION_NAMES.marks, "Ninguna")}
          value={avatar.marks ?? null}
          onChange={(marks) => set({ marks })}
          columns={4}
          height={CROP_CELL}
          draw={(marks) => picture(look(drawn, { marks }), 62, "bust")}
        />
      </Section>
    </>
  );
}, sameFor(["eyes", "hair", "marks", "head"]));

const RopaPart = memo(function RopaPart({ avatar, drawn, set }: PartProps) {
  const outfitColor = avatar.outfitColor ?? "azul";
  const number = avatar.number ?? AVATAR_NUMBER.fallback;
  return (
    <>
      <Section legend="Ropa" value={nameOr(avatar.outfit ? OPTION_NAMES.outfit[avatar.outfit] : undefined)} spacing="pt-3">
        <Cells
          group="editor-outfit"
          options={withNothing(AVATAR_OUTFITS, OPTION_NAMES.outfit)}
          value={avatar.outfit ?? null}
          onChange={(outfit) => set({ outfit })}
          columns={5}
          height="h-[68px]"
          draw={(outfit) => picture(look(drawn, { outfit, hand: null }), 46)}
        />
      </Section>
      {/* The face paint uses the clothes' color too. */}
      <Collapse open={avatar.outfit != null || avatar.face === "pintura"}>
        <Section legend="Color de la ropa" value={COLOR_NAMES[outfitColor]} spacing="pt-[22px]" gap="mt-3">
          <Swatches
            group="editor-outfit-color"
            options={palette((color) => AVATAR_PALETTE[color].main)}
            value={outfitColor}
            onChange={(color) => set({ outfitColor: color })}
            spread={false}
          />
        </Section>
      </Collapse>
      <Collapse open={avatar.outfit === "camiseta"}>
        <Section legend="Número" value={String(number)} spacing="pt-[22px]">
          <NumberStepper value={number} onChange={(value) => set({ number: value }, "number")} />
        </Section>
      </Collapse>
    </>
  );
}, sameFor(["outfit", "outfitColor", "number", "face"]));

const AccesoriosPart = memo(function AccesoriosPart({ avatar, drawn, set }: PartProps) {
  const { head, face, neck, hand } = avatarWear(avatar);
  return (
    <>
      <Section legend="Cabeza" value={nameOr(head ? OPTION_NAMES.head[head] : undefined)} spacing="pt-3">
        <Cells
          group="editor-head"
          options={withNothing(AVATAR_HEADWEAR, OPTION_NAMES.head)}
          value={head}
          onChange={(value) => set({ head: value })}
          columns={4}
          height={CROP_CELL}
          draw={(value) => picture(look(drawn, { head: value }), 62, "head")}
        />
      </Section>
      <Section legend="Cara" value={nameOr(face ? OPTION_NAMES.face[face] : undefined)} spacing="pt-[22px]">
        <Cells
          group="editor-face"
          options={withNothing(AVATAR_FACEWEAR, OPTION_NAMES.face)}
          value={face}
          onChange={(value) => set({ face: value })}
          columns={4}
          height={CROP_CELL}
          draw={(value) => picture(look(drawn, { face: value }), 62, "head")}
        />
      </Section>
      <Section legend="Cuello" value={nameOr(neck ? OPTION_NAMES.neck[neck] : undefined)} spacing="pt-[22px]">
        <Cells
          group="editor-neck"
          options={withNothing(AVATAR_NECKWEAR, OPTION_NAMES.neck)}
          value={neck}
          onChange={(value) => set({ neck: value })}
          columns={4}
          height={CROP_CELL}
          draw={(value) => picture(look(drawn, { neck: value }), 62, "bust")}
        />
      </Section>
      <Section legend="Mano" value={nameOr(hand ? OPTION_NAMES.hand[hand] : undefined)} spacing="pt-[22px]">
        <Cells
          group="editor-hand"
          options={withNothing(AVATAR_HELD, OPTION_NAMES.hand)}
          value={hand}
          onChange={(value) => set({ hand: value })}
          columns={4}
          height={CROP_CELL}
          draw={(value) => picture(look(drawn, { hand: value }), 50)}
        />
      </Section>
    </>
  );
}, sameFor(["head", "face", "neck", "hand"]));

const FondoPart = memo(function FondoPart({ avatar, drawn, set, name }: PartProps) {
  return (
    <>
      <Section legend="Fondo del avatar" value={avatar.background ? COLOR_NAMES[avatar.background] : "Celeste"} spacing="pt-3" gap="mt-3">
        <Swatches
          group="editor-background"
          options={[{ value: null, label: "Celeste", fill: BADGE_BACKGROUND }, ...palette((color) => AVATAR_PALETTE[color].light)]}
          value={avatar.background ?? null}
          onChange={(background) => set({ background: background ?? undefined })}
          spread
        />
      </Section>
      <Section legend="Así te ven en el ranking" spacing="pt-[22px]">
        <ul aria-label="Una fila de ejemplo" className="rounded-[20px] bg-[linear-gradient(180deg,#dae1f6_0%,#e8eaf6_100%)] p-2.5">
          <RankingRow position={2} player={{ key: "vos", name: name ?? "Tu apodo", avatar: drawn, score: 2310, isMe: true }} />
        </ul>
      </Section>
    </>
  );
}, sameFor(["background"]));

/** The five parts of the drawer, in the design's order (pantallas/05). */
const PARTS = [
  { name: "Bicho", Part: BichoPart },
  { name: "Cara", Part: CaraPart },
  { name: "Ropa", Part: RopaPart },
  { name: "Accesorios", Part: AccesoriosPart },
  { name: "Fondo", Part: FondoPart },
] as const;
