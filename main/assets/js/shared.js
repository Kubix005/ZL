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

if (LIST_PAGE_CONTEXT.isChallengeList) {
    const listSpecificPages = new Set([
        "leaderboard.html",
        "recently.html",
        "winners.html",
        "compare.html",
        "new-levels.html",
        "authors.html"
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