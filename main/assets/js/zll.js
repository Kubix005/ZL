const LEVELS_URL = "./levels.json";
const PLAYERS_URL = "./players.json";
const PROGRESS_URL = "./progress.json";
const AREDL_RANKS_URL = "./aredl-ranks.json";

const THUMBNAIL_URL =
    "https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards";

let levels = [];
let players = [];
let progressEntries = [];
let aredlRanks = {};
let legacyLevelNames = new Set();


// =====================================================
// ŁADOWANIE LEVELS.JSON
// =====================================================

async function loadLevels() {

    const demonsContainer =
        document.getElementById("demons");

    if (!demonsContainer) {
        console.error("Nie znaleziono #demons");
        return;
    }

    try {

        const response = await fetch(LEVELS_URL, {
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "levels.json musi zawierać tablicę"
            );
        }

        // Maksymalnie TOP 150
        legacyLevelNames = new Set(
            data
                .filter(isLegacyLevel)
                .map(level => String(level.name).trim().toLowerCase())
        );
        levels = data
            .filter(level => !isLegacyLevel(level))
            .slice(0, 150);

        await loadAredlRanks();

        generateDemonCards();
        generateRanking();

        console.log(
            `Załadowano ${levels.length} leveli.`
        );

    } catch (error) {

        console.error(
            "Błąd podczas ładowania levels.json:",
            error
        );

        demonsContainer.innerHTML = `
            <div class="loading-error">
                Nie udało się załadować listy demonów.
                <br>
                Sprawdź, czy plik <b>levels.json</b>
                znajduje się obok tego HTML.
            </div>
        `;
    }
}


