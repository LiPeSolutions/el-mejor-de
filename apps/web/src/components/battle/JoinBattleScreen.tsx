"use client";

import { House } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GroupsMessage } from "@/components/groups/parts";
import { avatarLook } from "@/components/personaje/avatar";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import { ApiError, battlesApi } from "@/lib/api";
import type { BattlePreview } from "@/lib/battle-types";
import { GAMES } from "@/lib/games";
import { useRequest } from "@/lib/use-request";
import { JoinBattle } from "./JoinBattle";

const CLOUDS = ["-right-[60px] top-[90px] w-[180px] opacity-95", "-left-[50px] bottom-[180px] w-[220px] opacity-95"];

/*
 * Like the groups' invitations: whoever opens the link without an account
 * taps "Crear mi cuenta y sumarme", this browser remembers the code, and
 * coming back signed in joins by itself. Only a tap here starts that.
 */
const PENDING_KEY = "emd:batalla";

function pendingJoin(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function setPendingJoin(code: string | null): void {
  try {
    if (code) window.sessionStorage.setItem(PENDING_KEY, code);
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: they'll tap "Sumarme" once more.
  }
}

function joinError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.code === "battle-full") return "La sala se llenó: son 10 como máximo.";
    if (cause.code === "removed") return "No podés volver a esta batalla.";
    if (cause.code === "battle-closed" || cause.status === 404) return "La batalla ya terminó.";
    if (cause.status === 429) return "Probaste muchos códigos. Esperá un rato.";
  }
  return "No pudimos sumarte. Probá de nuevo.";
}

/** The page behind a battle's link (/b/K7Q2). */
export function JoinBattleScreen({ code }: { code: string }) {
  const account = useAccount();
  const request = useRequest(account === undefined ? null : `batalla:${code}:${account?.id ?? ""}`, () => battlesApi.preview(code));
  if (account === undefined || (!request.data && !request.error)) return <Screen>{null}</Screen>;
  if (!request.data) {
    const tooMany = request.error instanceof ApiError && request.error.status === 429;
    return (
      <Problem title={tooMany ? "Probaste muchos códigos" : "No encontramos la batalla"}>
        {tooMany ? "Esperá un rato y probá de nuevo." : "Puede que ya haya terminado. Pedile el link de nuevo a quien te invitó."}
      </Problem>
    );
  }
  return <Invitation preview={request.data} signedIn={account !== null} code={code} />;
}

function Problem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen clouds={CLOUDS}>
      <GroupsMessage title={title} face="wow">
        {children}
      </GroupsMessage>
      <div className="mt-auto px-5 pt-6">
        <Button variant="secondary" size="md" href="/">
          <House className="size-[18px]" strokeWidth={2.6} />
          Ir a los retos de hoy
        </Button>
      </div>
    </Screen>
  );
}

function Invitation({ preview, signedIn, code }: { preview: BattlePreview; signedIn: boolean; code: string }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = () => {
    setJoining(true);
    setError(null);
    setPendingJoin(null);
    battlesApi.join(code).then(
      ({ battleId }) => router.replace(`/batalla/${battleId}`),
      (cause: unknown) => {
        setError(joinError(cause));
        setJoining(false);
      },
    );
  };

  // Back from creating the account (or signing in) after tapping "sumarme". The note is used up right away.
  useEffect(() => {
    if (!signedIn || preview.status !== "open" || pendingJoin() !== preview.code) return;
    setPendingJoin(null);
    battlesApi.join(code).then(
      ({ battleId }) => router.replace(`/batalla/${battleId}`),
      (cause: unknown) => setError(joinError(cause)),
    );
  }, [signedIn, preview.status, preview.code, code, router]);

  if (preview.status === "in") {
    return (
      <Problem title="Ya estás en esta batalla">
        <span className="block">Entrá a la sala para jugar.</span>
        <span className="mt-4 block">
          <Button href={`/batalla/${preview.battleId}`}>Entrar a la sala</Button>
        </span>
      </Problem>
    );
  }
  if (preview.status === "full") return <Problem title="La sala está llena">{`Ya hay ${preview.maxPlayers} jugadores, que es el máximo.`}</Problem>;
  if (preview.status === "removed") return <Problem title="No podés volver a esta batalla">Quien la armó te sacó de la sala.</Problem>;

  const back = encodeURIComponent(`/b/${preview.code}`);
  return (
    <JoinBattle
      host={{ name: preview.host.username, look: avatarLook(preview.host.avatar) }}
      game={GAMES[preview.game]}
      players={preview.players.map((player) => ({ key: player.userId, name: player.username, avatar: player.avatar }))}
      signedIn={signedIn}
      playing={preview.playing}
      onJoin={join}
      joining={joining}
      error={error}
      createHref={`/cuenta/personaje?volver=${back}`}
      signInHref={`/cuenta/entrar?volver=${back}`}
      onAccount={() => setPendingJoin(preview.code)}
    />
  );
}
