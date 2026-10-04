import { AVATAR_SPECIES, parseAvatar, type Avatar } from "@repo/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Personaje, type PersonajeProps } from "@/components/personaje/Personaje";
import { SPECIES_NAMES, avatarLook, badgeLook } from "@/components/personaje/avatar";
import { RowBadge } from "@/components/ranking/Ranking";

/*
 * Development only: the model sheet of characters 2.0, to compare by eye
 * with Claude Design's (docs/diseno/handoff-personajes/pantallas/01 and 02).
 * In production it doesn't exist.
 */

export const metadata: Metadata = { title: "Hoja de modelos", robots: { index: false } };

/** Each column, and its reference file's name in the handoff's svg/ folder. */
const COLUMNS: { name: string; where: string; file: string; props: Partial<PersonajeProps> }[] = [
  { name: "Frente", where: "listas, perfil y editor", file: "01-frente", props: {} },
  { name: "¾ derecha", where: "podio y escenas", file: "02-tres-cuartos-der", props: { view: "threeQuarter", facing: "right" } },
  { name: "¾ izquierda", where: "podio y escenas", file: "03-tres-cuartos-izq", props: { view: "threeQuarter", facing: "left" } },
  { name: "Saludo", where: "inicio", file: "04-saludo", props: { pose: "wave" } },
  { name: "Festejo", where: "tu lugar", file: "05-festejo", props: { pose: "cheer" } },
  { name: "Salto", where: "récord, nivel y 1º", file: "06-salto", props: { pose: "jump" } },
  { name: "Corona", where: "festejo de la corona", file: "07-corona", props: { pose: "hugCrown" } },
  { name: "Dormido", where: "descansa, día hecho", file: "08-dormido", props: { pose: "sleep" } },
  { name: "Avatar", where: "filas y chips", file: "09-avatar", props: { badge: true } },
];

/** The design's 8 examples (datos/avatares-ejemplo.json), with the first version's fields filled in. */
const EXAMPLES: { name: string; crown?: boolean; avatar: Partial<Avatar> }[] = [
  { name: "Nico", avatar: { species: "hornero", hair: "copete", face: "anteojos", neck: "bufanda", hand: "mate", background: "azul" } },
  { name: "Tincho", crown: true, avatar: { species: "carpincho", eyes: "dormilon", outfit: "camiseta", outfitColor: "azul", number: 9, background: "dorado" } },
  { name: "Juli", avatar: { species: "gato", color: "violeta", detail: "rosa", eyes: "pestanas", marks: "rayas", head: "mono", hand: "celu", background: "rosa" } },
  { name: "Caro", avatar: { species: "yaguarete", eyes: "almendra", outfit: "buzo", outfitColor: "coral", head: "auriculares", background: "coral" } },
  { name: "Sofi", avatar: { species: "rana", color: "verde", detail: "dorado", eyes: "brillo", marks: "pecas", head: "vincha", hand: "pelota", background: "verde" } },
  { name: "Pato", avatar: { species: "pinguino", eyes: "grandes", hair: "jopo", neck: "monito", hand: "termo", background: "gris" } },
  { name: "LaFlor", avatar: { species: "llama", color: "rosa", detail: "violeta", eyes: "pestanas", head: "sombrero", neck: "panuelo", background: "violeta" } },
  { name: "Colo_88", avatar: { species: "perro", color: "dorado", marks: "parche", outfit: "rayada", outfitColor: "azul", head: "gorra", hand: "banderin", background: "azul" } },
];

const CAST_COLUMNS = COLUMNS.filter((column) => ["Frente", "¾ derecha", "Saludo", "Salto", "Corona", "Avatar"].includes(column.name));

/** `file`: the reference to compare with (scripts/qa/personajes.cjs). */
function Cell({ props, file }: { props: PersonajeProps; file: string }) {
  return (
    <td className="px-2 py-3 text-center align-bottom" data-reference={file}>
      <div className="inline-block">
        <Personaje {...props} size={props.badge ? 76 : 84} />
      </div>
    </td>
  );
}

export default function DevCharacters() {
  if (process.env.NODE_ENV === "production") notFound();
  const cast = EXAMPLES.map(({ name, crown, avatar }) => ({ name, crown, avatar: parseAvatar({ color: "natural", accessory: null, ...avatar })! }));
  return (
    <main className="min-h-dvh bg-[#F1F2FA] p-8 text-ink">
      <h1 className="font-display text-4xl font-extrabold tracking-[-.02em]">Hoja de modelos</h1>
      <p className="mt-1 text-sm font-semibold text-ink-500">Solo en desarrollo. Compará con docs/diseno/handoff-personajes/pantallas.</p>

      <table className="mt-6 border-separate border-spacing-0 rounded-3xl bg-white shadow-md">
        <thead>
          <tr>
            <th />
            {COLUMNS.map((column) => (
              <th key={column.name} className="px-2 pt-4 text-center">
                <span className="block font-display text-[15px] font-extrabold">{column.name}</span>
                <span className="block text-[10px] font-semibold text-ink-500">{column.where}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {AVATAR_SPECIES.map((sp) => (
            <tr key={sp} className="border-t border-surface-2">
              <th className="px-4 text-left font-display text-[17px] font-extrabold">{SPECIES_NAMES[sp]}</th>
              {COLUMNS.map((column) => (
                <Cell key={column.name} props={{ sp, ...column.props }} file={`especies/${sp}/${column.file}`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-10 font-display text-3xl font-extrabold tracking-[-.02em]">Con todo puesto</h2>
      <table className="mt-4 border-separate border-spacing-0 rounded-3xl bg-white shadow-md">
        <tbody>
          {cast.map(({ name, crown, avatar }) => (
            <tr key={name}>
              <th className="px-4 text-left font-display text-[17px] font-extrabold">{name}</th>
              {CAST_COLUMNS.map((column) => (
                <Cell
                  key={column.name}
                  props={{ ...(column.props.badge ? badgeLook(avatar) : avatarLook(avatar)), crown, ...column.props }}
                  file={`ejemplos/${name.toLowerCase()}/${column.file}`}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-10 font-display text-3xl font-extrabold tracking-[-.02em]">En las filas</h2>
      <div className="mt-4 flex gap-4 rounded-3xl bg-white p-4 shadow-md">
        {cast.map(({ name, avatar }, i) => (
          <div key={name} className="flex flex-col items-center gap-1 text-xs font-bold">
            <RowBadge avatar={avatar} played={i !== 5} />
            {name}
          </div>
        ))}
      </div>
    </main>
  );
}
