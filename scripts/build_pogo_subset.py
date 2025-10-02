"""Build Pokemon GO subset data files.

This script fetches Game Master + name data and writes two JSON snapshots:
  * species-meta.json (full stats keyed by "<dex>__<FORM>")
  * name-index.json (lookup map keyed by localized names)

Usage requires Python 3.8+.
"""
from textwrap import dedent
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
import json
import re
import argparse
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_PATH = ROOT_DIR / "src" / "data" / "pokemon" / "species-meta.json"
DEFAULT_INDEX_PATH = ROOT_DIR / "src" / "data" / "pokemon" / "name-index.json"

DEFAULT_ID_BLOCK = dedent("""\
1-1025
""")

GM_URL = "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json"
EN_URL = "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/en.json"
KO_URL = "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/ko.json"

DEFAULT_FORMS_ORDER = [
    "NORMAL",
    "STANDARD",
    "INCARNATE",
    "ORDINARY",
    "ARIA",
    "OVERCAST",
    "AVERAGE",
]


def http_get_json(url: str):
    print(f"[fetch] GET {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "pvp-bulk-builder/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    payload = json.loads(data.decode("utf-8"))
    if isinstance(payload, dict):
        size = len(payload)
        print(f"[fetch] {url} -> dict with {size} keys")
    elif isinstance(payload, list):
        size = len(payload)
        print(f"[fetch] {url} -> list with {size} items")
    else:
        print(f"[fetch] {url} -> {type(payload).__name__}")
    return payload


def parse_id_block(block: str) -> List[int]:
    ids = set()
    for line in block.strip().splitlines():
        s = line.strip()
        if not s:
            continue
        if "-" in s:
            a, b = s.split("-", 1)
            a = int(a.strip())
            b = int(b.strip())
            lo, hi = (a, b) if a <= b else (b, a)
            for n in range(lo, hi + 1):
                ids.add(n)
        else:
            ids.add(int(s))
    return sorted(ids)


def normalize_form(form: Optional[str]) -> str:
    if not form:
        return "NORMAL"
    f = str(form).upper()
    repl = {
        "ALOLAN": "ALOLA",
        "GALARIAN": "GALAR",
        "HISUIAN": "HISUI",
        "ORDINARY": "ORDINARY",
        "INCARNATE": "INCARNATE",
        "ARIA": "ARIA",
        "STANDARD": "STANDARD",
        "THERIAN": "THERIAN",
        "SPEED": "SPEED",
        "MEGA": "MEGA",
        "MEGA_X": "MEGA_X",
        "MEGA_Y": "MEGA_Y",
        "OVERCAST": "OVERCAST",
        "SUNNY": "SUNNY",
        "RAINCLOUD": "RAINCLOUD",
        "SNOWCLOUD": "SNOWCLOUD",
        "SMALL": "SMALL",
        "AVERAGE": "AVERAGE",
        "LARGE": "LARGE",
        "SUPER": "SUPER",
    }
    f = f.replace("FORM_", "").replace("FORM", "").replace("__", "_").strip("_- ")
    return repl.get(f, f)


def pick_stats(stats_obj: Optional[Dict[str, Any]]) -> Optional[Dict[str, int]]:
    if not stats_obj:
        return None
    atk = stats_obj.get("base_attack", stats_obj.get("baseAttack"))
    deff = stats_obj.get("base_defense", stats_obj.get("baseDefense"))
    sta = stats_obj.get("base_stamina", stats_obj.get("baseStamina"))
    if None in (atk, deff, sta):
        return None
    return {"attack": int(atk), "defense": int(deff), "stamina": int(sta)}


def has_evolution(ps: Dict[str, Any]) -> bool:
    branches = ps.get("evolution_branch") or ps.get("evolutionBranch")
    if isinstance(branches, list) and branches:
        return True
    evolutions = ps.get("evolutions")
    if isinstance(evolutions, list) and evolutions:
        return True
    evolution_ids = ps.get("evolution_ids") or ps.get("evolutionIds")
    if isinstance(evolution_ids, list) and evolution_ids:
        return True
    return False


def name_from_list(lang_list: List[str], dex_id: int) -> Optional[str]:
    if 1 <= dex_id <= len(lang_list):
        return lang_list[dex_id - 1]
    return None


def build_full_mapping(target_ids: List[int], include_all_forms: bool) -> Dict[str, Any]:
    gm = http_get_json(GM_URL)
    en_list = http_get_json(EN_URL)
    ko_list = http_get_json(KO_URL)

    by_id: Dict[int, List[Dict[str, Any]]] = {}
    for t in gm:
        data = t.get("data", t)
        ps = data.get("pokemon_settings", data.get("pokemonSettings"))
        if not ps:
            continue
        ti = (t.get("template_id") or t.get("templateId") or "")
        m = re.match(r"^V(\d{4,})_POKEMON", ti)
        dex: Optional[int] = None
        if m:
            dex = int(m.group(1))
        if dex is None:
            pn = ps.get("pokedex_number") or ps.get("pokedexNumber")
            if isinstance(pn, int):
                dex = pn
        if dex is None:
            continue

        stats = pick_stats(ps.get("stats", ps.get("baseStats")))
        if stats is None:
            continue

        form_raw = ps.get("form") or ps.get("form_value") or ps.get("formValue")
        form = normalize_form(form_raw)
        entry = {"dex": dex, "form": form, "stats": stats, "has_evolution": has_evolution(ps)}
        by_id.setdefault(dex, []).append(entry)

    out: Dict[str, Any] = {}

    for dex in target_ids:
        en_name = name_from_list(en_list, dex) or ""
        ko_name = name_from_list(ko_list, dex) or ""
        aliases = sorted({en_name, ko_name}) if en_name or ko_name else []

        forms = by_id.get(dex, [])
        if not forms:
            continue

        species_has_evo = any(e.get("has_evolution") for e in forms)

        if include_all_forms:
            for e in forms:
                f = e["form"] or "NORMAL"
                key = f"{dex}__{f}"
                out[key] = {
                    "id": dex,
                    "form": f,
                    "names": {"en": en_name, "ko": ko_name},
                    "aliases": aliases,
                    "stats": e["stats"],
                    "hasEvolution": species_has_evo,
                }
        else:
            chosen = None
            for pref in DEFAULT_FORMS_ORDER:
                chosen = next((e for e in forms if e["form"] == pref), None)
                if chosen:
                    break
            if not chosen:
                chosen = next((e for e in forms if e.get("stats")), forms[0])
            f = chosen["form"] or "NORMAL"
            key = f"{dex}__{f}"
            out[key] = {
                "id": dex,
                "form": f,
                "names": {"en": en_name, "ko": ko_name},
                "aliases": aliases,
                "stats": chosen.get("stats"),
                "hasEvolution": species_has_evo,
            }

    return out


def choose_default_ptrs(full_map: Dict[str, Any]) -> Dict[int, str]:
    """Pick one pointer per dex id according to DEFAULT_FORMS_ORDER."""
    by_id: Dict[int, List[Tuple[str, str]]] = {}
    for ptr, v in full_map.items():
        dex = int(v["id"])
        form = v.get("form") or "NORMAL"
        by_id.setdefault(dex, []).append((ptr, form))

    chosen: Dict[int, str] = {}
    for dex, lst in by_id.items():
        ptr = None
        for pref in DEFAULT_FORMS_ORDER:
            found = [p for (p, f) in lst if f == pref]
            if found:
                ptr = found[0]
                break
        if not ptr:
            ptr = lst[0][0]
        chosen[dex] = ptr
    return chosen


def build_name_index(full_map: Dict[str, Any], lowercase_keys: bool) -> Dict[str, Dict[str, str]]:
    chosen_ptr = choose_default_ptrs(full_map)
    id_to_names: Dict[int, Tuple[str, str]] = {}
    for ptr, v in full_map.items():
        dex = int(v["id"])
        if dex not in id_to_names:
            nm = v.get("names", {})
            id_to_names[dex] = (nm.get("en") or "", nm.get("ko") or "")

    idx: Dict[str, Dict[str, str]] = {}
    for dex, ptr in chosen_ptr.items():
        en, ko = id_to_names.get(dex, ("", ""))
        for name in (en, ko):
            if not name:
                continue
            key = name.lower() if lowercase_keys else name
            if key not in idx:
                idx[key] = {"ref": ptr, "display": name}
    return idx


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Build Pokemon GO subset mapping with stats and a name index"
    )
    grp = parser.add_mutually_exclusive_group()
    grp.add_argument(
        "--ids",
        help="Comma/space-separated IDs and ranges (e.g., '1, 3-5, 10')",
    )
    grp.add_argument(
        "--ids-file",
        help="Path to a text file with IDs/ranges (one per line)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default=str(DEFAULT_OUTPUT_PATH),
        help="Output JSON path for the full mapping",
    )
    parser.add_argument(
        "--index-output",
        default=str(DEFAULT_INDEX_PATH),
        help="Output JSON path for the name index",
    )
    parser.add_argument(
        "--only-normal",
        action="store_true",
        help="Emit only a single default/NORMAL-like form per species for the full mapping",
    )
    parser.add_argument(
        "--lc-keys",
        action="store_true",
        help="Lowercase keys in the name index (recommended for lookups)",
    )
    args = parser.parse_args(argv)

    if args.ids_file:
        block = Path(args.ids_file).read_text(encoding="utf-8")
    elif args.ids:
        cleaned = re.sub(r"[ ,]+", "\n", args.ids.strip())
        block = cleaned
    else:
        block = DEFAULT_ID_BLOCK

    target_ids = parse_id_block(block)
    include_all_forms = not args.only_normal

    full = build_full_mapping(target_ids, include_all_forms=include_all_forms)
    full_path = Path(args.output)
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_text(json.dumps(full, ensure_ascii=False, indent=2), encoding="utf-8")

    name_index = build_name_index(full, lowercase_keys=args.lc_keys)
    index_path = Path(args.index_output)
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(
        json.dumps(name_index, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"Wrote {full_path} ({len(full)} entries)")
    print(f"Wrote {index_path} ({len(name_index)} keys)")


if __name__ == "__main__":
    main()
