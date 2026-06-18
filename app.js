const SIGNIN_URL =
    "https://learn.reboot01.com/api/auth/signin";

const GQL_URL =
    "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

const loginForm =
    document.getElementById("login-form");

const logoutBtn =
    document.getElementById("logout-btn");

const loginContainer =
    document.getElementById("login-container");

const profileContainer =
    document.getElementById("profile-container");

const errorMsg =
    document.getElementById("error-msg");

loginForm.addEventListener("submit", login);

logoutBtn.addEventListener("click", logout);

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("reboot_jwt");

    if (token && !isTokenExpired(token)) {
        showProfile();
    }
});

async function login(e) {
    e.preventDefault();

    const username =
        document.getElementById("identifier").value;

    const password =
        document.getElementById("password").value;

    const credentials =
        btoa(`${username}:${password}`);

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

        const token =
            data.token || data;

        localStorage.setItem(
            "reboot_jwt",
            token
        );

        showProfile();

    } catch (err) {
        errorMsg.innerText = err.message;
    }
}

function logout() {
    localStorage.removeItem("reboot_jwt");
    location.reload();
}

function isTokenExpired(token) {
    try {
        const payload =
            JSON.parse(
                atob(token.split(".")[1])
            );

        return Date.now() / 1000 > payload.exp;
    } catch {
        return true;
    }
}

function showProfile() {
    loginContainer.hidden = true;
    profileContainer.hidden = false;

    fetchUserData();
}

async function fetchUserData() {
    const token = localStorage.getItem("reboot_jwt");

    if (!token || isTokenExpired(token)) {
        logout();
        return;
    }

    const query = `
    {
      user {
        login
        auditRatio
        totalUp
        totalDown

        transactions(
          where: {
            _and: [
              {type: {_eq: "xp"}},
              {path: {_like: "/bahrain/bh-module%"}}
            ]
          }
          order_by: {createdAt: asc}
        ) {
          amount
          path
          createdAt
        }

        progresses(
          where: {
            _and: [
              {path: {_like: "/bahrain/bh-module%"}},
              {path: {_nlike: "/bahrain/bh-module/piscine-js%"}},
              {path: {_nlike: "/bahrain/bh-module/checkpoint%"}}
            ]
          }
        ) {
          path
          grade
          isDone
        }
      }
    }`;

    const response = await fetch(GQL_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
    });

    const result = await response.json();

    const user = result.data.user[0];

    const filteredTransactions =
        user.transactions.filter(t => {

            const path = t.path;

            if (path === "/bahrain/bh-module/piscine-js") {
                return true;
            }

            if (
                path.startsWith(
                    "/bahrain/bh-module/checkpoint"
                )
            ) {
                return false;
            }

            if (
                path.startsWith(
                    "/bahrain/bh-module/piscine-js/"
                )
            ) {
                return false;
            }

            return true;
        });

    const totalXP =
        filteredTransactions.reduce(
            (sum, t) => sum + t.amount,
            0
        );

    const projectMap = {};

    user.progresses.forEach(p => {

        // ignore module root
        if (p.path === "/bahrain/bh-module") return;

        if (!projectMap[p.path]) {
            projectMap[p.path] = p;
            return;
        }

        const current = projectMap[p.path];

        const currentGrade =
            current.grade === null ? -1 : current.grade;

        const newGrade =
            p.grade === null ? -1 : p.grade;

        if (newGrade > currentGrade) {
            projectMap[p.path] = p;
        }
    });

    const projects = Object.values(projectMap);

    const passed = projects.filter(
        p => p.grade !== null && p.grade >= 1
    ).length;

    const failed = projects.filter(
        p => p.isDone &&
            p.grade !== null &&
            p.grade < 1
    ).length;

    const inProgress = projects.filter(
        p => !p.isDone
    ).length;

    document.getElementById("user-data").innerHTML = `
    <p>Login: ${user.login}</p>
    <p>Total XP: ${(totalXP / 1000).toFixed(1)} kB</p>
    <p>Audit Ratio: ${user.auditRatio.toFixed(2)}</p>
    <p>Passed Projects: ${passed}</p>
    <p>Failed Projects: ${failed}</p>
    <p>In Progress: ${inProgress}</p>
`;

    drawXPGraph(filteredTransactions);
    drawAuditGraph(
        user.totalUp,
        user.totalDown
    );
}

