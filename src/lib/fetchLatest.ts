// src/lib/fetchLatest.ts
const GM_URL =
  "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json";

type BaseStat = {
  speciesId: string;
  form: string;
  atk: number;
  def: number;
  sta: number;
};

function normForm(form?: string) {
  if (!form) return "NORMAL";
  return String(form).toUpperCase();
}
function toId(x: unknown) {
  return String(x || "").toLowerCase();
}
function pickStats(s: any) {
  const atk = s?.base_attack ?? s?.baseAttack;
  const def = s?.base_defense ?? s?.baseDefense;
  const sta = s?.base_stamina ?? s?.baseStamina;
  return atk != null && def != null && sta != null ? { atk, def, sta } : null;
}

export async function fetchLatestBaseStats(): Promise<{
  data: BaseStat[];
  meta: any;
}> {
  const res = await fetch(GM_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("GM fetch failed: " + res.status);
  const gm = await res.json();

  const out: BaseStat[] = [];
  for (const t of gm) {
    const data = t.data ?? t;
    const ps = data.pokemon_settings ?? data.pokemonSettings;
    if (!ps) continue;
    const stats = pickStats(ps.stats ?? ps.baseStats);
    if (!stats) continue;
    const pid = ps.pokemon_id ?? ps.pokemonId;
    const form = normForm(ps.form ?? ps.form_value ?? ps.formValue);
    out.push({ speciesId: toId(pid), form, ...stats });
  }
  // uniq + sort
  const uniq = new Map<string, BaseStat>();
  for (const r of out) uniq.set(`${r.speciesId}__${r.form}`, r);
  const final = Array.from(uniq.values()).sort(
    (a, b) =>
      a.speciesId.localeCompare(b.speciesId) || a.form.localeCompare(b.form)
  );

  return {
    data: final,
    meta: {
      source: "PokeMiners Game Master",
      url: GM_URL,
      fetchedAt: new Date().toISOString(),
      count: final.length,
    },
  };
}
