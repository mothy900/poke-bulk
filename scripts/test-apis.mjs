// API 테스트 스크립트
const SOURCES = {
  stats: "https://pogoapi.net/api/v1/pokemon_stats.json",
  released: "https://pogoapi.net/api/v1/released_pokemon.json",
  en: "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/en.json",
  ko: "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/ko.json",
};

async function getJSON(url) {
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json();
}

async function testAPIs() {
  try {
    console.log("🔍 Testing APIs...");

    // 1. Released pokemon 확인
    const released = await getJSON(SOURCES.released);
    console.log(`📦 Released pokemon count: ${Object.keys(released).length}`);

    // 2. Stats data 확인
    const statsData = await getJSON(SOURCES.stats);
    console.log(`📊 Stats data count: ${statsData.length}`);

    // 3. 특정 포켓몬들 찾기
    const targetNames = [
      "자시안",
      "자마젠타",
      "노노고치",
      "키키링",
      "파말리쥐",
    ];
    const foundPokemon = [];

    for (const entry of statsData) {
      const name = entry.pokemon_name;
      if (
        targetNames.some(
          (target) => name && name.toLowerCase().includes(target.toLowerCase())
        )
      ) {
        foundPokemon.push({
          id: entry.pokemon_id,
          name: name,
          form: entry.form,
          released: released[entry.pokemon_id] ? "yes" : "no",
        });
      }
    }

    console.log(`🎯 Found target pokemon:`, foundPokemon);

    // 4. 한국어 이름 확인
    const koList = await getJSON(SOURCES.ko);
    console.log(`🇰🇷 Korean names count: ${koList.length}`);

    // 5. 최근 추가된 포켓몬들 확인 (높은 ID)
    const recentPokemon = statsData
      .filter((entry) => entry.pokemon_id > 1000)
      .slice(-10)
      .map((entry) => ({
        id: entry.pokemon_id,
        name: entry.pokemon_name,
        form: entry.form,
        released: released[entry.pokemon_id] ? "yes" : "no",
      }));

    console.log(`🆕 Recent pokemon (last 10 with ID > 1000):`, recentPokemon);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testAPIs();

