import type { Metadata } from "next";
import { CharacterForm } from "@/components/account/CharacterForm";
import { safeReturnPath } from "@/lib/paths";

export const metadata: Metadata = { title: "Tu personaje" };

/** Apodo, password and character to create the account; `?editar=1` changes the character. */
export default async function CharacterPage(props: PageProps<"/cuenta/personaje">) {
  const { volver, editar } = await props.searchParams;
  const mode = editar ? "edit" : "create";
  return <CharacterForm mode={mode} back={safeReturnPath(volver, mode === "edit" ? "/perfil" : "/")} />;
}
