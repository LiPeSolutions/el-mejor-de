import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { Personaje } from "@/components/personaje/Personaje";

export const metadata: Metadata = { title: "Grupos" };

export default function GroupsPage() {
  return (
    <ComingSoon title="Grupos" character={<Personaje sp="zorro" size={120} acc={["bufanda"]} scarf="#E2504C" anim="float" />}>
      Armá grupos privados con tus amigos, tu familia o la gente del trabajo, con su propio ranking y su propia corona.
    </ComingSoon>
  );
}
