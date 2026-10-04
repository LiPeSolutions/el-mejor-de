import type { CSSProperties, ReactNode } from "react";
import { Cloud } from "./Cloud";
import { cx } from "./cx";

export type Backdrop = "sky" | "ink" | "reflejos" | "festejo";

const BACKDROPS: Record<Backdrop, string> = {
  sky: "bg-sky text-ink",
  ink: "bg-ink text-white",
  reflejos: "bg-reflejos text-ink",
  festejo: "bg-festejo text-white",
};

interface ScreenProps {
  children: ReactNode;
  /** One className per cloud, e.g. "-left-[50px] top-[200px] w-40 opacity-95". */
  clouds?: readonly string[];
  backdrop?: Backdrop;
  /** Leaves room for the floating bottom nav. */
  nav?: boolean;
  /** On tablets, a column up to 760 px instead of the phone's 430 (Tubitos' board). */
  wide?: boolean;
  /** Exactly the screen's height, without room at the bottom: the content scrolls inside (the character editor). */
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Phone-first page: a centered 430 px column with the sky background and clouds. */
export function Screen({ children, clouds = [], backdrop = "sky", nav = false, wide = false, fill = false, className, style }: ScreenProps) {
  return (
    <main
      className={cx(
        "relative mx-auto flex w-full max-w-[430px] flex-col overflow-hidden",
        fill ? "h-dvh" : "min-h-dvh",
        wide && "md:max-w-[760px]",
        BACKDROPS[backdrop],
      )}
      style={style}
    >
      {clouds.map((cloud) => (
        <Cloud key={cloud} className={cloud} />
      ))}
      <div
        className={cx(
          "relative z-10 flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+18px)]",
          fill ? "min-h-0" : nav ? "pb-[calc(env(safe-area-inset-bottom)+112px)]" : "pb-[calc(env(safe-area-inset-bottom)+28px)]",
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}
