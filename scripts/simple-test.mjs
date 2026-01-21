// 간단한 테스트 스크립트
console.log("🔍 Testing API endpoints...");

const SOURCES = {
  stats: "https://pogoapi.net/api/v1/pokemon_stats.json",
  released: "https://pogoapi.net/api/v1/released_pokemon.json",
};

async function testAPI(url) {
  try {
    console.log(`Fetching ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log(
      `✅ Success: ${
        Array.isArray(data) ? data.length : Object.keys(data).length
      } items`
    );
    return data;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("Starting API tests...");

  const statsData = await testAPI(SOURCES.stats);
  const releasedData = await testAPI(SOURCES.released);

  if (statsData && releasedData) {
    console.log("\n📊 Analysis:");
    console.log(`Total stats entries: ${statsData.length}`);
    console.log(`Released pokemon count: ${Object.keys(releasedData).length}`);

    // 최근 포켓몬들 확인
    const recentPokemon = statsData
      .filter((entry) => entry.pokemon_id > 1000)
      .slice(-10)
      .map((entry) => ({
        id: entry.pokemon_id,
        name: entry.pokemon_name,
        form: entry.form,
        released: releasedData[entry.pokemon_id] ? "yes" : "no",
      }));

    console.log("\n🆕 Recent pokemon (ID > 1000):");
    recentPokemon.forEach((p) => {
      console.log(`  ${p.id}: ${p.name} (${p.form}) - Released: ${p.released}`);
    });

    // 특정 포켓몬들 찾기
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
          released: releasedData[entry.pokemon_id] ? "yes" : "no",
        });
      }
    }

    console.log("\n🎯 Target pokemon found:");
    foundPokemon.forEach((p) => {
      console.log(`  ${p.id}: ${p.name} (${p.form}) - Released: ${p.released}`);
    });
  }
}

main().catch(console.error);

