import { GQL_URL } from "./auth.js";
import { isTokenExpired, logout } from "./auth.js";

export async function fetchUserData() {
  const token = localStorage.getItem("reboot_jwt");

  if (!token || isTokenExpired(token)) {
    logout();
    return null;
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
          createdAt
          updatedAt
        }
      }
    }`;

  let response;

  try {
    response = await fetch(GQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });
  } catch {
    throw new Error("Unable to reach the dashboard service.");
  }

  if (!response.ok) {
    throw new Error(`Unable to load dashboard data (${response.status}).`);
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The dashboard service returned an invalid response.");
  }

  const userData = result?.data?.user;

  if (!userData) {
    throw new Error("The dashboard service did not return any user data.");
  }

  return Array.isArray(userData) ? userData[0] : userData;
}

export function normalizeUserData(user) {
  const filteredTransactions = user.transactions.filter(t => {
    const path = t.path;
    const parts = path.split("/").filter(Boolean);

    if (path.startsWith("/bahrain/bh-module/checkpoint")) {
      return true;
    }

    return parts.length === 3 && parts[0] === "bahrain" && parts[1] === "bh-module";
  });

  const totalXP = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  const projectMap = {};

  user.progresses.forEach(p => {
    if (p.path === "/bahrain/bh-module") return;

    if (!projectMap[p.path]) {
      projectMap[p.path] = p;
      return;
    }

    const current = projectMap[p.path];
    const currentGrade = current.grade === null ? -1 : current.grade;
    const newGrade = p.grade === null ? -1 : p.grade;

    if (newGrade > currentGrade) {
      projectMap[p.path] = p;
    }
  });

  const projects = Object.values(projectMap);

  return {
    user,
    filteredTransactions,
    totalXP,
    projects,
    summary: {
      passed: projects.filter(p => p.grade !== null && p.grade >= 1).length,
      failed: projects.filter(p => p.isDone && p.grade !== null && p.grade < 1).length,
      inProgress: projects.filter(p => !p.isDone).length
    }
  };
}
