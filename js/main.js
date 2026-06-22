import { SIGNIN_URL } from "./auth.js";
import { logout, isTokenExpired, showProfile } from "./auth.js";
import { fetchUserData, normalizeUserData } from "./data.js";
import { drawXPGraph, drawAuditGraph } from "./graph.js";

const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const errorMsg = document.getElementById("error-msg");
const insightsSection = document.getElementById("insights-section");
const projectHistorySection = document.getElementById("project-history-section");

loginForm.addEventListener("submit", login);
logoutBtn.addEventListener("click", logout);

window.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("reboot_jwt");

    if (token && !isTokenExpired(token)) {
        showProfile();
        await loadProfile();
    }
});

async function login(e) {
    e.preventDefault();

    const username = document.getElementById("identifier").value;
    const password = document.getElementById("password").value;
    const credentials = btoa(`${username}:${password}`);

    try {
        const response = await fetch(SIGNIN_URL, {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`
            }
        });

        if (!response.ok) {
            throw new Error("Invalid credentials");
        }

        const data = await response.json();
        const token = data.token || data;
        localStorage.setItem("reboot_jwt", token);

        showProfile();
        await loadProfile();
    } catch (err) {
        errorMsg.innerText = err.message;
    }
}

async function loadProfile() {
    const user = await fetchUserData();

    if (!user) {
        return;
    }

    const {
        filteredTransactions,
        totalXP,
        projects,
        summary
    } = normalizeUserData(user);

    document.getElementById("user-data").innerHTML = `
        <p>Login: ${user.login}</p>
        <p>Total XP: ${(totalXP / 1000).toFixed(1)} kB</p>
        <p>Audit Ratio: ${user.auditRatio.toFixed(2)}</p>
        <p>Passed Projects: ${summary.passed}</p>
        <p>Failed Projects: ${summary.failed}</p>
        <p>In Progress: ${summary.inProgress}</p>
    `;

    renderInsights(filteredTransactions);
    renderProjectHistory(filteredTransactions);
    drawXPGraph(filteredTransactions);
    drawAuditGraph(user.totalUp, user.totalDown);
}

function getShortPath(path) {
    if (!path) return "Unknown";
    const prefix = "/bahrain/bh-module/";
    const cleanedPath = path.startsWith(prefix) ? path.slice(prefix.length) : path;
    const trimmed = cleanedPath.replace(/\/$/, "");
    return trimmed.split("/").pop();
}

function renderInsights(transactions) {
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

    insightsSection.innerHTML = `
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
                    <span>XP per project</span>
                    <strong>${(xpPerProject / 1000).toFixed(1)} kB</strong>
                </li>
            </ul>
        </div>
    `;
}

function formatDuration(ms) {
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

function largestXpGain(transactions) {
    if (!transactions.length) return "-";

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

function renderProjectHistory(transactions) {
    const visibleTransactions = [...transactions].reverse();

    projectHistorySection.innerHTML = `
        <div class="project-history-card">
            <h3>Recent XP Submissions</h3>
            <div class="project-history-table-wrapper" id="project-history-table-wrapper">
                <table class="project-history-table">
                    <thead>
                        <tr>
                            <th>Submission</th>
                            <th>XP Amount</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visibleTransactions.map(transaction => `
                            <tr>
                                <td>${getShortPath(transaction.path)}</td>
                                <td>${transaction.amount} XP</td>
                                <td>${new Date(transaction.createdAt).toLocaleDateString()}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
            <button class="project-history-button" id="project-history-button">
                View More
            </button>
        </div>
    `;

    const wrapper = document.getElementById("project-history-table-wrapper");
    const button = document.getElementById("project-history-button");

    button.addEventListener("click", () => {
        const isScrollable = wrapper.classList.toggle("scrollable");
        button.textContent = isScrollable ? "Hide Scroll" : "View More";
    });
}
