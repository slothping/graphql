export function getShortPath(path) {
    if (!path) return "Unknown";
    const prefix = "/bahrain/bh-module/";
    const cleanedPath = path.startsWith(prefix) ? path.slice(prefix.length) : path;
    const trimmed = cleanedPath.replace(/\/$/, "");
    return trimmed.split("/").pop();
}

export function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = totalSeconds / 86400;
    if (days >= 1) {
        return `${days.toFixed(1)} days`;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

export function largestXpGain(transactions) {
    if (!transactions || !transactions.length) return "-";

    const grouped = transactions.reduce((acc, transaction) => {
        const path = transaction.path || "Unknown";
        acc[path] = (acc[path] || 0) + transaction.amount;
        return acc;
    }, {});

    const best = Object.entries(grouped).reduce((bestEntry, [path, amount]) => {
        if (!bestEntry || amount > bestEntry.amount) {
            return { path, amount };
        }
        return bestEntry;
    }, null);

    return best ? `${(best.amount / 1000).toFixed(1)} kB on ${getShortPath(best.path)}` : "-";
}
