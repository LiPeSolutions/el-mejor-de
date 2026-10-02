import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { Personaje } from "@/components/personaje/Personaje";

export const metadata: Metadata = { title: "Perfil" };

export default function ProfilePage() {
  return (
    <ComingSoon title="Perfil" character={<Personaje sp="hornero" size={120} acc={["anteojos"]} face="joy" anim="float" />}>
      Tu cuenta, tu personaje y tus coronas. Mientras tanto, tus puntos y tu racha quedan guardados en este teléfono.
    </ComingSoon>
  );
}
