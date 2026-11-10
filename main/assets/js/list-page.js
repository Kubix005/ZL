const LIST_CONFIG = document.body.dataset;
const LEVELS_URL = LIST_CONFIG.levelsUrl || "../../levels.json";
const PLAYERS_URL = LIST_CONFIG.playersUrl || LIST_PAGE_CONTEXT.playersUrl;
const PLAYERS_FILE = PLAYERS_URL.split("/").pop();
const AREDL_RANKS_URL = LIST_CONFIG.aredlRanksUrl ?? "../../aredl-ranks.json";
const COMPLETION_FIELD = LIST_CONFIG.completionField || "Demons";
const LIST_NAME = LIST_CONFIG.listName || "ZLL";

const THUMBNAIL_URL =
    "https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards";

const ZCL_DIFFICULTIES = [
    { minRank: 1, maxRank: 1, name: "Extreme Demon" },
    { minRank: 2, maxRank: 5, name: "Insane Demon" },
    { minRank: 6, maxRank: 15, name: "Hard Demon" },
    { minRank: 16, maxRank: 30, name: "Medium Demon" },
    { minRank: 31, maxRank: Infinity, name: "Easy Demon" }
];

let levels = [];
let players = [];
let aredlRanks = {};
let legacyLevelNames = new Set();
let activeLevelCount = 0;

function createZclDifficultyBadge(rank, compact = false) {
    if (LIST_NAME !== "ZCL") {
        return null;
    }

    const difficulty = ZCL_DIFFICULTIES.find(
        entry => rank >= entry.minRank && rank <= entry.maxRank
    );

    if (!difficulty) {
        return null;
    }

    const badge = document.createElement("span");
    badge.className = compact
        ? "zcl-difficulty zcl-difficulty-compact"
        : "zcl-difficulty";
    badge.title = difficulty.name;

    const label = document.createElement("span");
    label.textContent = difficulty.name;

    badge.appendChild(label);
    return badge;
}

function getChallengeCreditNames(levelName, field) {
    const levelKey = String(levelName).trim().toLowerCase();

    return [...new Set(players
        .filter(player =>
            Array.isArray(player[field]) &&
            player[field].some(value =>
                String(value).trim().toLowerCase() === levelKey
            )
        )
        .map(player => player.Player)
        .filter(Boolean))];
}

function isNewLevel(level) {
    const addedAt = level.AddedAt ?? level.addedAt;

    if (typeof addedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(addedAt)) {
        return false;
    }

    const [year, month, day] = addedAt.split("-").map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const date = new Date(timestamp);

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return false;
    }

    const now = new Date();
    const today = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    );
    const firstIncludedDay = today - 6 * 24 * 60 * 60 * 1000;

    return timestamp >= firstIncludedDay && timestamp <= today;
}

function getDemonNameFromCard(card) {
    const nameElement = card?.querySelector(".demon-name");
    const titleElement = nameElement?.querySelector(".demon-name-title");

    return (titleElement || nameElement)?.textContent.trim() || "";
}

