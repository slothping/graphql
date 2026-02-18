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

        const jwt = await response.json();
        localStorage.setItem('reboot_jwt', jwt);
        showProfile();
        
    } catch (err) {
        errorMsg.innerText = err.message;
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('reboot_jwt');
    location.reload();
});

function showProfile() {
    loginContainer.classList.add('hidden');
    profileContainer.classList.remove('hidden');
    fetchUserData();
    console.log("Logged in! Token stored.");
}

async function fetchUserData() {
    const token = localStorage.getItem('reboot_jwt');
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

    const userDataElement = document.getElementById('user-data');

    const result = await response.json();
    userdata = result.data.user[0];
    userDataElement.innerText = `Welcome, ${userdata.login}! You have ${userdata.transactions.reduce((sum, t) => sum + t.amount, 0)} XP.`;
    console.log(result.data.user);
}

if (localStorage.getItem('reboot_jwt')) {
    showProfile();
}