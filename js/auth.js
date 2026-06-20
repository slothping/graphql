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
    location.reload();
}

export function showProfile() {
    document.getElementById("login-container").hidden = true;
    document.getElementById("profile-container").hidden = false;
}