function getLevelTags(level) {
    const tagValue = level.Tag ?? level.tag;
    const tags = Array.isArray(tagValue)
        ? tagValue
        : tagValue == null
            ? []
            : [tagValue];
    const seenTags = new Set();

    return tags
        .map(tag => String(tag ?? "").trim())
        .filter(tag => {
            const key = tag.toLowerCase();

            if (!key || seenTags.has(key)) {
                return false;
            }

            seenTags.add(key);
            return true;
        });
}


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
        const activeLevels = data.filter(level => !isLegacyLevel(level));
        activeLevelCount = activeLevels.length;
        levels = activeLevels.slice(0, 150);

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
    if (!AREDL_RANKS_URL) {
        aredlRanks = {};
        return;
    }

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
        const levelTags = getLevelTags(level);
        card.dataset.tags = JSON.stringify(levelTags.map(tag => tag.toLowerCase()));


        // =============================================
        // RANK
        // =============================================

        const rankHeader =
            document.createElement("div");

        rankHeader.className =
            "top-level-header";

        const rankElement =
            document.createElement("div");

        rankElement.className =
            "top-number";

        const rankLabel =
            document.createElement("span");

        rankLabel.textContent =
            `TOP ${rank}`;

        rankElement.appendChild(rankLabel);

        const levelDetails = document.createElement("span");
        levelDetails.className = "top-level-details";
        levelDetails.append(`ID: ${level.id}`);
        if (isNewLevel(level)) {
            const newBadge = document.createElement("span");
            newBadge.className = "top-new-badge";
            newBadge.textContent = "NEW";
            levelDetails.append(newBadge);
        }
        const authorNames = Array.isArray(level.Autor)
            ? level.Autor.filter(author => typeof author === "string" && author.trim())
            : typeof level.Autor === "string" && level.Autor.trim()
                ? [level.Autor.trim()]
                : [];
        if (authorNames.length) {
            levelDetails.append(
                ` · ${authorNames.map(author => `Autor: ${author}`).join(" · ")}`
            );
        }
        rankHeader.append(rankElement, levelDetails);

        const difficultyBadge = createZclDifficultyBadge(rank);
        if (difficultyBadge) {
            rankHeader.appendChild(difficultyBadge);
        }

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

            rankHeader.appendChild(aredlLink);
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
            `${getPoints(rank, activeLevelCount)} ZLP`;

        imageWrapper.appendChild(points);


        // =============================================
        // NAME
        // =============================================

        const name =
            document.createElement("div");

        name.className =
            "demon-name";

        const nameTitle = document.createElement("a");
        nameTitle.className = "demon-name-title demon-name-link";
        nameTitle.href =
            `../../level.html?id=${encodeURIComponent(String(level.id))}${LIST_NAME === "ZCL" ? "&list=zcl" : ""}`;
        nameTitle.textContent = level.name;
        name.appendChild(nameTitle);


        // =============================================
        // SKŁADANIE KARTY
        // =============================================

        card.appendChild(rankHeader);

        card.appendChild(imageWrapper);

        card.appendChild(name);

        if (COMPLETION_FIELD === "ChallengeDemons") {
            const verifiedBy = getChallengeCreditNames(level.name, "Verified");
            const builtBy = getChallengeCreditNames(level.name, "Built");

            if (verifiedBy.length || builtBy.length) {
                if (verifiedBy.length) {
                    const verified = document.createElement("span");
                    verified.className = "challenge-credit";
                    verified.textContent = `Zweryfikowane przez: ${verifiedBy.join(", ")}`;
                    name.appendChild(verified);
                }

                if (builtBy.length) {
                    const built = document.createElement("span");
                    built.className = "challenge-credit";
                    built.textContent = `Zbudowane przez: ${builtBy.join(", ")}`;
                    name.appendChild(built);
                }
            }

            if (levelTags.length) {
                const tags = document.createElement("span");
                tags.className = "level-tags";
                tags.setAttribute("aria-label", "Tagi");

                levelTags.forEach(tag => {
                    const tagElement = document.createElement("span");
                    tagElement.className = "level-tag";
                    tagElement.textContent = tag;
                    tags.appendChild(tagElement);
                });

                name.appendChild(tags);
            }
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

        const difficultyBadge = createZclDifficultyBadge(rank, true);
        if (difficultyBadge) {
            rankText.className = "ranking-item-rank";
            rankText.appendChild(difficultyBadge);
        }


        // =============================================
        // POINTS
        // =============================================

        const pointsText =
            document.createElement("span");

        pointsText.className =
            "points";

        pointsText.textContent =
            `${getPoints(rank, activeLevelCount)} ZLP`;


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

                const demonName = getDemonNameFromCard(card);

                if (!demonName) {
                    return false;
                }

                return (
                    demonName
                        .toLowerCase()
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
                `${PLAYERS_FILE} musi zawierać tablicę`
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
                Verified: Array.isArray(player.Verified)
                    ? player.Verified.map(String)
                    : [],
                Built: Array.isArray(player.Built)
                    ? player.Built.map(String)
                    : [],

                Demons: getPlayerCompletions(player)

            }));


        console.log(
            `Załadowano ${players.length} graczy.`
        );


    } catch (error) {

        console.error(
            `Błąd ${PLAYERS_FILE}:`,
            error
        );

    }
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
        return total + (rank ? getPoints(rank, activeLevelCount) : 0);
    }, 0)} ZLP
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


            const demonName =
                getDemonNameFromCard(card) || demon;


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
                            ${player.Demons.length} ${LIST_NAME === "ZCL" ? "CHALLENGES" : "DEMONS"}
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

                    const demonName =
                        getDemonNameFromCard(card);

                    if (!demonName) {
                        return;
                    }

                    const nameLower =
                        demonName.toLowerCase();

                    const matchingTags = JSON.parse(card.dataset.tags || "[]")
                        .filter(tag => tag.includes(query));

                    const rank =
                        getDemonRank(card);


                    const rankLower =
                        `top ${rank}`;


                    const rankWithoutSpace =
                        `top${rank}`;


                    if (

                        nameLower.includes(query) ||

                        matchingTags.length > 0 ||

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
                                ${matchingTags.length
                                    ? `<span class="search-result-tags">${matchingTags.map(escapeHTML).join(", ")}</span>`
                                    : ""}

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
                        No players, demons or tags found.
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
        button.style.backgroundImage = `linear-gradient(rgba(10, 35, 65, 0.42), rgba(10, 20, 40, 0.78)), url("${THUMBNAIL_URL}/${recentLevel.id}.webp")`;
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

        await loadLevels();

        setupRecentlyButton();

        setupSearch();

    }
);
