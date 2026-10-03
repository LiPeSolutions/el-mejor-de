import type { Metadata } from "next";
import { CrownCelebration } from "@/components/crowns/CrownCelebration";

export const metadata: Metadata = { title: "¡Tu corona!" };

/** The Monday celebration; `?id=` shows a crown of the palmarés again. */
export default async function CrownPage(props: PageProps<"/corona">) {
  const { id } = await props.searchParams;
  return <CrownCelebration id={typeof id === "string" ? id : undefined} />;
}