function drawXPGraph(transactions) {

    const svg =
        document.getElementById("xp-graph");

    const tooltip =
        document.getElementById("tooltip");

    const width = 600;
    const height = 250;

    if (!transactions.length) {
        svg.innerHTML = "";
        return;
    }

    const totalXP =
        transactions.reduce(
            (sum, t) => sum + t.amount,
            0
        );

    const firstDate =
        new Date(
            transactions[0].createdAt
        ).getTime();

    const now =
        Date.now();

    let cumulative = 0;

    const points = [];

    transactions.forEach(t => {

        cumulative += t.amount;

        const date =
            new Date(
                t.createdAt
            ).getTime();

        const x =
            ((date - firstDate) /
                (now - firstDate)) *
            (width - 20) + 10;

        const y =
            height -
            ((cumulative / totalXP) *
                (height - 20));

        points.push(`${x},${y}`);
    });

    const lastY =
        height -
        ((totalXP / totalXP) *
            (height - 20));

    points.push(
        `${width - 10},${lastY}`
    );

    svg.innerHTML = `
        <polyline
            points="${points.join(" ")}"
            fill="none"
            stroke="black"
            stroke-width="2"
        />
    `;

    cumulative = 0;

    transactions.forEach(t => {

        cumulative += t.amount;

        const date =
            new Date(
                t.createdAt
            ).getTime();

        const x =
            ((date - firstDate) /
                (now - firstDate)) *
            (width - 20) + 10;

        const y =
            height -
            ((cumulative / totalXP) *
                (height - 20));

        const circle =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );

        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", 6);
        circle.setAttribute("fill", "#2196f3");

        const projectName =
            t.path.split("/").pop();

        circle.addEventListener(
            "mouseenter",
            () => {

                tooltip.style.display =
                    "block";

                tooltip.innerHTML = `
                    <strong>${projectName}</strong><br>
                    XP: ${(t.amount / 1000).toFixed(2)} kB<br>
                    Total XP: ${(cumulative / 1000).toFixed(2)} kB<br>
                    Date: ${new Date(t.createdAt).toLocaleDateString()}
                `;
            }
        );

        circle.addEventListener(
            "mousemove",
            e => {

                tooltip.style.left =
                    (e.clientX + 15) + "px";

                tooltip.style.top =
                    (e.clientY + 15) + "px";
            }
        );

        circle.addEventListener(
            "mouseleave",
            () => {

                tooltip.style.display =
                    "none";
            }
        );

        svg.appendChild(circle);
    });
}

function drawAuditGraph(up, down) {

    const svg =
        document.getElementById(
            "passfail-graph"
        );

    const total = up + down;

    const upAngle =
        (up / total) * 360;

    const largeArc =
        upAngle > 180 ? 1 : 0;

    const x =
        150 +
        100 *
        Math.cos(
            (upAngle - 90) *
            Math.PI / 180
        );

    const y =
        150 +
        100 *
        Math.sin(
            (upAngle - 90) *
            Math.PI / 180
        );

    svg.innerHTML = `
        <path
            d="
            M150 150
            L150 50
            A100 100 0 ${largeArc} 1 ${x} ${y}
            Z"
            fill="#4caf50"
        />

        <path
            d="
            M150 150
            L${x} ${y}
            A100 100 0 ${largeArc ? 0 : 1} 1 150 50
            Z"
            fill="#f44336"
        />

        <circle
            cx="150"
            cy="150"
            r="55"
            fill="white"
        />

        <text
            x="150"
            y="145"
            text-anchor="middle"
            font-size="16"
            font-weight="bold"
        >
            ${(up / down).toFixed(2)}
        </text>

        <text
            x="150"
            y="165"
            text-anchor="middle"
            font-size="12"
        >
            Audit Ratio
        </text>
    `;
}