const CHALLENGE_LEVELS_URL = "./levels.json";
const CHALLENGE_PLAYERS_URL = "../../players.json";
const CHALLENGE_THUMBNAIL_URL =
    "https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards";
const MAX_CHALLENGE_LEVELS = 150;

const challengeLevelsContainer = document.getElementById("challenge-levels");
const challengeLeaderboardContainer =
    document.getElementById("challenge-leaderboard");

function normalizeChallengeValue(value) {
    return String(value).trim().toLowerCase();
}

function renderChallengeLevels(levels) {
    challengeLevelsContainer.replaceChildren();

    if (levels.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "challenge-message";
        emptyMessage.textContent =
            "Lista jest jeszcze pusta. Dodaj wyzwania do pliku lists/challenge/levels.json.";
        challengeLevelsContainer.appendChild(emptyMessage);
        return;
    }

    const levelList = document.createElement("ol");
    levelList.className = "challenge-level-list";

    levels.forEach(level => {
        const item = document.createElement("li");
        item.className = "challenge-level-card";

        const rank = document.createElement("span");
        rank.className = "challenge-level-rank";
        rank.textContent = `#${level.rank}`;

        const image = document.createElement("img");
        image.className = "challenge-level-image";
        image.src = `${CHALLENGE_THUMBNAIL_URL}/${encodeURIComponent(level.id)}.webp`;
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("error", () => {
            image.hidden = true;
        }, { once: true });

        const details = document.createElement("div");
        details.className = "challenge-level-details";

        const name = document.createElement("h3");
        name.textContent = level.name;

        const points = document.createElement("span");
        points.className = "challenge-level-points";
        points.textContent = `${level.points.toLocaleString("pl-PL")} RK`;

        details.append(name, points);
        item.append(rank, image, details);
        levelList.appendChild(item);
    });

    challengeLevelsContainer.appendChild(levelList);
}

function renderChallengeLeaderboard(players, levels) {
    challengeLeaderboardContainer.replaceChildren();

    if (levels.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "challenge-message";
        emptyMessage.textContent =
            "Ranking pojawi się po dodaniu pierwszych wyzwań do Challenge List.";
        challengeLeaderboardContainer.appendChild(emptyMessage);
        return;
    }

    const levelByName = new Map(
        levels.map(level => [normalizeChallengeValue(level.name), level])
    );
    const levelById = new Map(
        levels.map(level => [normalizeChallengeValue(level.id), level])
    );
    const leaderboard = players.map(player => {
        const completions = new Set(
            (Array.isArray(player.ChallengeDemons) ? player.ChallengeDemons : [])
                .map(normalizeChallengeValue)
        );
        const completedLevels = new Set();

        completions.forEach(completion => {
            const level = levelByName.get(completion) || levelById.get(completion);

            if (level) {
                completedLevels.add(level.rank);
            }
        });

        const points = [...completedLevels].reduce((total, rank) => {
            return total + getPoints(rank);
        }, 0);

        return {
            name: String(player.Player || "Nieznany gracz"),
            points,
            completedCount: completedLevels.size
        };
    }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "pl"));

    const table = document.createElement("table");
    table.className = "challenge-ranking-table";
    table.innerHTML = `
        <thead>
            <tr>
                <th scope="col">Miejsce</th>
                <th scope="col">Gracz</th>
                <th scope="col">Ukończone wyzwania</th>
                <th scope="col">Punkty</th>
            </tr>
        </thead>
    `;

    const body = document.createElement("tbody");
    leaderboard.forEach((player, index) => {
        const row = document.createElement("tr");
        const positionCell = document.createElement("td");
        const nameCell = document.createElement("td");
        const completedCell = document.createElement("td");
        const pointsCell = document.createElement("td");

        positionCell.textContent = `#${index + 1}`;
        nameCell.textContent = player.name;
        completedCell.textContent = String(player.completedCount);
        pointsCell.textContent = `${player.points.toLocaleString("pl-PL")} RK`;
        row.append(positionCell, nameCell, completedCell, pointsCell);
        body.appendChild(row);
    });

    table.appendChild(body);
    challengeLeaderboardContainer.appendChild(table);
}

async function loadChallengeList() {
    try {
        const [levelsResponse, playersResponse] = await Promise.all([
            fetch(CHALLENGE_LEVELS_URL, { cache: "no-cache" }),
            fetch(CHALLENGE_PLAYERS_URL, { cache: "no-cache" })
        ]);

        if (!levelsResponse.ok || !playersResponse.ok) {
            throw new Error(
                `Nie udało się wczytać danych Challenge (HTTP ${levelsResponse.status}/${playersResponse.status}).`
            );
        }

        const [levelsData, playersData] = await Promise.all([
            levelsResponse.json(),
            playersResponse.json()
        ]);

        if (!Array.isArray(levelsData) || !Array.isArray(playersData)) {
            throw new Error("Dane Challenge lub graczy muszą być tablicami JSON.");
        }

        playersData.forEach((player, index) => {
            if (!player || typeof player !== "object" || Array.isArray(player)) {
                throw new Error(`Gracz na pozycji ${index + 1} ma nieprawidłowy format.`);
            }

            if (
                player.ChallengeDemons !== undefined &&
                !Array.isArray(player.ChallengeDemons)
            ) {
                throw new Error(
                    `ChallengeDemons gracza ${player.Player || index + 1} musi być tablicą.`
                );
            }
        });

        const activeLevels = levelsData.filter(level => !isLegacyLevel(level));

        if (activeLevels.length > MAX_CHALLENGE_LEVELS) {
            throw new Error(
                `Challenge List może zawierać maksymalnie ${MAX_CHALLENGE_LEVELS} aktywnych wyzwań.`
            );
        }

        const seenNames = new Set();
        const seenIds = new Set();
        const levels = activeLevels.map((level, index) => {
            if (
                !level ||
                typeof level.name !== "string" ||
                !level.name.trim() ||
                level.id === undefined ||
                level.id === null ||
                !String(level.id).trim()
            ) {
                throw new Error(`Wyzwanie na pozycji ${index + 1} ma nieprawidłową nazwę lub ID.`);
            }

            const name = level.name.trim();
            const id = String(level.id).trim();
            const normalizedName = normalizeChallengeValue(name);

            if (seenNames.has(normalizedName) || seenIds.has(id)) {
                throw new Error(`Lista Challenge zawiera powtórzoną nazwę lub ID: ${name}.`);
            }

            seenNames.add(normalizedName);
            seenIds.add(id);

            return {
                name,
                id,
                rank: index + 1,
                points: getPoints(index + 1)
            };
        });

        renderChallengeLevels(levels);
        renderChallengeLeaderboard(playersData, levels);
    } catch (error) {
        console.error("Błąd podczas ładowania Zwariowanego Challenge List:", error);

        const errorMessage = document.createElement("p");
        errorMessage.className = "challenge-message challenge-error";
        errorMessage.textContent = `Nie udało się wczytać danych Challenge: ${error.message}`;
        challengeLevelsContainer.replaceChildren(errorMessage);
        challengeLeaderboardContainer.replaceChildren(errorMessage.cloneNode(true));
    }
}

document.addEventListener("DOMContentLoaded", loadChallengeList);
