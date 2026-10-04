import type { Metadata } from "next";
import { JoinBattleScreen } from "@/components/battle/JoinBattleScreen";
import { brand } from "@/config/brand";

/* The link preview stays generic: who's in only shows on the page. */
export const metadata: Metadata = {
  title: "Te invitaron a una batalla",
  description: `Una batalla en vivo en ${brand.name}: todos juegan a la vez, cada uno en su celu.`,
  openGraph: {
    title: `Te invitaron a una batalla de ${brand.name}`,
    description: "Todos juegan a la vez, cada uno en su celu. ¿Quién gana?",
  },
};

/** Codes are four letters and digits; anything else in the address is dropped. */
function cleanCode(raw: string): string {
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    // A broken %-sequence: keep it as it came.
  }
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export default async function BattleInvitationPage(props: PageProps<"/b/[codigo]">) {
  const { codigo } = await props.params;
  return <JoinBattleScreen code={cleanCode(codigo)} />;
}
