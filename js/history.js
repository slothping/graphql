import { formatMeasurement } from './utils.js';

export function renderProjectHistory(transactions, container = document.getElementById('project-history-section')) {
    const visibleTransactions = [...transactions].reverse();

    container.innerHTML = `
        <div class="project-history-card">
            <h3>Recent XP Submissions</h3>
            <div class="project-history-table-wrapper" id="project-history-table-wrapper">
                <table class="project-history-table">
                    <thead>
                        <tr>
                            <th>Submission</th>
                            <th>Amount</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visibleTransactions.map(transaction => `
                            <tr>
                                <td>${transaction.path ? transaction.path.split('/').filter(Boolean).pop() : 'Unknown'}</td>
                                <td>${formatMeasurement(transaction.amount)}</td>
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

    if (button && wrapper) {
        button.addEventListener("click", () => {
            const isScrollable = wrapper.classList.toggle("scrollable");
            button.textContent = isScrollable ? "Hide Scroll" : "View More";

            if (!isScrollable) {
                wrapper.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    }
}
