const LIST_PAGE_CONTEXT = (() => {
    const isChallengeList =
        new URLSearchParams(window.location.search).get("list") === "zcl";

    return {
        isChallengeList,
        levelsUrl: isChallengeList
            ? "./lists/challenge/levels.json"
            : "./lists/zll/levels.json",
        playersUrl: isChallengeList
            ? "./challenge-players.json"
            : "./players.json",
        linksUrl: isChallengeList
            ? "./links.json"
            : "./lists/zll/levels-links.json",
        completionField: isChallengeList ? "ChallengeDemons" : "Demons"
    };
})();

function getPlayerCompletions(player) {
    const completionFields = [LIST_PAGE_CONTEXT.completionField];

    if (LIST_PAGE_CONTEXT.isChallengeList) {
        completionFields.push("Verified");
    }

    const completions = completionFields.flatMap(field =>
        Array.isArray(player[field]) ? player[field] : []
    );
    const seenCompletions = new Set();

    return completions.filter(completion => {
        const name = String(completion ?? "").trim();
        const key = name.toLowerCase();

        if (!key || seenCompletions.has(key)) {
            return false;
        }

        seenCompletions.add(key);
        return true;
    }).map(String);
}

function getPlayerPackStatuses(player, packs, levels) {
    if (!Array.isArray(packs) || !Array.isArray(levels)) {
        throw new Error("Dane paczek lub leveli mają nieprawidłowy format.");
    }

    const activeLevels = levels
        .filter(level => !isLegacyLevel(level))
        .slice(0, 150);
    const levelsById = new Map(
        activeLevels
            .filter(level => level.id != null)
            .map((level, index) => [
                String(level.id).trim().toLowerCase(),
                { level, rank: index + 1 }
            ])
    );
    const completedIdentifiers = new Set(
        getPlayerCompletions(player)
            .map(completion => String(completion).trim().toLowerCase())
    );
    const seenPackNames = new Set();

    return packs.map((pack, packIndex) => {
        const packName = typeof pack?.name === "string" ? pack.name.trim() : "";
        const packKey = packName.toLowerCase();

        if (!packName || seenPackNames.has(packKey)) {
            throw new Error(`Nieprawidłowa lub powielona nazwa paczki (wpis ${packIndex + 1}).`);
        }

        seenPackNames.add(packKey);

        if (!Array.isArray(pack.levels) || pack.levels.length === 0) {
            throw new Error(`Paczka "${packName}" musi zawierać co najmniej jeden level.`);
        }

        const seenLevelIds = new Set();
        const packLevels = pack.levels.map((member, memberIndex) => {
            const id = String(member?.id ?? "").trim();
            const name = typeof member?.name === "string" ? member.name.trim() : "";
            const idKey = id.toLowerCase();
            const entry = levelsById.get(idKey);

            if (!id || !name || !entry) {
                throw new Error(`Nieprawidłowy level ${memberIndex + 1} w paczce "${packName}".`);
            }

            if (seenLevelIds.has(idKey)) {
                throw new Error(`Powielony level "${name}" w paczce "${packName}".`);
            }

            if (String(entry.level.name).trim().toLowerCase() !== name.toLowerCase()) {
                throw new Error(`Nazwa levela o ID ${id} nie zgadza się z levels.json.`);
            }

            seenLevelIds.add(idKey);

            return {
                name: String(entry.level.name).trim(),
                id,
                rank: entry.rank,
                points: getPoints(entry.rank),
                completed: completedIdentifiers.has(idKey) ||
                    completedIdentifiers.has(name.toLowerCase())
            };
        });
        const points = Math.round(
            packLevels.reduce((total, level) => total + level.points, 0) /
            packLevels.length
        );

        return {
            name: packName,
            levels: packLevels,
            points,
            completed: packLevels.every(level => level.completed)
        };
    });
}

if (LIST_PAGE_CONTEXT.isChallengeList) {
    const listSpecificPages = new Set([
        "leaderboard.html",
        "level.html",
        "levels.html",
        "recently.html",
        "winners.html",
        "compare.html",
        "new-levels.html",
        "authors.html",
        "packs.html"
    ]);

    document.querySelectorAll(".page-links a, .action-links a").forEach(link => {
        const url = new URL(link.href, window.location.href);
        const pageName = url.pathname.split("/").pop();

        if (listSpecificPages.has(pageName)) {
            url.searchParams.set("list", "zcl");
            link.href = url.toString();
        } else if (pageName === "prediction.html" || pageName === "progress.html") {
            link.remove();
        }
    });
}

function getPoints(rank) {
    const maxPoints = 350;
    const top50Points = 50;
    const minPoints = 1;
    const curveEndRank = 20;
    const maxRank = 150;
    let points;

    if (rank <= curveEndRank) {
        const progress = (rank - 1) / (curveEndRank - 1);
        points = maxPoints -
            (maxPoints - top50Points) * Math.pow(progress, 0.65);
    } else {
        const progress = (rank - curveEndRank) / (maxRank - curveEndRank);
        points = top50Points *
            Math.pow(minPoints / top50Points, progress);
    }

    return Math.round(points);
}

function isLegacyLevel(level) {
    return level?.legacy === true ||
        String(level?.legacy ?? "").trim().toLowerCase() === "true";
}

function parseProgressValue(value) {
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return null;
        }

        const progressValues = value.map(parseProgressValue);

        if (progressValues.some(progressValue => !progressValue)) {
            return null;
        }

        return combineProgressValues(progressValues);
    }

    if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100) {
        return {
            start: 0,
            end: value,
            reverseGradient: false,
            label: `${value}%`
        };
    }

    if (typeof value !== "string") {
        return null;
    }

    const normalizedValue = value.trim();
    const percentageMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)$/);

    if (percentageMatch) {
        const percentage = Number(percentageMatch[1]);

        if (percentage <= 100) {
            return {
                start: 0,
                end: percentage,
                reverseGradient: false,
                label: `${percentage}%`
            };
        }
    }

    const rangeMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*-\s*100$/);

    if (!rangeMatch) {
        return null;
    }

    const start = Number(rangeMatch[1]);

    if (!Number.isFinite(start) || start < 0 || start >= 100) {
        return null;
    }

    return {
        start,
        end: 100,
        reverseGradient: true,
        label: `${start}-100%`
    };
}

function combineProgressValues(progressValues) {
    const sortedSegments = progressValues
        .flatMap(progressValue => progressValue.segments || [{
            start: progressValue.start,
            end: progressValue.end,
            reverseGradient: progressValue.reverseGradient
        }])
        .sort((a, b) => a.start - b.start || a.end - b.end);
    const segments = [];

    sortedSegments.forEach(segment => {
        const lastSegment = segments[segments.length - 1];

        if (!lastSegment || segment.start > lastSegment.end) {
            segments.push({ ...segment });
        } else {
            lastSegment.end = Math.max(lastSegment.end, segment.end);
            lastSegment.reverseGradient =
                lastSegment.reverseGradient || segment.reverseGradient;
        }
    });

    return {
        start: segments[0].start,
        end: segments[segments.length - 1].end,
        segments,
        label: [...new Set(progressValues.map(progressValue => progressValue.label))]
            .join(" + ")
    };
}