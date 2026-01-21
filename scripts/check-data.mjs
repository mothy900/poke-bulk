import fs from "node:fs/promises";

async function checkData() {
  try {
    const data = JSON.parse(
      await fs.readFile("src/data/pokemon/species-meta.json", "utf8")
    );

    console.log("📊 Current data analysis:");
    console.log(`Total entries: ${Object.keys(data).length}`);

    // 가장 높은 ID 찾기
    let maxId = 0;
    let maxIdEntry = null;

    for (const [key, entry] of Object.entries(data)) {
      if (entry.id > maxId) {
        maxId = entry.id;
        maxIdEntry = entry;
      }
    }

    console.log(`Highest ID: ${maxId}`);
    console.log(`Highest ID entry:`, maxIdEntry);

    // 최근 포켓몬들 확인 (ID > 1000)
    const recentPokemon = Object.entries(data)
      .filter(([key, entry]) => entry.id > 1000)
      .sort((a, b) => b[1].id - a[1].id)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key,
        id: entry.id,
        name: entry.names?.ko || entry.names?.en || "Unknown",
        form: entry.form,
      }));

    console.log("🆕 Recent pokemon (ID > 1000):");
    recentPokemon.forEach((p) => {
      console.log(`  ${p.id}: ${p.name} (${p.form})`);
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

    for (const [key, entry] of Object.entries(data)) {
      const name = entry.names?.ko || entry.names?.en || "";
      if (targetNames.some((target) => name.includes(target))) {
        foundPokemon.push({
          key,
          id: entry.id,
          name: name,
          form: entry.form,
        });
      }
    }

    console.log("🎯 Target pokemon found:");
    foundPokemon.forEach((p) => {
      console.log(`  ${p.id}: ${p.name} (${p.form}) - ${p.key}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkData();

