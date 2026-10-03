"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { lastUsername } from "@/lib/account";
import { accountErrorText } from "@/lib/account-copy";
import { useIsClient } from "@/lib/hooks";
import { signIn } from "@/lib/session";
import { PasswordField, TextField } from "./fields";

/** "Entrar": apodo and password. */
export function SignInForm({ back }: { back: string }) {
  const isClient = useIsClient();
  // The last apodo used here comes from localStorage: fill it in once in the browser.
  if (!isClient) return <Screen>{null}</Screen>;
  return <Form back={back} />;
}

function Form({ back }: { back: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(() => lastUsername() ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("Escribí tu apodo y tu contraseña.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await signIn(username, password);
      router.replace(back);
    } catch (cause) {
      setError(accountErrorText(cause));
      setSending(false);
    }
  };

  return (
    <Screen clouds={["-left-[60px] top-[150px] w-[180px] opacity-95", "-right-[70px] top-[60px] w-[200px] opacity-95"]}>
      <form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="px-5">
          <IconButton label="Volver" onClick={() => (window.history.length > 1 ? router.back() : router.push(back))}>
            <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
          </IconButton>
        </div>
        <div className="flex flex-col items-center px-6 pt-4 pb-2 text-center">
          <Personaje sp="hornero" acc={["anteojos"]} face="joy" size={96} anim="bob" />
          <h1 className="mt-3 font-display text-[30px] leading-[1.1] font-extrabold tracking-[-.03em]">¡Hola de nuevo!</h1>
          <p className="mt-2 text-[15px] leading-[1.45] font-medium text-ink-700">Entrá con tu apodo y tu contraseña.</p>
        </div>
        <TextField label="Tu apodo" value={username} onChange={setUsername} autoComplete="username" maxLength={40} />
        <PasswordField label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="px-5 pt-2">
          <button type="button" onClick={() => setForgotOpen((open) => !open)} className="px-1 text-[13px] font-bold text-brand" aria-expanded={forgotOpen}>
            ¿Te olvidaste la contraseña?
          </button>
          {forgotOpen && (
            <p className="mt-2 rounded-row bg-white px-4 py-3 text-[13px] leading-[1.45] font-semibold text-ink-700 shadow-sm">
              Como no pedimos email, por ahora no se puede recuperar. Muy pronto vas a poder vincular tu cuenta con Google para no perderla.
            </p>
          )}
        </div>
        <div className="mt-auto px-5 pt-5">
          {error && (
            <p role="alert" className="mb-3 rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={sending}>
            {sending ? "Entrando…" : "Entrar"}
          </Button>
          <p className="mt-3 text-center text-sm font-semibold text-ink-700">
            ¿No tenés cuenta?{" "}
            <Link href={`/cuenta/crear?volver=${encodeURIComponent(back)}`} replace className="font-extrabold text-brand">
              Creá una
            </Link>
          </p>
        </div>
      </form>
    </Screen>
  );
}
