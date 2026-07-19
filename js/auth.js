export const SIGNIN_URL =
    "https://learn.reboot01.com/api/auth/signin";

export const GQL_URL =
    "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

export function isTokenExpired(token) {
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

export function logout() {
    localStorage.removeItem("reboot_jwt");
    document.getElementById("profile-container").hidden = true;
    document.getElementById("login-container").hidden = false;
    document.getElementById("app-header").hidden = true;
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
        loadingScreen.setAttribute("hidden", "true");
        loadingScreen.style.display = "none";
    }
    const errorMsg = document.getElementById("error-msg");
    if (errorMsg) {
        errorMsg.textContent = "";
    }
}

export function showProfile() {
    document.getElementById("login-container").hidden = true;
    document.getElementById("profile-container").hidden = false;
    document.getElementById("app-header").hidden = false;
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
        loadingScreen.setAttribute("hidden", "true");
        loadingScreen.style.display = "none";
    }
}
