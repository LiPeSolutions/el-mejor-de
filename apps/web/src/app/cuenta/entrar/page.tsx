import type { Metadata } from "next";
import { SignInForm } from "@/components/account/SignInForm";
import { safeReturnPath } from "@/lib/paths";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage(props: PageProps<"/cuenta/entrar">) {
  const { volver } = await props.searchParams;
  return <SignInForm back={safeReturnPath(volver)} />;
}
