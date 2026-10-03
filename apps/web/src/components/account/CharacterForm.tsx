"use client";

import {
  AVATAR_ACCESSORIES,
  AVATAR_COLORS,
  AVATAR_SPECIES,
  DEFAULT_AVATAR,
  USERNAME_RULES,
  checkPassword,
  checkUsername,
  type Article,
  type Avatar,
  type AvatarAccessory,
} from "@repo/shared";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { COLOR_NAMES, SPECIES_NAMES, avatarLook, swatchColor } from "@/components/personaje/avatar";
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
import { Choices, PasswordField, TextField } from "./fields";

const ACCESSORY_NAMES: Record<AvatarAccessory, string> = {
  boina: "Boina",
  gorra: "Gorra",
  anteojos: "Anteojos",
  bufanda: "Bufanda",
  mate: "Mate",
};

/** "Apodo y personaje" (design 18): creates the account, or edits the character with `mode="edit"`. */
export function CharacterForm({ mode, back }: { mode: "create" | "edit"; back: string }) {
  const account = useAccount();
  if (account === undefined) return <Screen>{null}</Screen>;
  if (mode === "edit") return account ? <EditCharacter account={account} back={back} /> : <SignedOut back={back} />;
  return <CreateAccount back={back} />;
}

/* ───────────── Pieces ───────────── */

function Header({ back, label }: { back: string; label?: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between px-5">
      <IconButton label="Volver" onClick={() => (window.history.length > 1 ? router.back() : router.push(back))}>
        <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
      </IconButton>
      {label && <div className="flex h-[34px] items-center rounded-full bg-white px-3.5 text-[13px] font-bold shadow-sm">{label}</div>}
    </div>
  );
}

const articleText = (article: Article) => (article === "la" ? "La Mejor de…" : "El Mejor de…");

/** The blue tile with the character as it's being built. */
function CharacterHero({ avatar, name, article }: { avatar: Avatar; name?: string; article: Article | null }) {
  return (
    <div className="relative mx-5 mt-3.5 flex min-h-[168px] items-end justify-between overflow-hidden rounded-hero bg-hero-brand px-[18px] pt-4 text-white shadow-hero">
      <span aria-hidden className="absolute inset-0 bg-hero-glow" />
      <Cloud className="-right-[30px] -bottom-[30px] w-[200px] opacity-95" />
      <div className="relative min-w-0 pb-[18px]">
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

function CharacterPicker({ avatar, onChange }: { avatar: Avatar; onChange: (avatar: Avatar) => void }) {
  return (
    <>
      <Choices
        label="Elegí tu bicho"
        options={AVATAR_SPECIES}
        value={avatar.species}
        onChange={(species) => onChange({ ...avatar, species })}
        render={(species) => ({
          label: SPECIES_NAMES[species],
          content: (
            <span className="block h-9 w-[30px]">
              <Personaje sp={species} size={30} />
            </span>
          ),
        })}
      />
      <Choices
        label="Color"
        options={AVATAR_COLORS}
        value={avatar.color}
        onChange={(color) => onChange({ ...avatar, color })}
        cellClassName="aspect-square max-w-[34px] rounded-full"
        render={(color) => ({
          label: COLOR_NAMES[color],
          content: <span className="size-full rounded-full" style={{ background: swatchColor(color, avatar.species) }} />,
        })}
      />
      <Choices
        label="Accesorio"
        options={[null, ...AVATAR_ACCESSORIES]}
        value={avatar.accessory}
        onChange={(accessory) => onChange({ ...avatar, accessory })}
        render={(accessory) => ({
          label: accessory ? ACCESSORY_NAMES[accessory] : "Nada",
          caption: accessory ? ACCESSORY_NAMES[accessory] : "Nada",
          content: (
            <span className="block h-9 w-[30px]">
              <Personaje {...avatarLook({ ...avatar, accessory })} size={30} />
            </span>
          ),
        })}
      />
    </>
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

interface Errors {
  username?: string | null;
  password?: string | null;
  article?: string | null;
  form?: string | null;
}

function CreateAccount({ back }: { back: string }) {
  const router = useRouter();
  // Step 2 is the place, except for whoever comes to join a group: that goes first.
  const withPlace = !back.startsWith("/g/");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [article, setArticle] = useState<Article | null>(null);
  const [avatar, setAvatar] = useState<Avatar>(DEFAULT_AVATAR);
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
      router.replace(withPlace ? placePath({ back, signup: true }) : back);
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
        <Header back={back} label={withPlace ? "Paso 1 de 2" : "Tu cuenta"} />
        <CharacterHero avatar={avatar} name={local.ok ? local.username : undefined} article={article} />
        <TextField
          label="Tu apodo"
          value={username}
          onChange={(value) => {
            setUsername(value);
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
            setPassword(value);
            setErrors((current) => ({ ...current, password: null, form: null }));
          }}
          error={errors.password}
          hint="8 caracteres o más. Guardala bien: como no pedimos email, no se puede recuperar."
          autoComplete="new-password"
        />
        <ArticleChoice
          value={article}
          onChange={(value) => {
            setArticle(value);
            setErrors((current) => ({ ...current, article: null, form: null }));
          }}
          error={errors.article}
        />
        <CharacterPicker avatar={avatar} onChange={setAvatar} />
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

/* ───────────── Edit ───────────── */

function EditCharacter({ account, back }: { account: PublicAccount; back: string }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<Avatar>(account.avatar);
  const [article, setArticle] = useState<Article>(account.article);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const save = async () => {
    setSending(true);
    setError(null);
    try {
      const { account: updated } = await accountApi.updateProfile({ avatar, article });
      if (updated) saveAccount(updated);
      router.replace(back);
    } catch (cause) {
      setError(accountErrorText(cause));
      setSending(false);
    }
  };

  return (
    <Screen clouds={["-right-[60px] top-[300px] w-[170px] opacity-95"]}>
      <Header back={back} label="Editar personaje" />
      <CharacterHero avatar={avatar} name={account.username} article={article} />
      <ArticleChoice value={article} onChange={setArticle} />
      <CharacterPicker avatar={avatar} onChange={setAvatar} />
      <div className="mt-auto px-5 pt-5">
        {error && (
          <p role="alert" className="mb-3 rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-sm">
            {error}
          </p>
        )}
        <Button onClick={() => void save()} disabled={sending}>
          {sending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </Screen>
  );
}

function SignedOut({ back }: { back: string }) {
  return (
    <Screen>
      <Header back={back} />
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
