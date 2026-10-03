import type { Metadata } from "next";
import { PlaceFlow } from "@/components/place/PlaceFlow";
import { safeReturnPath } from "@/lib/paths";

export const metadata: Metadata = { title: "Tu lugar" };

/** Where you compete: `?paso=2` right after creating the account, `?verificar=1` for this week's check. */
export default async function PlacePage(props: PageProps<"/cuenta/lugar">) {
  const { volver, paso, verificar } = await props.searchParams;
  return <PlaceFlow back={safeReturnPath(volver)} signup={paso === "2"} verify={verificar === "1"} />;
}
