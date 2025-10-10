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
    pointer: "656__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/656.png",
    sources: ["event"],
  },
  {
    pointer: "559__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/559.png",
    sources: ["raid"],
  },
  {
    pointer: "302__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/302.png",
    sources: ["raid"],
  },
  {
    pointer: "7__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png",
    sources: ["season"],
  },
  {
    pointer: "722__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/722.png",
    sources: ["event"],
    notes: "커뮤니티 데이 준비",
  },
  {
    pointer: "252__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/252.png",
    sources: ["season"],
  },
  {
    pointer: "725__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/725.png",
    sources: ["season"],
  },
  {
    pointer: "554__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/554.png",
    sources: ["raid"],
  },
  {
    pointer: "443__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/443.png",
    sources: ["nest"],
  },
  {
    pointer: "447__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/447.png",
    sources: ["event"],
  },
  {
    pointer: "179__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/179.png",
    sources: ["season"],
  },
  {
    pointer: "374__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/374.png",
    sources: ["nest"],
  },
  {
    pointer: "633__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/633.png",
    sources: ["raid"],
  },
  {
    pointer: "258__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/258.png",
    sources: ["season"],
  },
  {
    pointer: "147__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/147.png",
    sources: ["nest"],
  },
  {
    pointer: "136__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/136.png",
    sources: ["raid"],
  },
  {
    pointer: "197__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/197.png",
    sources: ["raid"],
  },
  {
    pointer: "501__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/501.png",
    sources: ["season"],
  },
  {
    pointer: "255__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/255.png",
    sources: ["season"],
  },
  {
    pointer: "66__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/66.png",
    sources: ["season"],
  },
  {
    pointer: "246__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/246.png",
    sources: ["nest"],
  },
  {
    pointer: "133__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png",
    sources: ["season"],
  },
  {
    pointer: "1__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",
    sources: ["season"],
  },
  {
    pointer: "143__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png",
    sources: ["nest"],
  },
  {
    pointer: "495__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/495.png",
    sources: ["event"],
  },
  {
    pointer: "610__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/610.png",
    sources: ["event"],
    notes: "한정 레이드",
  },
  {
    pointer: "777__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/777.png",
    sources: ["season"],
  },
  {
    pointer: "4__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png",
    sources: ["season"],
  },
  {
    pointer: "215__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/215.png",
    sources: ["raid"],
  },
  {
    pointer: "776__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/776.png",
    sources: ["raid"],
  },
  {
    pointer: "25__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    sources: ["event"],
  },
  {
    pointer: "661__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/661.png",
    sources: ["season"],
  },
  {
    pointer: "485__NORMAL",
    imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/485.png",
    sources: ["raid"],
  }
];
