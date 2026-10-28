import { readFile, writeFile } from "node:fs/promises";

const levelsPath = "main/levels.json";
const outputPath = "main/aredl-ranks.json";
const apiUrl = new URL("https://api.aredl.net/v2/api/aredl/levels");

apiUrl.searchParams.set("exclude_legacy", "true");
apiUrl.searchParams.set("exclude_pending", "true");
apiUrl.searchParams.set("exclude_removed", "true");

const localLevels = JSON.parse(await readFile(levelsPath, "utf8"));

if (!Array.isArray(localLevels)) {
    throw new Error(`${levelsPath} must contain an array`);
}

const response = await fetch(apiUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000)
});

if (!response.ok) {
    throw new Error(`AREDL API returned HTTP ${response.status}`);
}

const aredlLevels = await response.json();

if (!Array.isArray(aredlLevels)) {
    throw new Error("AREDL API response must be an array");
}

const positionsByLevelId = new Map(
    aredlLevels
        .filter(level =>
            level.status === "MainList" &&
            level.two_player !== true &&
            Number.isInteger(level.position) &&
            Number.isInteger(level.level_id)
        )
        .map(level => [String(level.level_id), level.position])
);

const ranks = Object.fromEntries(
    localLevels.flatMap(level => {
        const levelId = String(level.id);
        const position = positionsByLevelId.get(levelId);

        return Number.isInteger(position) ? [[levelId, position]] : [];
    })
);

if (Object.keys(ranks).length === 0) {
    throw new Error("No local levels matched the AREDL list; snapshot was not updated");
}

const snapshot = {
    source: "https://aredl.net/list",
    updated: new Date().toISOString().slice(0, 10),
    ranks
};

await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Updated ${Object.keys(ranks).length} AREDL ranks in ${outputPath}`);
