import { cx } from "./cx";

/** Background cloud made of three white blobs (the design's "Nube"). Position it with className. */
export function Cloud({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx("pointer-events-none absolute aspect-[10/7]", className)}>
      <span className="absolute inset-x-0 bottom-0 h-[55%] rounded-full bg-white" />
      <span className="absolute bottom-[22%] left-[12%] aspect-square w-1/2 rounded-full bg-white" />
      <span className="absolute bottom-[28%] left-[44%] aspect-square w-[38%] rounded-full bg-white" />
    </div>
  );
}
