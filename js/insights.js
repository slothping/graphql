import { getShortPath, formatDuration, largestXpGain, formatMeasurement } from './utils.js';

export function renderInsights(transactions, container = document.getElementById('insights-section')) {
    const orderedByDate = [...transactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const mostRecent = orderedByDate[orderedByDate.length - 1];

    const projectDurations = [];
    for (let i = 1; i < orderedByDate.length; i++) {
        const current = orderedByDate[i];
        const previous = orderedByDate[i - 1];
        projectDurations.push({
            project: getShortPath(current.path),
            duration: new Date(current.createdAt) - new Date(previous.createdAt)
        });
    }

    const validDurations = projectDurations.filter(item => item.duration > 0);
    const fastestProject = validDurations.slice().sort((a, b) => a.duration - b.duration)[0];
    const longestProject = validDurations.slice().sort((a, b) => b.duration - a.duration)[0];

    const totalXP = transactions.reduce((sum, item) => sum + item.amount, 0);
    const projectCount = Object.keys(transactions.reduce((acc, item) => {
        const project = getShortPath(item.path);
        acc[project] = true;
        return acc;
    }, {})).length || 1;
    const xpPerProject = totalXP / projectCount;

    container.innerHTML = `
        <div class="insights-card">
            <h3>General Insights</h3>
            <ul class="insights-list">
                <li>
                    <span>Longest project</span>
                    <strong>${longestProject ? getShortPath(longestProject.project) : "make-your-game"}</strong>
                    <span class="insight-duration">${longestProject ? formatDuration(longestProject.duration) : "no duration available"}</span>
                </li>
                <li>
                    <span>Fastest completed project</span>
                    <strong>${fastestProject ? getShortPath(fastestProject.project) : "dockerize"}</strong>
                    <span class="insight-duration">${fastestProject ? formatDuration(fastestProject.duration) : "no duration available"}</span>
                </li>
                <li>
                    <span>Most recent project</span>
                    <strong>${mostRecent ? getShortPath(mostRecent.path) : "visualizations"}</strong>
                </li>
                <li>
                    <span>Largest XP gain</span>
                    <strong>${largestXpGain(transactions)}</strong>
                </li>
                <li>
                    <span>Amount per project</span>
                    <strong>${formatMeasurement(xpPerProject)}</strong>
                </li>
            </ul>
        </div>
    `;
}
