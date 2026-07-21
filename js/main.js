import { SIGNIN_URL } from "./auth.js";
import { logout, isTokenExpired, showProfile } from "./auth.js";
import { fetchUserData, normalizeUserData } from "./data.js";
import { drawXPGraph, drawAuditGraph } from "./graph.js";
import { renderInsights } from "./insights.js";
import { renderProjectHistory } from "./history.js";
import { formatMeasurement } from "./utils.js";
import { runMorphTransition } from "./transitions.js";

const loginForm = document.getElementById("login-form");
const errorMsg = document.getElementById("error-msg");
const loadingScreen = document.getElementById("loading-screen");
const headerUsername = document.getElementById("header-username");
const headerAuthButton = document.getElementById("header-auth-button");
const insightsSection = document.getElementById("insights-section");
const projectHistorySection = document.getElementById("project-history-section");

loginForm.addEventListener("submit", login);
headerAuthButton.addEventListener("click", handleHeaderAuth);

window.addEventListener("DOMContentLoaded", async () => {
    updateHeader("Guest", false);
    document.getElementById("app-header").hidden = true;
    clearError();
    showLoading(false);

    const token = localStorage.getItem("reboot_jwt");

    if (token && !isTokenExpired(token)) {
        showLoading(true);
        try {
            await loadProfile();
            showProfile();
        } catch {
            showLoginError("Unable to load the dashboard right now.");
        } finally {
            showLoading(false);
        }
    }
});

function handleHeaderAuth() {
    if (headerAuthButton.textContent === "Logout") {
        performLogout();
    } else {
        document.getElementById("login-container").hidden = false;
        document.getElementById("profile-container").hidden = true;
        document.getElementById("identifier").focus();
        showLoading(false);
    }
}

function updateHeader(userName, loggedIn) {
    headerUsername.textContent = userName || "Guest";
    headerAuthButton.textContent = loggedIn ? "Logout" : "Login";
}

function clearError() {
    errorMsg.textContent = "";
    errorMsg.classList.remove("show");
}

function showLoading(isLoading) {
    loadingScreen.hidden = !isLoading;
    loadingScreen.style.display = isLoading ? "grid" : "none";
}

function showLoginError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add("show");
    document.getElementById("login-container").hidden = false;
    document.getElementById("profile-container").hidden = true;
    document.getElementById("app-header").hidden = true;
    showLoading(false);
}

async function login(e) {
    e.preventDefault();

    clearError();
    showLoading(true);

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

        await loadProfile();
        await performLoginTransition();
    } catch (err) {
        const message = err.message === "Invalid credentials"
            ? "Invalid username or password. Please check your credentials and try again."
            : err.message || "Unable to sign in. Please try again.";

        showLoginError(message);
    } finally {
        showLoading(false);
    }
}

async function performLogout() {
    await runMorphTransition({
        direction: 'top',
        onMid: () => {
            logout();
            updateHeader('Guest', false);
        }
    });
}

async function performLoginTransition() {
    await runMorphTransition({
        direction: 'bottom',
        onMid: () => showProfile(),
    });
}

async function loadProfile() {
    try {
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
                    <span class="summary-label">Username</span>
                    <strong>${user.login}</strong>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total XP</span>
                    <strong>${formatMeasurement(totalXP)}</strong>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Audit Ratio</span>
                    <strong>${user.auditRatio.toFixed(2)}</strong>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Audit Received</span>
                    <strong>${formatMeasurement(user.totalUp)}</strong>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Audit Done</span>
                    <strong>${formatMeasurement(user.totalDown)}</strong>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Passed Projects</span>
                    <strong>${summary.passed}</strong>
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
    } catch (err) {
        throw err;
    }
}

