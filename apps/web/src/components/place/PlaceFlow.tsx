"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  LoaderCircle,
  MapPin,
  MapPinOff,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkle,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Personaje, type Face } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { loadAccount, saveAccount, useAccount } from "@/lib/account";
import type { PublicAccount } from "@/lib/account-types";
import { ApiError, placesApi } from "@/lib/api";
import { PositionError, currentPosition, type Position, type PositionProblem } from "@/lib/geolocation";
import { placePath } from "@/lib/paths";
import type { ChooseResponse, PlaceStatus, PlaceSummary } from "@/lib/place-types";
import { useRequest } from "@/lib/use-request";

/*
 * "Tu lugar" (designs 19 to 23): where the player competes. With the GPS
 * it's one tap (the localities around are already verified); by hand it's
 * saved and checked with the GPS afterwards. The same screens do this
 * week's check for the crown (`verify`).
 */

const CLOUDS = ["-left-[60px] top-[170px] w-[170px] opacity-95", "-right-[70px] top-[330px] w-[200px] opacity-95"];

interface Place {
  id: string;
  name: string;
}

type Purpose = "find" | "verify";

type Problem = PositionProblem | "inaccurate" | "outside" | "too-many" | "none-near" | "network" | "error" | "signed-out";

type Step =
  | { kind: "intro" }
  | { kind: "locating"; purpose: Purpose }
  | { kind: "nearby"; position: Position; places: PlaceSummary[] }
  | { kind: "manual" }
  | { kind: "verify"; place: Place }
  | { kind: "verified"; place: Place; first: boolean }
  | { kind: "too-far"; place: Place; verified: boolean }
  | { kind: "problem"; problem: Problem; purpose: Purpose };

interface FlowProps {
  /** Where to go when done. */
  back: string;
  /** Right after creating the account: "Paso 2 de 2". */
  signup: boolean;
  /** Straight to the check of the place already chosen. */
  verify: boolean;
}

export function PlaceFlow(props: FlowProps) {
  const account = useAccount();
  if (account === undefined) return <Screen>{null}</Screen>;
  if (!account) return <SignedOut {...props} />;
  return <Flow key={account.id} account={account} {...props} />;
}

function problemOf(cause: unknown): Problem {
  if (!(cause instanceof ApiError)) return "network";
  switch (cause.code) {
    case "outside-argentina":
      return "outside";
    case "inaccurate-position":
      return "inaccurate";
    case "invalid-position":
      return "unavailable";
    case "too-many-checks":
      return "too-many";
    case "signed-out":
      return "signed-out";
    default:
      return "error";
  }
}

/** Keeps the browser's copy of the account in step with the server. */
function remember(status: PlaceStatus): void {
  const account = loadAccount();
  if (account) saveAccount({ ...account, placeId: status.place?.id ?? null, placeName: status.place?.name ?? null, placeVerified: status.verified });
}

