"use client";

import { USERNAME_RULES, avatarWithZones, checkPassword, checkUsername, type Article, type Avatar } from "@repo/shared";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FloatingToast, useToast } from "@/components/games/chrome";
import { Personaje } from "@/components/personaje/Personaje";
import { avatarLook, startingAvatar } from "@/components/personaje/avatar";
import { Button } from "@/components/ui/Button";
import { Cloud } from "@/components/ui/Cloud";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { saveAccount, useAccount } from "@/lib/account";
import { accountErrorText, passwordProblemText, usernameProblemText } from "@/lib/account-copy";
import type { PublicAccount } from "@/lib/account-types";
import { ApiError, accountApi } from "@/lib/api";
import { placePath } from "@/lib/paths";
import { createAccount } from "@/lib/session";
import { useAutosave, type SaveStatus } from "./autosave";
import { CharacterEditor, useEditorHistory, type EditorState } from "./CharacterEditor";
import { PasswordField, TextField } from "./fields";

/** "Tu personaje" (design 18, with the editor): creates the account in steps, or edits the character with `mode="edit"`. */
export function CharacterForm({ mode, back }: { mode: "create" | "edit"; back: string }) {
  const account = useAccount();
  // Signed in when the screen opened (not because the account was just made here).
  const [openedSignedIn, setOpenedSignedIn] = useState<boolean | null>(null);
  if (account !== undefined && openedSignedIn === null) setOpenedSignedIn(account !== null);
  if (account === undefined || openedSignedIn === null) return <Screen>{null}</Screen>;
  if (mode === "edit") return account ? <EditCharacter account={account} back={back} /> : <SignedOut back={back} />;
  if (openedSignedIn) return <AlreadySignedIn back={back} />;
  return <CreateAccount back={back} />;
}

/* ───────────── Pieces ───────────── */

/** Leaves the screen: back to where they came from, or to `back` if they opened it directly. */
function useLeave(back: string) {
  const router = useRouter();
  return () => (window.history.length > 1 ? router.back() : router.push(back));
}

/** The back arrow and, on the right, the step or the saving chip. */
function Header({ onBack, right }: { onBack: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5">
      <IconButton label="Volver" onClick={onBack}>
        <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
      </IconButton>
      {right}
    </div>
  );
}

function StepChip({ children }: { children: ReactNode }) {
  return <div className="flex h-[34px] items-center rounded-full bg-white px-3.5 text-[13px] font-bold shadow-sm">{children}</div>;
}

const articleText = (article: Article) => (article === "la" ? "La Mejor de…" : "El Mejor de…");

/** Step 2's card: the character already made, with the apodo and El / La as they're chosen. */
function CharacterHero({ avatar, name, article }: { avatar: Avatar; name?: string; article: Article | null }) {
  return (
    <div className="relative mx-5 mt-3.5 flex h-[176px] shrink-0 items-end justify-between overflow-hidden rounded-hero bg-hero-brand pl-[18px] text-white shadow-hero">
      <span aria-hidden className="absolute inset-0 bg-hero-glow" />
      <Cloud className="-right-[30px] -bottom-[30px] w-[200px] opacity-95" />
      <div className="relative flex min-w-0 flex-col justify-center self-stretch">
        <div className="text-xs font-bold uppercase tracking-[.06em] text-white/85">Tu personaje</div>
        <div className={cx("mt-1.5 font-display leading-[1.05] font-extrabold tracking-[-.02em]", name && name.length > 10 ? "text-[22px]" : "text-[28px]")}>
          {name ? (
            <span className="block [overflow-wrap:anywhere]">{name}</span>
          ) : (
            <>
              Así te van
              <br />a ver
            </>
          )}
        </div>
        {name && article && <div className="mt-1.5 text-[13px] font-bold text-white/90">{articleText(article)}</div>}
      </div>
      <div className="relative mr-1 h-[168px] w-[140px] shrink-0">
        <Personaje {...avatarLook(avatar)} size={140} anim="bob" title={name ? `El personaje de ${name}` : "Tu personaje"} />
      </div>
    </div>
  );
}

