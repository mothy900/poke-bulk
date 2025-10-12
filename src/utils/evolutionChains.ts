export interface EvolutionSpecies {
  id: number;
  name: string;
  stage: number;
  order: number;
}

interface SpeciesInfo {
  name: string;
  chainId: string | null;
}

const speciesInfoCache = new Map<number, SpeciesInfo>();
const chainCache = new Map<string, EvolutionSpecies[]>();
const speciesInfoPromises = new Map<number, Promise<SpeciesInfo>>();
const chainPromises = new Map<string, Promise<EvolutionSpecies[]>>();

function extractIdFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : value;
}

async function fetchSpeciesInfo(speciesId: number): Promise<SpeciesInfo> {
  const cached = speciesInfoCache.get(speciesId);
  if (cached) {
    return cached;
  }

  const pending = speciesInfoPromises.get(speciesId);
  if (pending) {
    return pending;
  }

  const promise = fetch(
    `https://pokeapi.co/api/v2/pokemon-species/${speciesId}/`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load species ${speciesId}: ${response.status}`
        );
      }
      return response.json();
    })
    .then((data) => {
      const chainUrl = data?.evolution_chain?.url as string | undefined;
      const chainId = chainUrl ? extractIdFromUrl(chainUrl) : null;
      const info: SpeciesInfo = {
        name: data?.name ?? "",
        chainId: chainId !== null ? String(chainId) : null,
      };
      speciesInfoCache.set(speciesId, info);
      speciesInfoPromises.delete(speciesId);
      return info;
    })
    .catch((error) => {
      speciesInfoPromises.delete(speciesId);
      throw error;
    });

  speciesInfoPromises.set(speciesId, promise);
  return promise;
}

function traverseChain(
  node: any,
  stage: number,
  orderRef: { value: number },
  seen: Set<number>,
  acc: EvolutionSpecies[]
) {
  if (!node?.species?.url) {
    return;
  }

  const id = extractIdFromUrl(node.species.url);
  if (id === null || seen.has(id)) {
    // Avoid duplicates and invalid entries.
    return;
  }

  seen.add(id);
  const evolutionEntry: EvolutionSpecies = {
    id,
    name: node.species.name ?? "",
    stage,
    order: orderRef.value,
  };
  acc.push(evolutionEntry);
  orderRef.value += 1;

  const evolvesTo = Array.isArray(node?.evolves_to) ? node.evolves_to : [];
  for (const child of evolvesTo) {
    traverseChain(child, stage + 1, orderRef, seen, acc);
  }
}

async function fetchChain(chainId: string): Promise<EvolutionSpecies[]> {
  const cached = chainCache.get(chainId);
  if (cached) {
    return cached;
  }

  const pending = chainPromises.get(chainId);
  if (pending) {
    return pending;
  }

  const promise = fetch(`https://pokeapi.co/api/v2/evolution-chain/${chainId}/`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load evolution chain ${chainId}: ${response.status}`
        );
      }
      return response.json();
    })
    .then((data) => {
      const root = data?.chain;
      const result: EvolutionSpecies[] = [];
      const orderRef = { value: 0 };
      const seen = new Set<number>();
      traverseChain(root, 0, orderRef, seen, result);
      chainCache.set(chainId, result);
      chainPromises.delete(chainId);
      return result;
    })
    .catch((error) => {
      chainPromises.delete(chainId);
      throw error;
    });

  chainPromises.set(chainId, promise);
  return promise;
}

export async function fetchEvolutionChain(
  speciesId: number
): Promise<EvolutionSpecies[]> {
  const speciesInfo = await fetchSpeciesInfo(speciesId);
  if (!speciesInfo.chainId) {
    return [
      {
        id: speciesId,
        name: speciesInfo.name,
        stage: 0,
        order: 0,
      },
    ];
  }

  return fetchChain(speciesInfo.chainId);
}

export function clearEvolutionChainCache() {
  speciesInfoCache.clear();
  chainCache.clear();
  speciesInfoPromises.clear();
  chainPromises.clear();
}