function Flow({ account, back, signup, verify }: FlowProps & { account: PublicAccount }) {
  const router = useRouter();
  const current: Place | null = account.placeId && account.placeName ? { id: account.placeId, name: account.placeName } : null;
  // The way back: every screen the player went through, the last one on screen.
  const [trail, setTrail] = useState<Step[]>(() => [verify && current ? { kind: "verify", place: current } : { kind: "intro" }]);
  const [sending, setSending] = useState<string | null>(null);
  const step = trail[trail.length - 1]!;

  const go = (next: Step) => setTrail((steps) => [...steps, next]);
  /** Moves on from `from` if it's still on screen; `replace` takes it off the way back (e.g. "locating"). */
  const move = (from: Step, next: Step, replace = false) =>
    setTrail((steps) => (steps[steps.length - 1] !== from ? steps : [...(replace ? steps.slice(0, -1) : steps), next]));
  const leave = () => router.replace(back);
  const goBack = () => {
    if (step.kind === "verified" || trail.length === 1) {
      if (!signup && window.history.length > 1) router.back();
      else leave();
    } else {
      setTrail((steps) => steps.slice(0, -1));
    }
  };

  /** What the server answered after choosing or checking a place. */
  const settle = (from: Step, { result, status }: ChooseResponse, replace: boolean) => {
    const wasVerified = account.placeVerified && account.placeId === status.place?.id;
    remember(status);
    const place = status.place ? { id: status.place.id, name: status.place.name } : null;
    if (!place) move(from, { kind: "intro" }, replace);
    else if (result === "verified") move(from, { kind: "verified", place, first: !wasVerified }, replace);
    else if (result === "too-far") move(from, { kind: "too-far", place, verified: status.verified }, replace);
    else move(from, { kind: "verify", place }, replace);
  };

  /** Asks the phone where it is: to find the places around, or to check the one chosen. */
  const locate = async (purpose: Purpose, replacing?: Step) => {
    const locating: Step = { kind: "locating", purpose };
    if (replacing) move(replacing, locating, true);
    else go(locating);
    let position: Position;
    try {
      position = await currentPosition();
    } catch (cause) {
      move(locating, { kind: "problem", purpose, problem: cause instanceof PositionError ? cause.problem : "unavailable" }, true);
      return;
    }
    try {
      if (purpose === "find") {
        const { places } = await placesApi.nearby(position);
        move(locating, places.length > 0 ? { kind: "nearby", position, places } : { kind: "problem", purpose, problem: "none-near" }, true);
      } else {
        settle(locating, await placesApi.verify(position), true);
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "no-place") move(locating, { kind: "intro" }, true);
      else move(locating, { kind: "problem", purpose, problem: problemOf(cause) }, true);
    }
  };

  const choose = async (from: Step, place: PlaceSummary, position?: Position) => {
    setSending(place.id);
    try {
      settle(from, await placesApi.choose(place.id, position), false);
    } catch (cause) {
      move(from, { kind: "problem", purpose: "find", problem: problemOf(cause) }, false);
    } finally {
      setSending(null);
    }
  };

  const label = signup ? "Paso 2 de 2" : "Tu lugar";
  const header = <Header onBack={signup && trail.length === 1 ? undefined : goBack} label={label} />;
  const later = <TextButton onClick={leave}>Más tarde</TextButton>;

  switch (step.kind) {
    case "intro":
      return (
        <Screen clouds={CLOUDS}>
          {header}
          <Message visual={<IconTile Icon={MapPin} />} title="¿De dónde sos?">
            {current ? (
              <>
                Hoy competís por <b className="text-ink">{current.name}</b>. Si te mudaste, elegí tu nuevo lugar: lo que ya jugaste queda en {current.name}.
              </>
            ) : (
              "Competís con tu barrio o tu pueblo, tu provincia y todo el país. Con tu ubicación lo encontramos y queda verificado en un toque."
            )}
          </Message>
          <Facts
            items={[
              { Icon: ShieldCheck, text: "Nunca guardamos ni mostramos tu ubicación exacta" },
              { Icon: MapPin, text: "Los demás solo ven el nombre de tu barrio o tu pueblo" },
              { Icon: Crown, text: "Para pelear la corona, verificás una vez por semana" },
            ]}
          />
          <Actions>
            <Button onClick={() => void locate("find")}>
              <MapPin className="size-5" strokeWidth={2.6} />
              Usar mi ubicación
            </Button>
            <Button variant="secondary" size="md" onClick={() => go({ kind: "manual" })}>
              <Search className="size-[18px]" strokeWidth={2.6} />
              Buscar a mano
            </Button>
            {signup && later}
          </Actions>
        </Screen>
      );

    case "locating":
      return (
        <Screen clouds={CLOUDS}>
          {header}
          <Message
            visual={
              <div className="relative p-3">
                <IconTile Icon={MapPin} />
                <LoaderCircle aria-hidden className="absolute inset-0 size-full animate-spin text-brand/40" strokeWidth={1.2} />
              </div>
            }
            title={step.purpose === "find" ? "Buscando dónde estás…" : "Chequeando tu ubicación…"}
          >
            Si el celu te pregunta, tocá <b className="text-ink">Permitir</b>.
          </Message>
        </Screen>
      );

    case "nearby": {
      const city = step.places.every((place) => place.province === "Ciudad de Buenos Aires");
      return (
        <Screen clouds={CLOUDS}>
          {header}
          <FormTitle title={city ? "¿Cuál es tu barrio?" : "¿Cuál es tu lugar?"}>Estos quedan cerca de donde estás. Tocá el tuyo y queda verificado.</FormTitle>
          <ul className="mx-5 mt-4 rounded-card bg-white p-1.5 shadow-md" aria-label="Lugares cerca tuyo">
            {step.places.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  disabled={sending !== null}
                  onClick={() => void choose(step, place, step.position)}
                  className="flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left transition active:bg-surface-2 disabled:opacity-60"
                >
                  <MapPin className="size-5 shrink-0 text-brand" strokeWidth={2.4} />
                  <PlaceName place={place} current={place.id === current?.id} />
                  {sending === place.id ? (
                    <LoaderCircle className="size-5 shrink-0 animate-spin text-brand" strokeWidth={2.6} aria-label="Guardando" />
                  ) : (
                    <ChevronRight className="size-5 shrink-0 text-ink-300" strokeWidth={2.6} />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Actions>
            <TextButton onClick={() => go({ kind: "manual" })}>¿No está el tuyo? Buscalo a mano</TextButton>
          </Actions>
        </Screen>
      );
    }

    case "manual":
      return <ManualSearch header={header} current={current} sending={sending !== null} onChoose={(place) => void choose(step, place)} />;

    case "verify": {
      const recheck = account.placeVerified && account.placeId === step.place.id;
      return (
        <Screen clouds={CLOUDS}>
          {header}
          <Message
            visual={<IconTile Icon={ShieldCheck} />}
            title={recheck ? `Para pelear la corona, chequeamos que sigas en ${step.place.name}.` : `Para que el ranking sea justo, chequeamos que estés en ${step.place.name}.`}
          >
            Nunca guardamos ni mostramos tu ubicación exacta. Solo queda registrado que verificaste en {step.place.name}.
          </Message>
          <Facts
            items={[
              { Icon: Clock, text: "Ahora y una vez por semana, para pelear la corona" },
              { Icon: MapPin, text: `Los demás solo ven "${step.place.name}"` },
              recheck
                ? { Icon: Trophy, text: "Si no verificás, tus puntos cuentan igual en el ranking" }
                : { Icon: Trophy, text: "Entra al ranking todo lo que jugaste esta semana" },
            ]}
          />
          <Actions>
            <Button onClick={() => void locate("verify")}>
              <MapPin className="size-5" strokeWidth={2.6} />
              Verificar ubicación
            </Button>
            {trail.length === 1 && (
              <Button variant="secondary" size="md" onClick={() => go({ kind: "intro" })}>
                Elegir otro lugar
              </Button>
            )}
            {later}
          </Actions>
        </Screen>
      );
    }

    case "verified":
      return (
        <Screen clouds={["-left-[50px] top-[420px] w-[190px] opacity-95", "-right-[60px] bottom-[150px] w-[230px] opacity-95"]}>
          <div className="flex justify-center px-5">
            <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-success px-3.5 text-[13px] font-extrabold text-white shadow-[0_8px_18px_rgba(31,160,147,.35)]">
              <Check className="size-4" strokeWidth={3} />
              Ubicación verificada
            </span>
          </div>
          <Message visual={<Celebrating account={account} />} title={`¡Listo! Ya competís por ${step.place.name}`}>
            {step.first
              ? `Lo que jugaste esta semana ya entró al ranking de ${step.place.name}, y ya podés pelear su corona.`
              : `Ya podés pelear la corona de ${step.place.name} esta semana. ¡A sumar!`}
          </Message>
          <Actions>
            <Button onClick={() => router.replace("/ranking")}>
              <Trophy className="size-5" strokeWidth={2.6} />
              Ver el ranking
            </Button>
            {back !== "/ranking" && <TextButton onClick={leave}>Seguir</TextButton>}
          </Actions>
        </Screen>
      );

    case "too-far":
      return (
        <Screen clouds={CLOUDS}>
          {header}
          <div className="flex justify-center px-5 pt-2">
            <span className="flex h-[30px] items-center gap-1.5 rounded-full bg-gold px-3 text-xs font-extrabold text-ink shadow-btn-gold">
              <MapPinOff className="size-3.5" strokeWidth={2.6} />
              Fuera de tu zona
            </span>
          </div>
          <Message visual={<Character account={account} face="wow" />} title={`Parece que ahora no estás en ${step.place.name}`}>
            {step.verified
              ? `Tranqui: lo que jugás sigue contando en el ranking de ${step.place.name}. Para pelear la corona, verificá desde ahí antes del domingo a la medianoche.`
              : `Tranqui: ${step.place.name} quedó como tu lugar. Verificalo cuando estés ahí y entra al ranking todo lo que jugaste esa semana. Mientras tanto, tus puntos cuentan para tus grupos.`}
          </Message>
          <Actions>
            <Button onClick={leave}>Entendido</Button>
            <TextButton onClick={() => void locate("find")}>¿Te mudaste? Cambiá tu lugar</TextButton>
          </Actions>
        </Screen>
      );

    case "problem":
      return (
        <ProblemScreen
          header={header}
          account={account}
          problem={step.problem}
          purpose={step.purpose}
          place={step.purpose === "verify" ? current : null}
          onRetry={() => void locate(step.purpose, step)}
          onManual={() => move(step, { kind: "manual" }, true)}
          onLeave={leave}
        />
      );
  }
}

/* ───────────── Pieces ───────────── */

function Header({ onBack, label }: { onBack?: () => void; label: string }) {
  return (
    <header className="flex items-center justify-between px-5">
      {onBack ? (
        <IconButton label="Volver" onClick={onBack}>
          <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
        </IconButton>
      ) : (
        <span aria-hidden className="size-[38px]" />
      )}
      <div className="flex h-[34px] items-center rounded-full bg-white px-3.5 text-[13px] font-bold shadow-sm">{label}</div>
    </header>
  );
}

/** The big blue tile of designs 19 and 20. */
function IconTile({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="grid size-[104px] place-items-center rounded-[30px] bg-hero-brand text-white shadow-hero short:size-[88px]">
      <Icon className="size-12 short:size-10" strokeWidth={2.2} />
    </div>
  );
}

function Character({ account, face }: { account: PublicAccount; face: Face }) {
  return <Personaje {...avatarLook(account.avatar)} face={face} size={120} anim="float" title={`El personaje de ${account.username}`} />;
}

/** Design 21: the player's character, happy, among sparkles. */
function Celebrating({ account }: { account: PublicAccount }) {
  return (
    <div className="relative px-10">
      <Sparkle aria-hidden className="absolute top-6 left-0 size-6 fill-gold text-gold" strokeWidth={1.5} />
      <Sparkle aria-hidden className="absolute top-14 right-0 size-7 fill-white text-white" strokeWidth={1.5} />
      <span aria-hidden className="absolute top-2 right-6 size-2.5 rotate-45 rounded-[2px] bg-reflejos" />
      <span aria-hidden className="absolute bottom-10 left-3 size-2.5 rotate-12 rounded-[2px] bg-letras" />
      <span aria-hidden className="absolute right-3 bottom-6 size-2.5 -rotate-12 rounded-[2px] bg-preguntas" />
      <Personaje {...avatarLook(account.avatar)} face="joy" size={150} anim="float" title={`El personaje de ${account.username}`} />
    </div>
  );
}

function Message({ visual, title, children }: { visual: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-7 pt-7 text-center short:pt-3">
      {visual}
      <h1 className="mt-6 font-display text-[28px] leading-[1.08] font-extrabold tracking-[-.02em] text-balance [overflow-wrap:anywhere] short:mt-4 short:text-[25px]">
        {title}
      </h1>
      <p className="mt-2.5 text-[15px] leading-[1.45] font-semibold text-pretty text-ink-700">{children}</p>
    </div>
  );
}

function FormTitle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-5 pt-5">
      <h1 className="font-display text-[30px] leading-[1.05] font-extrabold tracking-[-.02em]">{title}</h1>
      <p className="mt-2 text-sm leading-[1.45] font-semibold text-pretty text-ink-700">{children}</p>
    </div>
  );
}

/** The white card of design 20, one line per fact. */
function Facts({ items }: { items: readonly { Icon: LucideIcon; text: string }[] }) {
  return (
    <ul className="mx-5 mt-5 rounded-card bg-white px-4 py-1 shadow-md short:mt-4">
      {items.map(({ Icon, text }) => (
        <li key={text} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0 short:py-2.5">
          <Icon className="size-[18px] shrink-0 text-brand" strokeWidth={2.4} />
          <span className="text-[13px] leading-[1.35] font-semibold">{text}</span>
        </li>
      ))}
    </ul>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex flex-col gap-2.5 px-5 pt-5">{children}</div>;
}

function TextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mx-auto flex min-h-10 items-center px-3 text-center text-sm font-extrabold text-ink-700">
      {children}
    </button>
  );
}

