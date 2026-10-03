import type { Metadata } from "next";
import { JoinGroup } from "@/components/groups/JoinGroup";
import { brand } from "@/config/brand";

/*
 * The link preview stays generic: the name of the group only shows on the
 * page, to whoever has the code (the API limits wrong guesses).
 */
export const metadata: Metadata = {
  title: "Te invitaron a un grupo",
  description: `Sumate al grupo en ${brand.name}: 3 retos por día, su propio ranking y una corona cada semana.`,
  openGraph: {
    title: `Te invitaron a un grupo de ${brand.name}`,
    description: "3 retos por día, su propio ranking y una corona cada semana. ¿Quién es el mejor?",
  },
};

/** Codes are letters, digits and a dash; anything else in the address is dropped. */
function cleanCode(raw: string): string {
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    // A broken %-sequence: keep it as it came.
  }
  return text.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
}

export default async function InvitationPage(props: PageProps<"/g/[codigo]">) {
  const { codigo } = await props.params;
  return <JoinGroup code={cleanCode(codigo)} />;
}
