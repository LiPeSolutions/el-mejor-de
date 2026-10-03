import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { Personaje } from "@/components/personaje/Personaje";

export const metadata: Metadata = { title: "Ranking" };

export default function RankingPage() {
  return (
    <ComingSoon
      title="Ranking"
      toGroups
      character={<Personaje sp="pelusa" size={120} acc={["corona"]} c={{ main: "#FF7AA2", light: "#FFD6E3", dark: "#D9557F" }} anim="float" />}
    >
      Acá vas a ver quién es el mejor de tu pueblo, tu provincia, el país y el mundo. Mientras tanto, armá un grupo con los tuyos: tiene su propio
      ranking y su corona.
    </ComingSoon>
  );
}