function PlaceName({ place, current }: { place: PlaceSummary; current?: boolean }) {
  const where = [place.department, place.province].filter((part) => part && part !== place.name).join(" · ");
  return (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1.5">
        <span className="truncate text-[15px] font-extrabold">{place.name}</span>
        {current && <span className="shrink-0 rounded-full bg-brand-100 px-[7px] py-0.5 text-[10px] font-extrabold text-brand">actual</span>}
      </span>
      {where && <span className="block truncate text-xs font-semibold text-ink-500">{where}</span>}
    </span>
  );
}

/* ───────────── By hand (design 19) ───────────── */

function ManualSearch({
  header,
  current,
  sending,
  onChoose,
}: {
  header: ReactNode;
  current: Place | null;
  sending: boolean;
  onChoose: (place: PlaceSummary) => void;
}) {
  const provinces = useRequest("provincias", () => placesApi.provinces());
  const [provinceId, setProvinceId] = useState("");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<PlaceSummary | null>(null);
  const [found, setFound] = useState<{ key: string; places: PlaceSummary[]; failed: boolean } | null>(null);

  const query = text.trim();
  const key = query.length >= 2 ? `${provinceId}|${query}` : null;
  useEffect(() => {
    if (!key) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      placesApi.search(query, provinceId || null).then(
        ({ places }) => alive && setFound({ key, places, failed: false }),
        () => alive && setFound({ key, places: [], failed: true }),
      );
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` holds the query and the province
  }, [key]);
  const results = key && found?.key === key ? found : null;

  return (
    <Screen clouds={CLOUDS}>
      <form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (selected && !sending) onChoose(selected);
        }}
      >
        {header}
        <FormTitle title="¿De dónde sos?">
          Elegí tu provincia y buscá tu localidad o, en la Ciudad de Buenos Aires, tu barrio. Después lo verificamos con el GPS.
        </FormTitle>

        <div className="px-5 pt-4">
          <Label>
            <label htmlFor="place-province">Provincia</label>
          </Label>
          <div className="relative mt-1.5">
            <select
              id="place-province"
              value={provinceId}
              onChange={(event) => {
                setProvinceId(event.target.value);
                setSelected(null);
              }}
              className="h-[52px] w-full appearance-none rounded-row bg-white pr-11 pl-4 text-base font-bold shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">Todas las provincias</option>
              {provinces.data?.provinces.map((province) => (
                <option key={province.id} value={province.id}>
                  {province.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-500" strokeWidth={2.4} />
          </div>
        </div>

        <div className="px-5 pt-3.5">
          <Label>
            <label htmlFor="place-search">Localidad o barrio</label>
          </Label>
          <div className="relative mt-1.5">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-500" strokeWidth={2.4} />
            <input
              id="place-search"
              type="search"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setSelected(null);
              }}
              placeholder="Escribí el nombre"
              autoComplete="off"
              enterKeyHint="search"
              maxLength={60}
              className="h-[52px] w-full rounded-row border-2 border-transparent bg-white pr-4 pl-11 text-base font-bold shadow-sm outline-none placeholder:font-semibold placeholder:text-ink-300 focus:border-brand [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
        </div>

        <div className="px-5 pt-2.5" aria-live="polite">
          {key === null ? (
            current && <p className="px-1 text-xs font-semibold text-ink-500">Hoy competís por {current.name}.</p>
          ) : results === null ? (
            <p className="flex items-center gap-2 px-1 text-sm font-semibold text-ink-500">
              <LoaderCircle className="size-4 animate-spin" strokeWidth={2.6} />
              Buscando…
            </p>
          ) : results.failed ? (
            <p className="px-1 text-sm font-bold text-danger">No pudimos buscar. Revisá tu conexión y probá de nuevo.</p>
          ) : results.places.length === 0 ? (
            <p className="px-1 text-sm font-semibold text-ink-700">No encontramos ningún lugar con ese nombre{provinceId ? " en esa provincia" : ""}.</p>
          ) : (
            <ul className="rounded-card bg-white p-1.5 shadow-md" aria-label="Resultados">
              {results.places.map((place) => {
                const active = selected?.id === place.id;
                return (
                  <li key={place.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected(place)}
                      className={cx("flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition", active ? "bg-brand-100" : "active:bg-surface-2")}
                    >
                      <MapPin className={cx("size-[18px] shrink-0", active ? "text-brand" : "text-ink-300")} strokeWidth={2.4} />
                      <PlaceName place={place} current={place.id === current?.id} />
                      {active && <Check className="size-5 shrink-0 text-brand" strokeWidth={3} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-auto px-5 pt-5">
          <Button type="submit" disabled={!selected || sending}>
            {sending ? "Guardando…" : "Seguir"}
            {!sending && <ChevronRight className="size-[18px]" strokeWidth={2.6} />}
          </Button>
          <p className="mt-2 text-center text-xs font-semibold text-ink-700">Lo podés cambiar cuando quieras.</p>
        </div>
      </form>
    </Screen>
  );
}

/* ───────────── When it doesn't work (design 22 and more) ───────────── */

const isAndroid = () => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

const IPHONE_STEPS: ReactNode[] = [
  <>
    Abrí <b>Ajustes → Safari → Ubicación</b>
  </>,
  <>
    Elegí <b>Permitir</b>
  </>,
  <>
    Volvé acá y tocá <b>Reintentar</b>
  </>,
];

const ANDROID_STEPS: ReactNode[] = [
  <>
    Abrí <b>Ajustes → Apps → Chrome → Permisos</b>
  </>,
  <>
    En <b>Ubicación</b>, elegí <b>Permitir</b>
  </>,
  <>
    Volvé acá y tocá <b>Reintentar</b>
  </>,
];

interface ProblemProps {
  header: ReactNode;
  account: PublicAccount;
  problem: Problem;
  purpose: Purpose;
  /** The place being checked, if any. */
  place: Place | null;
  onRetry: () => void;
  onManual: () => void;
  onLeave: () => void;
}

function ProblemScreen({ header, account, problem, purpose, place, onRetry, onManual, onLeave }: ProblemProps) {
  const where = place ? place.name : "tu lugar";
  const retry = (
    <Button onClick={onRetry}>
      <RotateCcw className="size-5" strokeWidth={2.6} />
      Reintentar
    </Button>
  );
  const manual = purpose === "find" && (
    <Button variant="secondary" size="md" onClick={onManual}>
      <Search className="size-[18px]" strokeWidth={2.6} />
      Buscar a mano
    </Button>
  );
  const laterButton = <TextButton onClick={onLeave}>Más tarde</TextButton>;
  const visual = (
    <div className="flex items-end justify-center gap-3">
      <Character account={account} face="wow" />
      <span className="mb-10 grid size-[60px] place-items-center rounded-[18px] bg-white text-danger shadow-md">
        <MapPinOff className="size-7" strokeWidth={2.4} />
      </span>
    </div>
  );

  let title: string;
  let text: ReactNode;
  let extra: ReactNode = null;
  let actions: ReactNode;
  switch (problem) {
    case "denied": {
      const android = isAndroid();
      title = "No pudimos acceder a tu ubicación";
      text = `Sin el GPS no podemos confirmar que estés en ${where}. Habilitalo y reintentá: tarda dos segundos.`;
      extra = (
        <>
          <ol className="mx-5 mt-5 rounded-card bg-white px-4 py-1 shadow-md short:mt-4">
            {(android ? ANDROID_STEPS : IPHONE_STEPS).map((line, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0 short:py-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-extrabold text-brand">{i + 1}</span>
                <span className="text-[13px] leading-[1.35] font-semibold [&_b]:font-extrabold">{line}</span>
              </li>
            ))}
          </ol>
          <p className="px-5 pt-2 text-center text-xs font-semibold text-ink-500">
            {android ? "En iPhone: Ajustes → Safari → Ubicación" : "En Android: Ajustes → Apps → Chrome → Permisos → Ubicación"}
          </p>
        </>
      );
      actions = (
        <>
          {retry}
          {manual}
          {laterButton}
        </>
      );
      break;
    }
    case "unavailable":
    case "timeout":
      title = "No pudimos encontrar dónde estás";
      text = "Revisá que la ubicación del celu esté prendida y probá de nuevo, mejor cerca de una ventana o al aire libre.";
      actions = (
        <>
          {retry}
          {manual}
          {laterButton}
        </>
      );
      break;
    case "unsupported":
      title = "Este navegador no comparte la ubicación";
      text = "Abrí la app desde Chrome o Safari para verificar tu lugar.";
      actions = (
        <>
          {manual}
          {laterButton}
        </>
      );
      break;
    case "inaccurate":
      title = "Tu ubicación no es precisa";
      text = "El celu nos pasó una ubicación aproximada. Activá la ubicación exacta (en iPhone: Ajustes → Privacidad → Localización → Safari) y reintentá.";
      actions = (
        <>
          {retry}
          {laterButton}
        </>
      );
      break;
    case "outside":
      title = "Por ahora es solo en Argentina";
      text = "Tu conexión es de otro país. Si estás de viaje, verificá cuando vuelvas: mientras tanto jugás igual y tus puntos cuentan para tus grupos.";
      actions = <Button onClick={onLeave}>Entendido</Button>;
      break;
    case "too-many":
      title = "Probaste muchas veces";
      text = "Esperá un rato y volvé a intentar.";
      actions = <Button onClick={onLeave}>Entendido</Button>;
      break;
    case "none-near":
      title = "No encontramos tu lugar cerca";
      text = "No hay ninguna localidad de la lista oficial cerca de donde estás. Buscala a mano y verificala cuando estés ahí.";
      actions = (
        <>
          {manual}
          {laterButton}
        </>
      );
      break;
    case "signed-out":
      title = "Se cerró tu sesión";
      text = "Entrá de nuevo para elegir tu lugar.";
      actions = <Button href={`/cuenta/entrar?volver=${encodeURIComponent(placePath())}`}>Entrar</Button>;
      break;
    case "network":
      title = "No pudimos conectarnos";
      text = "Revisá tu conexión y probá de nuevo.";
      actions = (
        <>
          {retry}
          {laterButton}
        </>
      );
      break;
    default:
      title = "Algo salió mal";
      text = "Probá de nuevo en un rato.";
      actions = (
        <>
          {retry}
          {laterButton}
        </>
      );
  }

  return (
    <Screen clouds={CLOUDS}>
      {header}
      <Message visual={visual} title={title}>
        {text}
      </Message>
      {extra}
      <Actions>{actions}</Actions>
    </Screen>
  );
}

/* ───────────── Signed out ───────────── */

function SignedOut({ back, signup, verify }: FlowProps) {
  const here = encodeURIComponent(placePath({ back, signup, verify }));
  return (
    <Screen clouds={CLOUDS}>
      <Message visual={<IconTile Icon={MapPin} />} title="Entrá a tu cuenta">
        Tu lugar se guarda en tu cuenta, para competir con tu barrio o tu pueblo, tu provincia y el país.
      </Message>
      <Actions>
        <Button href={`/cuenta/entrar?volver=${here}`}>Entrar</Button>
        <Button variant="secondary" size="md" href={`/cuenta/crear?volver=${encodeURIComponent(back)}`}>
          Crear mi cuenta
        </Button>
      </Actions>
    </Screen>
  );
}
