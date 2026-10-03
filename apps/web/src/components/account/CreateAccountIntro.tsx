"use client";

import { CalendarCheck, KeyRound, Smartphone, User, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Personaje, type PersonajeProps } from "@/components/personaje/Personaje";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";

const BENEFITS: Array<{ Icon: LucideIcon; tile: string; text: string }> = [
  { Icon: KeyRound, tile: "bg-preguntas text-white", text: "Solo un apodo y una contraseña: sin email" },
  { Icon: CalendarCheck, tile: "bg-gold text-ink", text: "Lo que jugaste hoy pasa a tu cuenta" },
  { Icon: Smartphone, tile: "bg-reflejos text-ink", text: "Jugá desde cualquier celu sin perder la racha" },
];

/** Podium steps with characters: decoration, without anyone's real scores. */
const STEPS: Array<{ place: number; height: string; tone: string; character: PersonajeProps }> = [
  { place: 2, height: "h-11", tone: "bg-white text-ink-500", character: { sp: "pelusa", face: "wow", size: 44 } },
  { place: 1, height: "h-16", tone: "bg-gold text-ink", character: { sp: "carpincho", acc: ["boina"], size: 50 } },
  { place: 3, height: "h-8", tone: "bg-white text-ink-500", character: { sp: "rana", acc: ["anteojos"], size: 44 } },
];

/** "Creá tu cuenta" (design 17), with apodo and password instead of Google and email. */
export function CreateAccountIntro({ back }: { back: string }) {
  const router = useRouter();
  const account = useAccount();
  const leave = () => (window.history.length > 1 ? router.back() : router.push(back));
  const query = `?volver=${encodeURIComponent(back)}`;

  return (
    <Screen clouds={["-left-[60px] top-[200px] w-[180px] opacity-95", "-right-[70px] top-[120px] w-[200px] opacity-95"]}>
      <div className="flex justify-end px-5">
        <IconButton label="Cerrar" onClick={leave}>
          <X className="size-[18px]" strokeWidth={2.4} />
        </IconButton>
      </div>

      <div className="grid grid-cols-3 items-end gap-2 px-[60px] pt-4 short:pt-0" aria-hidden>
        {STEPS.map(({ place, height, tone, character }) => (
          <div key={place} className="flex flex-col items-center">
            <Personaje {...character} />
            <div className={cx("grid w-full place-items-center rounded-t-[12px] font-display text-lg font-extrabold", height, tone)}>{place}</div>
          </div>
        ))}
      </div>
      <div className="mx-5 h-0.5 rounded-full bg-white" />
      <div className="mx-5 mt-2.5 flex h-[52px] items-center gap-2.5 rounded-row border-2 border-dashed border-brand bg-white px-3.5 shadow-md">
        <span className="grid size-[30px] place-items-center rounded-full bg-brand-100 text-brand">
          <User className="size-[15px]" strokeWidth={2.4} />
        </span>
        <span className="text-sm font-bold text-brand">Tu lugar en el ranking está libre</span>
      </div>

      <div className="px-6 pt-6 text-center short:pt-4">
        <h1 className="font-display text-[30px] leading-[1.1] font-extrabold tracking-[-.03em] text-balance">Entrá al ranking de tu pueblo</h1>
        <p className="mt-2.5 text-[15px] leading-[1.45] font-medium text-pretty text-ink-700">
          Creá tu cuenta para pelear por la corona de la semana y guardar lo que jugaste hoy.
        </p>
      </div>
      <ul className="mx-5 mt-4 flex flex-col gap-2">
        {BENEFITS.map(({ Icon, tile, text }) => (
          <li key={text} className="flex items-center gap-3 rounded-row bg-white px-3.5 py-2.5 shadow-sm">
            <span className={cx("grid size-8 shrink-0 place-items-center rounded-[10px]", tile)}>
              <Icon className="size-[18px]" strokeWidth={2.4} />
            </span>
            <span className="text-sm font-bold">{text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2.5 px-5 pt-4">
        {account ? (
          <Button href="/perfil">Ya entraste como {account.username}</Button>
        ) : (
          <>
            <Button href={`/cuenta/personaje${query}`}>Crear mi cuenta</Button>
            <Button variant="secondary" size="md" href={`/cuenta/entrar${query}`}>
              Ya tengo cuenta
            </Button>
          </>
        )}
        <button type="button" onClick={leave} className="py-1.5 text-center text-sm font-bold text-ink-700">
          Ahora no
        </button>
      </div>
    </Screen>
  );
}
