"use client";

import { LoaderCircle, Swords } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "@/lib/account";
import { battlesApi } from "@/lib/api";

/** In Práctica: a battle with friends, without a group, shared by link. */
export function PracticeBattleCard() {
  const account = useAccount();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const open = () => {
    setBusy(true);
    setError(false);
    battlesApi.open(null).then(
      ({ battleId }) => router.push(`/batalla/${battleId}`),
      () => {
        setBusy(false);
        setError(true);
      },
    );
  };

  const action =
    account === null ? (
      <Link
        href={`/cuenta/entrar?volver=${encodeURIComponent("/practicar")}`}
        className="flex h-10 shrink-0 items-center rounded-full bg-brand px-4 font-display text-sm font-extrabold text-white shadow-btn"
      >
        Entrar
      </Link>
    ) : (
      <button
        type="button"
        onClick={open}
        disabled={busy || account === undefined}
        className="flex h-10 shrink-0 items-center rounded-full bg-brand px-4 font-display text-sm font-extrabold text-white shadow-btn transition active:scale-95 disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" strokeWidth={2.8} /> : "Armar"}
      </button>
    );

  return (
    <div className="mx-5 mt-3.5 flex items-center gap-3 rounded-card bg-white px-4 py-3 shadow-md">
      <span className="grid size-11 shrink-0 place-items-center rounded-key bg-brand-100 text-brand">
        <Swords className="size-[22px]" strokeWidth={2.3} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">Batalla con amigos</p>
        <p className="text-xs leading-snug font-semibold text-ink-500">
          {error ? "No pudimos armarla. Probá de nuevo." : account === null ? "Entrá a tu cuenta para jugar en vivo" : "Jueguen en vivo, todos a la vez"}
        </p>
      </div>
      {action}
    </div>
  );
}
