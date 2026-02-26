const DOMAIN = "learn.reboot01.com";
const SIGNIN_URL = `https://learn.reboot01.com/api/auth/signin`;

const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const errorMsg = document.getElementById('error-msg');
const loginContainer = document.getElementById('login-container');
const profileContainer = document.getElementById('profile-container');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.innerText = "";
    
    const user = document.getElementById('identifier').value;
    const pass = document.getElementById('password').value;

    // Encode credentials in Base64 for Basic Auth
    const credentials = btoa(`${user}:${pass}`);

    try {
        const response = await fetch(SIGNIN_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error("Invalid credentials or server error.");
        }

        const data = await response.json();
        // server may return { token: '...' } or just the string
        const token = data.token || data;
        localStorage.setItem('reboot_jwt', token);
        showProfile();
        
    } catch (err) {
        errorMsg.innerText = err.message;
    }
});

logoutBtn.addEventListener('click', () => {
    logout();
});

function logout() {
    localStorage.removeItem('reboot_jwt');
    location.reload();
}

function isTokenExpired(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payload = JSON.parse(atob(parts[1]));
        if (!payload.exp) return false;
        // exp is in seconds since unix epoch
        return Date.now() / 1000 > payload.exp;
    } catch (e) {
        console.warn('Failed to parse token for expiration', e);
        return true;
    }
}

function showProfile() {
    loginContainer.classList.add('hidden');
    profileContainer.classList.remove('hidden');
    fetchUserData();
}

async function fetchUserData() {
    const token = localStorage.getItem('reboot_jwt');
    if (!token || isTokenExpired(token)) {
        logout();
        return;
    }

    const GQL_URL = `https://learn.reboot01.com/api/graphql-engine/v1/graphql`;

    const query = `
    {
      user {
        id
        login
        transactions(where: {type: {_eq: "xp"}}) {
          amount
          createdAt
        }
      }
    }`;

    const response = await fetch(GQL_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });

    if (response.status === 401) {
        logout();
        return;
    }

    const result = await response.json();
    if (result.errors) {
        console.warn('GraphQL error fetching user data', result.errors);
        logout();
        return;
    }

    const userDataElement = document.getElementById('user-data');
    const userdata = result.data.user[0];
    userDataElement.innerText = `Welcome, ${userdata.login}! You have ${userdata.transactions.reduce((sum, t) => sum + t.amount, 0)} XP.`;
}

// initial load: show profile only if token present and unexpired
const stored = localStorage.getItem('reboot_jwt');
if (stored && !isTokenExpired(stored)) {
    showProfile();
} else if (stored) {
    localStorage.removeItem('reboot_jwt');
}

