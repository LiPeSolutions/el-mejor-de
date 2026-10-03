import type { Metadata } from "next";
import { CreateAccountIntro } from "@/components/account/CreateAccountIntro";
import { safeReturnPath } from "@/lib/paths";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function CreateAccountPage(props: PageProps<"/cuenta/crear">) {
  const { volver } = await props.searchParams;
  return <CreateAccountIntro back={safeReturnPath(volver)} />;
}
