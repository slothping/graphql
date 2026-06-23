import { SIGNIN_URL } from "./auth.js";
import { logout, isTokenExpired, showProfile } from "./auth.js";
import { fetchUserData, normalizeUserData } from "./data.js";
import { drawXPGraph, drawAuditGraph } from "./graph.js";
import { renderInsights } from "./insights.js";
import { renderProjectHistory } from "./history.js";

const loginForm = document.getElementById("login-form");
const errorMsg = document.getElementById("error-msg");
const headerUsername = document.getElementById("header-username");
const headerAuthButton = document.getElementById("header-auth-button");
const insightsSection = document.getElementById("insights-section");
const projectHistorySection = document.getElementById("project-history-section");

loginForm.addEventListener("submit", login);
headerAuthButton.addEventListener("click", handleHeaderAuth);

window.addEventListener("DOMContentLoaded", async () => {
    updateHeader("Guest", false);
    document.getElementById("app-header").hidden = true;
    const token = localStorage.getItem("reboot_jwt");

    if (token && !isTokenExpired(token)) {
        showProfile();
        await loadProfile();
    }
});

function handleHeaderAuth() {
    if (headerAuthButton.textContent === "Logout") {
        logout();
        document.getElementById("login-container").hidden = false;
        document.getElementById("profile-container").hidden = true;
        document.getElementById("app-header").hidden = true;
        updateHeader("Guest", false);
    } else {
        document.getElementById("login-container").hidden = false;
        document.getElementById("profile-container").hidden = true;
        document.getElementById("identifier").focus();
    }
}

function updateHeader(userName, loggedIn) {
    headerUsername.textContent = userName || "Guest";
    headerAuthButton.textContent = loggedIn ? "Logout" : "Login";
}

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

    updateHeader(user.login, true);

    document.getElementById("user-data").innerHTML = `
        <div class="profile-summary-card">
            <div class="summary-item">
                <span class="summary-label">Login</span>
                <strong>${user.login}</strong>
            </div>
            <div class="summary-item">
                <span class="summary-label">Total XP</span>
                <strong>${(totalXP / 1000).toFixed(1)} kB</strong>
            </div>
            <div class="summary-item">
                <span class="summary-label">Audit Ratio</span>
                <strong>${user.auditRatio.toFixed(2)}</strong>
            </div>
            <div class="summary-item">
                <span class="summary-label">Audit Received</span>
                <strong>${(user.totalUp / 1000).toFixed(1)} kB</strong>
            </div>
            <div class="summary-item">
                <span class="summary-label">Audit Done</span>
                <strong>${(user.totalDown / 1000).toFixed(1)} kB</strong>
            </div>
            <div class="summary-item">
                <span class="summary-label">Passed Projects</span>
                <strong>${summary.passed}</strong>
            </div>
            <div class="summary-item">
                <span class="summary-label">Failed Projects</span>
                <strong>${summary.failed}</strong>
            </div>
            <div class="summary-item">
                <span class="summary-label">In Progress</span>
                <strong>${summary.inProgress}</strong>
            </div>
        </div>
    `;

    const graphTransactions = filteredTransactions.filter(
        t => !t.path.startsWith("/bahrain/bh-module/checkpoint/")
    );

    renderInsights(graphTransactions);
    renderProjectHistory(filteredTransactions);
    drawXPGraph(graphTransactions);
    drawAuditGraph(user.totalUp, user.totalDown);
}