async function loadAredlRanks() {

    try {

        const response = await fetch(AREDL_RANKS_URL, {
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const snapshot = await response.json();

        if (!snapshot.ranks || typeof snapshot.ranks !== "object" || Array.isArray(snapshot.ranks)) {
            throw new Error("aredl-ranks.json musi zawierać obiekt ranks");
        }

        aredlRanks = snapshot.ranks;

    } catch (error) {

        console.warn("Nie udało się załadować rankingu AREDL:", error);
        aredlRanks = {};

    }
}


// =====================================================
// GENEROWANIE KART DEMONÓW
// =====================================================

function generateDemonCards() {

    const container =
        document.getElementById("demons");

    container.innerHTML = "";

    levels.forEach((level, index) => {

        const rank = index + 1;

        const card =
            document.createElement("div");

        card.className = "demon-card";

        // top1, top2, top3...
        card.id = `top${rank}`;

        // ID levela
        card.dataset.demonId = String(level.id);


        // =============================================
        // RANK
        // =============================================

        const rankElement =
            document.createElement("div");

        rankElement.className =
            "top-number";

        const rankLabel =
            document.createElement("span");

        rankLabel.textContent =
            `TOP ${rank}`;

        rankElement.appendChild(rankLabel);

        const aredlRank =
            aredlRanks[String(level.id)];

        if (Number.isInteger(aredlRank)) {
            const aredlLink =
                document.createElement("a");

            aredlLink.className =
                "aredl-rank";

            aredlLink.href =
                `https://aredl.net/list/${level.id}`;

            aredlLink.target =
                "_blank";

            aredlLink.rel =
                "noopener noreferrer";

            aredlLink.textContent =
                `AREDL #${aredlRank}`;

            rankElement.appendChild(aredlLink);
        }


        // =============================================
        // IMAGE WRAPPER
        // =============================================

        const imageWrapper =
            document.createElement("div");

        imageWrapper.className =
            "demon-image";


        // =============================================
        // IMAGE
        // =============================================

        const image =
            document.createElement("img");

        image.src =
            `${THUMBNAIL_URL}/${level.id}.webp`;

        image.alt =
            level.name;

        image.loading =
            "lazy";


        // Jeżeli obrazka nie ma
        image.onerror = function () {

            this.onerror = null;

            this.src = "";

            this.style.display = "none";

        };


        imageWrapper.appendChild(image);


        // =============================================
        // POINTS
        // =============================================

        const points =
            document.createElement("div");

        points.className =
            "image-points";

        points.textContent =
            `${getPoints(rank)} RK`;

        imageWrapper.appendChild(points);


        // =============================================
        // NAME
        // =============================================

        const name =
            document.createElement("div");

        name.className =
            "demon-name";

        name.textContent =
            level.name;


        // =============================================
        // SKŁADANIE KARTY
        // =============================================

        card.appendChild(rankElement);

        card.appendChild(imageWrapper);

        card.appendChild(name);

        const levelProgress = getProgressForLevel(level);

        if (levelProgress.length > 0) {
            const progressSection = document.createElement("div");
            progressSection.className = "level-progress";

            const progressTitle = document.createElement("div");
            progressTitle.className = "level-progress-title";
            progressTitle.textContent = "PROGRES";
            progressSection.appendChild(progressTitle);

            const progressGrid = document.createElement("div");
            progressGrid.className = "level-progress-grid";

            levelProgress.forEach(entry => {
                const progressRow = document.createElement("div");
                progressRow.className = "level-progress-entry";

                const playerName = document.createElement("span");
                playerName.className = "level-progress-player";
                playerName.textContent = entry.player;

                const progressTrack = document.createElement("span");
                progressTrack.className = "level-progress-track";
                progressTrack.setAttribute("role", "img");
                progressTrack.setAttribute(
                    "aria-label",
                    `Progres: ${entry.procent.label}`
                );

                entry.procent.segments.forEach(segment => {
                    const progressFill = document.createElement("span");
                    progressFill.className = "level-progress-fill";
                    if (segment.reverseGradient) {
                        progressFill.classList.add("progress-fill-reversed");
                    }
                    progressFill.style.left = `${segment.start}%`;
                    progressFill.style.width =
                        `${segment.end - segment.start}%`;
                    progressTrack.appendChild(progressFill);
                });

                const percentage = document.createElement("span");
                percentage.className = "level-progress-percentage";
                percentage.textContent = entry.procent.label;

                progressRow.append(
                    playerName,
                    progressTrack,
                    percentage
                );
                progressGrid.appendChild(progressRow);
            });

            progressSection.appendChild(progressGrid);
            card.appendChild(progressSection);
        }

        container.appendChild(card);

    });
}


// =====================================================
// GENEROWANIE LEWEJ LISTY TOP 1-150
// =====================================================

function generateRanking() {

    const rankingList =
        document.getElementById("ranking-list");

    if (!rankingList) {
        return;
    }

    rankingList.innerHTML = "";


    levels.forEach((level, index) => {

        const rank = index + 1;


        const item =
            document.createElement("a");

        item.className =
            "ranking-item";

        item.href =
            `#top${rank}`;


        // =============================================
        // TOP
        // =============================================

        const rankText =
            document.createElement("span");

        rankText.textContent =
            `TOP ${rank}`;


        // =============================================
        // POINTS
        // =============================================

        const pointsText =
            document.createElement("span");

        pointsText.className =
            "points";

        pointsText.textContent =
            `${getPoints(rank)} RK`;


        item.appendChild(rankText);

        item.appendChild(pointsText);


        // =============================================
        // CLICK
        // =============================================

        item.addEventListener(
            "click",
            function () {

                document
                    .querySelectorAll(".ranking-item")
                    .forEach(other => {
                        other.classList.remove("active");
                    });

                this.classList.add("active");

            }
        );


        rankingList.appendChild(item);

    });
}


// =====================================================
// ZNAJDŹ DEMONA PO NAZWIE
// =====================================================

function findDemonByName(name) {

    const searchName =
        String(name)
            .toLowerCase()
            .trim();


    const card =
        [...document.querySelectorAll(".demon-card")]
            .find(card => {

                const nameElement =
                    card.querySelector(".demon-name");

                if (!nameElement) {
                    return false;
                }

                return (
                    nameElement.textContent
                        .toLowerCase()
                        .trim()
                    === searchName
                );

            });


    return card || null;
}


// =====================================================
// ZNAJDŹ DEMONA PO TOP ID
// =====================================================

function findDemonById(id) {

    return document.getElementById(
        String(id)
    );
}


// =====================================================
// ZNAJDŹ RANKING DEMONA
// =====================================================

function getDemonRank(card) {

    if (!card) {
        return null;
    }

    if (!card.id.startsWith("top")) {
        return null;
    }

    return parseInt(
        card.id.replace("top", ""),
        10
    );
}


// =====================================================
// ŁADOWANIE PLAYERS.JSON
// =====================================================

async function loadPlayers() {

    try {

        const response =
            await fetch(PLAYERS_URL, {
                cache: "no-cache"
            });


        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        if (!Array.isArray(data)) {
            throw new Error(
                "players.json musi zawierać tablicę"
            );
        }


        players =
            data.map(player => ({

                Player:
                    String(
                        player.Player || ""
                    ),

                tag: player.tag,
                recent: player.recent,

                Demons:
                    Array.isArray(player.Demons)
                        ? player.Demons.map(
                            demon =>
                                String(demon)
                        )
                        : []

            }));


        console.log(
            `Załadowano ${players.length} graczy.`
        );


    } catch (error) {

        console.error(
            "Błąd players.json:",
            error
        );

    }
}

async function loadProgress() {
    try {
        const response = await fetch(PROGRESS_URL, {
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("progress.json musi zawierać tablicę");
        }

        progressEntries = data.flatMap((entry, index) => {
            const procent = parseProgressValue(entry?.procent);
            const isValid =
                entry &&
                typeof entry["level-name"] === "string" &&
                entry["level-name"].trim() &&
                entry["level-id"] !== undefined &&
                entry["level-id"] !== null &&
                String(entry["level-id"]).trim() &&
                typeof entry.player === "string" &&
                entry.player.trim() &&
                procent;

            if (!isValid) {
                console.warn(
                    `Pomijam nieprawidłowy wpis progress.json (indeks ${index}).`
                );
                return [];
            }

            return [{
                "level-name": entry["level-name"].trim(),
                "level-id": String(entry["level-id"]).trim(),
                player: entry.player.trim(),
                procent
            }];
        });
    } catch (error) {
        console.error("Błąd progress.json:", error);
        progressEntries = [];
    }
}

function playerHasCompletedLevel(player, level) {
    const levelId = String(level.id);
    const levelName = String(level.name).trim().toLowerCase();

    return player.Demons.some(demon => {
        const completedDemon = String(demon).trim();
        return completedDemon === levelId ||
            completedDemon.toLowerCase() === levelName;
    });
}

function getProgressForLevel(level) {
    const entriesByPlayer = new Map();

    progressEntries.forEach(entry => {
        if (entry["level-id"] !== String(level.id)) {
            return;
        }

        const player = players.find(existingPlayer =>
            existingPlayer.Player.toLowerCase() === entry.player.toLowerCase()
        );

        if (player && playerHasCompletedLevel(player, level)) {
            return;
        }

        const playerKey = entry.player.toLowerCase();
        if (!entriesByPlayer.has(playerKey)) {
            entriesByPlayer.set(playerKey, {
                player: entry.player,
                progressValues: []
            });
        }

        entriesByPlayer.get(playerKey).progressValues.push(entry.procent);
    });

    return [...entriesByPlayer.values()].map(entry => ({
        player: entry.player,
        procent: combineProgressValues(entry.progressValues)
    }));
}

function getProgressForPlayer(playerName) {
    return levels.flatMap(level => {
        const progress = getProgressForLevel(level).find(entry =>
            entry.player.toLowerCase() === playerName.toLowerCase()
        );

        return progress ? [{ entry: progress, level }] : [];
    });
}


// =====================================================
// POKAŻ GRACZA
// =====================================================

function showPlayer(player) {

    const searchResults =
        document.getElementById(
            "search-results"
        );


    searchResults.innerHTML = "";


    // =============================================
    // HEADER
    // =============================================

    const header =
        document.createElement("div");

    header.className =
        "search-result player-header";

    header.innerHTML = `
        <div class="search-result-main">
            <span class="search-result-type">
                PLAYER
            </span>

            <span>
                ${escapeHTML(player.Player)}
            </span>
        </div>

        <span class="search-result-points">
    ${player.Demons
        .filter(demon => !legacyLevelNames.has(String(demon).trim().toLowerCase()))
        .reduce((total, demon) => {
        const card = findDemonById(demon) || findDemonByName(demon);
        const rank = getDemonRank(card);
        return total + (rank ? getPoints(rank) : 0);
    }, 0)} RK
</span>
    `;

    searchResults.appendChild(header);


    // =============================================
    // DEMONY GRACZA
    // =============================================

    player.Demons
        .filter(demon => !legacyLevelNames.has(String(demon).trim().toLowerCase()))
        .forEach(demon => {

        let card = null;

        // Najpierw próbujemy top1, top2 itd.
        card = findDemonById(demon);

        // Jeżeli players.json ma nazwy zamiast top ID
        if (!card) {
            card = findDemonByName(demon);
        }


        const result =
            document.createElement("div");

        result.className =
            "search-result";


        if (card) {

            const rank =
                getDemonRank(card);


            const nameElement =
                card.querySelector(
                    ".demon-name"
                );


            const demonName =
                nameElement
                    ? nameElement.textContent
                    : demon;


            result.innerHTML = `

                <div class="search-result-main">

                    <span class="search-result-type">
                        DEMON
                    </span>

                    <span>
                        ${escapeHTML(demonName)}
                    </span>

                </div>

                <span class="search-result-points">
                    TOP ${rank}
                </span>

            `;


            result.addEventListener(
                "click",
                () => {

                    card.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                    searchResults.style.display =
                        "none";

                }
            );


        } else {

            result.innerHTML = `

                <div class="search-result-main">

                    <span class="search-result-type">
                        DEMON
                    </span>

                    <span>
                        ${escapeHTML(demon)}
                    </span>

                </div>

                <span class="search-result-points">
                    NOT ON LIST YET
                </span>

            `;

        }


        searchResults.appendChild(result);

    });

    getProgressForPlayer(player.Player).forEach(({ entry, level }) => {
        const result = document.createElement("div");
        result.className = "search-result";

        const main = document.createElement("div");
        main.className = "search-result-main";

        const type = document.createElement("span");
        type.className = "search-result-type";
        type.textContent = "PROGRES";

        const levelName = document.createElement("span");
        levelName.textContent = level.name;
        main.append(type, levelName);

        const percentage = document.createElement("span");
        percentage.className = "search-result-points";
        percentage.textContent = entry.procent.label;

        result.append(main, percentage);
        result.addEventListener("click", () => {
            const card = findDemonById(level.id);

            if (card) {
                card.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
                searchResults.style.display = "none";
            }
        });

        searchResults.appendChild(result);
    });


    searchResults.style.display =
        "block";
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================================
// SEARCH
// =====================================================

function setupSearch() {

    const searchInput =
        document.getElementById(
            "global-search"
        );

    const searchResults =
        document.getElementById(
            "search-results"
        );

    const clearSearch =
        document.getElementById(
            "clear-search"
        );


    if (
        !searchInput ||
        !searchResults
    ) {
        return;
    }


    // =============================================
    // INPUT
    // =============================================

    searchInput.addEventListener(
        "input",
        function () {

            const query =
                this.value
                    .toLowerCase()
                    .trim();


            searchResults.innerHTML = "";


            if (!query) {

                searchResults.style.display =
                    "none";

                return;

            }


            let foundSomething = false;


            // =========================================
            // PLAYERS
            // =========================================

            players.forEach(player => {

                const playerName =
                    player.Player
                        .toLowerCase();


                if (
                    playerName.includes(query)
                ) {

                    foundSomething = true;


                    const result =
                        document.createElement(
                            "div"
                        );


                    result.className =
                        "search-result";


                    result.innerHTML = `

                        <div class="search-result-main">

                            <span class="search-result-type">
                                PLAYER
                            </span>

                            <span>
                                ${escapeHTML(player.Player)}
                            </span>

                        </div>

                        <span class="search-result-points">
                            ${player.Demons.length} DEMONS
                        </span>

                    `;


                    result.addEventListener(
                        "click",
                        () => {
                            showPlayer(player);
                        }
                    );


                    searchResults.appendChild(
                        result
                    );

                }

            });


            // =========================================
            // DEMONY
            // =========================================

            document
                .querySelectorAll(".demon-card")
                .forEach(card => {

                    const nameElement =
                        card.querySelector(
                            ".demon-name"
                        );


                    if (!nameElement) {
                        return;
                    }


                    const demonName =
                        nameElement.textContent
                            .trim();


                    const nameLower =
                        demonName.toLowerCase();


                    const rank =
                        getDemonRank(card);


                    const rankLower =
                        `top ${rank}`;


                    const rankWithoutSpace =
                        `top${rank}`;


                    if (

                        nameLower.includes(query) ||

                        rankLower.includes(query) ||

                        rankWithoutSpace.includes(query) ||

                        String(rank) === query

                    ) {

                        foundSomething = true;


                        const result =
                            document.createElement(
                                "div"
                            );


                        result.className =
                            "search-result";


                        result.innerHTML = `

                            <div class="search-result-main">

                                <span class="search-result-type">
                                    DEMON
                                </span>

                                <span>
                                    ${escapeHTML(demonName)}
                                </span>

                            </div>

                            <span class="search-result-points">
                                TOP ${rank}
                            </span>

                        `;


                        result.addEventListener(
                            "click",
                            () => {

                                card.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center"
                                });

                                searchResults.style.display =
                                    "none";

                            }
                        );


                        searchResults.appendChild(
                            result
                        );

                    }

                });


            // =========================================
            // BRAK WYNIKÓW
            // =========================================

            if (!foundSomething) {

                searchResults.innerHTML = `

                    <div class="search-no-results">
                        No players or demons found.
                    </div>

                `;

            }


            searchResults.style.display =
                "block";

        }
    );


    // =============================================
    // CLEAR
    // =============================================

    if (clearSearch) {

        clearSearch.addEventListener(
            "click",
            () => {

                searchInput.value = "";

                searchResults.innerHTML = "";

                searchResults.style.display =
                    "none";

                searchInput.focus();

            }
        );

    }

}


// =====================================================
// RECENTLY BEAT BUTTON
// =====================================================

function setupRecentlyButton() {

    const button = document.getElementById("recently-button");

    if (!button) {
        return;
    }

    const recentPlayer = players.find(player => {
        const tag = Array.isArray(player.tag) ? player.tag : [player.tag];
        return tag.some(value => String(value).toLowerCase() === "recent");
    });

    if (!recentPlayer || !recentPlayer.recent) {
        return;
    }

    const recentLevel = levels.find(level =>
        String(level.name).trim().toLowerCase() ===
        String(recentPlayer.recent).trim().toLowerCase()
    );

    if (recentLevel) {
        button.style.backgroundImage = `linear-gradient(rgba(0, 35, 0, 0.42), rgba(0, 20, 0, 0.78)), url("${THUMBNAIL_URL}/${recentLevel.id}.webp")`;
        button.title = `${recentPlayer.Player} recently beat ${recentLevel.name}`;
    }
}


// =====================================================
// START
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadPlayers();

        await loadProgress();

        await loadLevels();

        setupRecentlyButton();

        setupSearch();

    }
);