/** "El Mejor de…" or "La Mejor de…": chosen by the player, never guessed. */
function ArticleChoice({ value, onChange, error }: { value: Article | null; onChange: (article: Article) => void; error?: string | null }) {
  return (
    <fieldset className="mt-3.5 px-5">
      <legend className="text-[11px] font-bold uppercase tracking-[.06em] text-ink-500">¿Cómo querés que te nombremos?</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["el", "la"] as const).map((article) => (
          <label key={article} className="cursor-pointer">
            <input type="radio" name="article" className="peer sr-only" checked={value === article} onChange={() => onChange(article)} />
            <span
              className={cx(
                "flex h-11 items-center justify-center rounded-full font-display text-[15px] font-extrabold shadow-sm transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2",
                value === article ? "bg-brand text-white" : "bg-white text-ink",
              )}
            >
              {articleText(article)}
            </span>
          </label>
        ))}
      </div>
      <p role={error ? "alert" : undefined} className={cx("mt-1.5 px-1 text-xs leading-[1.4] font-semibold", error ? "text-danger" : "text-ink-500")}>
        {error ?? "Así va a decir tu corona. Lo podés cambiar en tu perfil."}
      </p>
    </fieldset>
  );
}

type Availability = "checking" | "available" | "taken" | "not-allowed" | "error";

