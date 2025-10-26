/**
 * 이 파일은 scripts/generateFieldPokemon.mjs 스크립트로 생성되었습니다.
 * 데이터를 수정하려면 scripts/field-sources.json 을 편집한 뒤
 * `npm run generate:field` 를 실행하세요.
 */
export type FieldSource = "event" | "season" | "nest" | "raid";

export interface FieldPokemonEntry {
  pointer: string;
  imageUrl: string;
  sources: FieldSource[];
  notes?: string;
}

export const currentFieldPokemon: FieldPokemonEntry[] = [
  {
    pointer: "92__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/92.png",
    sources: ["event"],
  },
  {
    pointer: "356__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/356.png",
    sources: ["event"],
  },
  {
    pointer: "570__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/570.png",
    sources: ["event"],
  },
  {
    pointer: "355__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/355.png",
    sources: ["event"],
  },
  {
    pointer: "570__HISUIAN",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/570.png",
    sources: ["event"],
  }
];
