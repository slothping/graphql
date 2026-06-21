import { SIGNIN_URL } from "./auth.js";
import { logout, isTokenExpired, showProfile } from "./auth.js";
import { fetchUserData, normalizeUserData } from "./data.js";
import { drawXPGraph, drawAuditGraph } from "./graph.js";

const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const errorMsg = document.getElementById("error-msg");
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

    renderProjectHistory(filteredTransactions);
    drawXPGraph(filteredTransactions);
    drawAuditGraph(user.totalUp, user.totalDown);
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
                                <td>${transaction.path || "Unknown"}</td>
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