/** Asks the server whether the apodo is free, a moment after the player stops typing. */
function useAvailability(candidate: string | null): Availability | null {
  const [checked, setChecked] = useState<{ name: string; result: Availability } | null>(null);
  useEffect(() => {
    if (!candidate) return;
    const timer = window.setTimeout(() => {
      accountApi.availability(candidate).then(
        (response) =>
          setChecked({ name: candidate, result: response.available ? "available" : response.problem === "taken" ? "taken" : "not-allowed" }),
        () => setChecked({ name: candidate, result: "error" }),
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [candidate]);
  if (!candidate) return null;
  return checked?.name === candidate ? checked.result : "checking";
}

function AvailabilityStatus({ availability }: { availability: Availability | null }) {
  if (availability === "checking") return <LoaderCircle className="size-4 animate-spin text-ink-500" strokeWidth={2.6} aria-label="Buscando" />;
  if (availability === "available")
    return (
      <span className="flex items-center gap-1 text-success">
        <Check className="size-3.5" strokeWidth={3} />
        Disponible
      </span>
    );
  if (availability === "taken" || availability === "not-allowed")
    return (
      <span className="flex items-center gap-1 text-danger">
        <X className="size-3.5" strokeWidth={3} />
        {availability === "taken" ? "En uso" : "No va"}
      </span>
    );
  return null;
}

/* ───────────── Create ───────────── */

/** The history entry of step 2, so the phone's back button goes to step 1. */
const STEP_KEY = "emdStep";
const isAccountStep = (state: unknown) => (state as Record<string, unknown> | null)?.[STEP_KEY] === "account";

interface Fields {
  username: string;
  password: string;
  article: Article | null;
}

interface Errors {
  username?: string | null;
  password?: string | null;
  article?: string | null;
  form?: string | null;
}

/** Step 1, the character; step 2, apodo and password; and then their place, unless they came to join a group. */
function CreateAccount({ back }: { back: string }) {
  const router = useRouter();
  const leave = useLeave(back);
  // Whoever comes to join a group joins it right away and chooses their place later.
  const withPlace = !back.startsWith("/g/");
  const steps = withPlace ? 3 : 2;
  const [step, setStep] = useState<"character" | "account">("character");
  const history = useEditorHistory(() => ({ avatar: startingAvatar(), article: null }));
  const [fields, setFields] = useState<Fields>({ username: "", password: "", article: null });

  useEffect(() => {
    const onPop = (event: PopStateEvent) => setStep(isAccountStep(event.state) ? "account" : "character");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (step === "account") {
    return (
      <AccountStep
        avatar={history.state.avatar}
        label={`Paso 2 de ${steps}`}
        fields={fields}
        onFields={setFields}
        onBack={() => (isAccountStep(window.history.state) ? window.history.back() : setStep("character"))}
        onCreated={() => router.replace(withPlace ? placePath({ back, signup: true }) : back)}
      />
    );
  }
  return (
    <Screen fill>
      <Header onBack={leave} right={<StepChip>Paso 1 de {steps}</StepChip>} />
      <CharacterEditor
        state={history.state}
        onChange={(next, burst) => history.change(next, burst)}
        onUndo={() => history.undo()}
        canUndo={history.canUndo}
        footer={
          <Button
            onClick={() => {
              window.history.pushState({ [STEP_KEY]: "account" }, "");
              setStep("account");
            }}
          >
            Seguir
            <ChevronRight className="size-[18px]" strokeWidth={2.6} />
          </Button>
        }
      />
    </Screen>
  );
}

function AccountStep({
  avatar,
  label,
  fields,
  onFields,
  onBack,
  onCreated,
}: {
  avatar: Avatar;
  label: string;
  fields: Fields;
  onFields: (update: (fields: Fields) => Fields) => void;
  onBack: () => void;
  onCreated: () => void;
}) {
  const { username, password, article } = fields;
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);

  const local = checkUsername(username);
  const availability = useAvailability(local.ok ? local.username : null);
  // Bad characters show up while typing; "too short" waits until they try to continue.
  const typingProblem = !local.ok && local.problem !== "too-short" && username.trim() ? usernameProblemText(local.problem) : null;
  const usernameError =
    errors.username ?? typingProblem ?? (availability === "taken" || availability === "not-allowed" ? usernameProblemText(availability) : null);

  const submit = async () => {
    const next: Errors = {
      username: local.ok ? (availability === "taken" || availability === "not-allowed" ? usernameProblemText(availability) : null) : usernameProblemText(local.problem),
      password: (() => {
        const problem = checkPassword(password, local.ok ? local.username : username);
        return problem ? passwordProblemText(problem) : null;
      })(),
      article: article ? null : "Elegí El Mejor o La Mejor.",
    };
    if (next.username || next.password || next.article || !local.ok || !article) {
      setErrors({ ...next, form: "Revisá lo que está en rojo." });
      return;
    }
    setSending(true);
    setErrors({});
    try {
      await createAccount({ username: local.username, password, avatar, article });
      onCreated();
    } catch (cause) {
      const text = accountErrorText(cause);
      const code = cause instanceof ApiError ? cause.code : null;
      setErrors(
        code === "username-taken" || code === "invalid-username"
          ? { username: text }
          : code === "invalid-password"
            ? { password: text }
            : { form: text },
      );
      setSending(false);
    }
  };

  return (
    <Screen clouds={["-right-[60px] top-[300px] w-[170px] opacity-95"]}>
      <form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Header onBack={onBack} right={<StepChip>{label}</StepChip>} />
        <CharacterHero avatar={avatar} name={local.ok ? local.username : undefined} article={article} />
        <TextField
          label="Tu apodo"
          value={username}
          onChange={(value) => {
            onFields((current) => ({ ...current, username: value }));
            setErrors((current) => ({ ...current, username: null, form: null }));
          }}
          status={!usernameError && <AvailabilityStatus availability={availability} />}
          error={usernameError}
          hint={`Es tu nombre en los rankings. De ${USERNAME_RULES.minLength} a ${USERNAME_RULES.maxLength} letras o números.`}
          autoComplete="username"
          maxLength={USERNAME_RULES.maxLength + 4}
        />
        <PasswordField
          label="Contraseña"
          value={password}
          onChange={(value) => {
            onFields((current) => ({ ...current, password: value }));
            setErrors((current) => ({ ...current, password: null, form: null }));
          }}
          error={errors.password}
          hint="8 caracteres o más. Guardala bien: como no pedimos email, no se puede recuperar."
          autoComplete="new-password"
        />
        <ArticleChoice
          value={article}
          onChange={(value) => {
            onFields((current) => ({ ...current, article: value }));
            setErrors((current) => ({ ...current, article: null, form: null }));
          }}
          error={errors.article}
        />
        <div className="mt-auto px-5 pt-5">
          {errors.form && (
            <p role="alert" className="mb-3 rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-sm">
              {errors.form}
            </p>
          )}
          <Button type="submit" disabled={sending}>
            {sending ? "Creando tu cuenta…" : "Crear mi cuenta"}
            {!sending && <ChevronRight className="size-[18px]" strokeWidth={2.6} />}
          </Button>
          <p className="mt-2 text-center text-xs font-semibold text-ink-700">Sin email ni datos personales.</p>
        </div>
      </form>
    </Screen>
  );
}

/** Back here after making the account (from "Tu lugar", say): it's made, so on to where they were going. */
function AlreadySignedIn({ back }: { back: string }) {
  const router = useRouter();
  useEffect(() => router.replace(back), [router, back]);
  return <Screen>{null}</Screen>;
}

/* ───────────── Edit ───────────── */

/** Waits this long for the last change when leaving, before saying it wasn't saved. */
const LEAVE_WAIT_MS = 3000;

/** The editor, saved on every change: no button, and the chip at the top says how it went. */
function EditCharacter({ account, back }: { account: PublicAccount; back: string }) {
  const leave = useLeave(back);
  // The first version's accessory goes to its zone: from here on, every zone is saved as it is.
  const history = useEditorHistory(() => ({ avatar: avatarWithZones(account.avatar), article: account.article }));
  const [status, saver] = useAutosave<EditorState>(async ({ avatar, article }) => {
    const { account: updated } = await accountApi.updateProfile({ avatar, article: article ?? undefined });
    if (updated) saveAccount(updated);
  });
  const [toast, showToast] = useToast(2500);
  // Volver once couldn't save: the second time it leaves anyway.
  const leaveAnyway = useRef(false);
  const leaving = useRef(false);

  // The server answered with an error (an expired session, say): its message goes at the bottom, as before.
  const serverError = status.state === "failed" && status.cause instanceof ApiError ? status.cause : null;

  const change = (next: EditorState, burst?: string) => {
    if (!history.change(next, burst)) return;
    saver.change(next);
    leaveAnyway.current = false;
  };

  const goBack = async () => {
    if (leaving.current) return;
    if (leaveAnyway.current || !saver.pending()) return leave();
    leaving.current = true;
    const saved = await Promise.race([saver.flush(), new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), LEAVE_WAIT_MS))]);
    leaving.current = false;
    if (saved) return leave();
    leaveAnyway.current = true;
    showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: "No se guardó tu personaje" });
  };

  return (
    <Screen fill>
      <Header onBack={() => void goBack()} right={<SaveChip status={status} onRetry={() => void saver.flush()} />} />
      <CharacterEditor
        state={history.state}
        onChange={change}
        onUndo={() => {
          const previous = history.undo();
          if (previous) saver.change(previous);
        }}
        canUndo={history.canUndo}
        name={account.username}
      />
      {serverError && (
        <p role="alert" className="absolute inset-x-5 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-20 rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-md">
          {accountErrorText(serverError)}
        </p>
      )}
      <FloatingToast toast={toast} className={serverError ? "bottom-[calc(env(safe-area-inset-bottom)+96px)]" : "bottom-[calc(env(safe-area-inset-bottom)+24px)]"} />
    </Screen>
  );
}

