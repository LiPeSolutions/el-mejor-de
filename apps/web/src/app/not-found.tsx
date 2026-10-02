import { House } from "lucide-react";
import { Personaje } from "@/components/personaje/Personaje";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";

export default function NotFound() {
  return (
    <Screen clouds={["-right-[60px] top-[110px] w-[180px] opacity-95", "-left-[50px] bottom-[150px] w-[220px] opacity-95"]}>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <Personaje sp="rana" size={110} face="wow" anim="bob" />
        <h1 className="mt-5 font-display text-[30px] leading-[1.05] font-extrabold tracking-[-.03em]">Acá no hay nada</h1>
        <p className="mt-3 text-[15px] leading-[1.45] font-medium text-ink-700">Esta página no existe. Volvé al inicio y jugá los retos de hoy.</p>
      </div>
      <div className="px-5">
        <Button href="/">
          <House className="size-5" strokeWidth={2.4} />
          Ir al inicio
        </Button>
      </div>
    </Screen>
  );
}