/** The header's chip while editing (pantallas/06): at rest, saving, saved for 2 s, or without connection (a tap tries again). */
function SaveChip({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const chip = "flex h-[34px] animate-chip-in items-center gap-[7px] rounded-full bg-white text-[13px] font-bold shadow-sm";
  // A server that answered with an error isn't the connection: the message goes below (accountErrorText).
  const failure = status.state === "failed" ? (status.cause instanceof ApiError ? "No se guardó" : "Sin conexión") : "";
  return (
    <div aria-live="polite">
      {status.state === "idle" && <div className={cx(chip, "px-3.5")}>Editar personaje</div>}
      {status.state === "saving" && (
        <div className={cx(chip, "pr-3.5 pl-2 text-ink-700")}>
          <span aria-hidden className="mx-0.5 size-4 animate-spin rounded-full border-[2.5px] border-ink-200 border-t-brand" />
          Guardando…
        </div>
      )}
      {status.state === "saved" && (
        <div className={cx(chip, "pr-3.5 pl-2")}>
          <span aria-hidden className="grid size-5 place-items-center rounded-full bg-success text-white">
            <Check className="size-3" strokeWidth={3.2} />
          </span>
          Guardado
        </div>
      )}
      {status.state === "failed" && (
        <button type="button" onClick={onRetry} aria-label={`${failure}. Tocá para probar de nuevo`} className={cx(chip, "pr-3.5 pl-2 text-danger")}>
          <span aria-hidden className="grid size-5 place-items-center rounded-full bg-danger text-white">
            <X className="size-3" strokeWidth={3.2} />
          </span>
          {failure}
        </button>
      )}
    </div>
  );
}

function SignedOut({ back }: { back: string }) {
  const leave = useLeave(back);
  return (
    <Screen>
      <Header onBack={leave} />
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <Personaje sp="hornero" acc={["anteojos"]} face="wow" size={110} />
        <h1 className="mt-4 font-display text-[28px] leading-tight font-extrabold">No entraste a tu cuenta</h1>
        <p className="mt-2 text-[15px] font-medium text-ink-700">Entrá para cambiar tu personaje.</p>
        <div className="mt-6 w-full">
          <Button href={`/cuenta/entrar?volver=${encodeURIComponent("/cuenta/personaje?editar=1")}`}>Entrar</Button>
        </div>
      </div>
    </Screen>
  );
}
