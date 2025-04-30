import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { app } from '../js/firebase-init.js';

const auth = getAuth(app);
const navbar = document.getElementById("navbar");

function getBaseUrl() {
  const path = window.location.pathname;
  return path.includes('/pages/') ? '..' : '.';
}

function getCurrentPage() {
  const path = window.location.pathname;
  const pageName = path.split('/').pop();
  return (!pageName || pageName === '') ? 'index.html' : pageName;
}

function updateNavLinks() {
  const baseUrl = getBaseUrl();
  const currentPage = getCurrentPage();

  function isActive(pageName) {
    return currentPage === pageName ? 'class="active"' : '';
  }

  const loggedOutNav = `
    <li><a ${isActive('index.html')} href="${baseUrl}/index.html">Home</a></li>
    <li><a ${isActive('about.html')} href="${baseUrl}/pages/about.html">About</a></li>
    <li><a ${isActive('help.html')} href="${baseUrl}/pages/help.html">Help</a></li>
    <li><a ${isActive('contact.html')} href="${baseUrl}/pages/contact.html">Contact</a></li>
    <li><a ${isActive('login.html')} href="${baseUrl}/pages/login.html">Login</a></li>
  `;

  const loggedInNav = `
    <li><a ${isActive('index.html')} href="${baseUrl}/index.html">Home</a></li>
    <li><a ${isActive('project-selection.html')} href="${baseUrl}/pages/project-selection.html">Projects</a></li>
    <li><a ${isActive('about.html')} href="${baseUrl}/pages/about.html">About</a></li>
    <li><a ${isActive('help.html')} href="${baseUrl}/pages/help.html">Help</a></li>
    <li><a ${isActive('contact.html')} href="${baseUrl}/pages/contact.html">Contact</a></li>
    <li><a ${isActive('login.html')} id="logout" href="#">Logout</a></li>
  `;

  return { loggedOutNav, loggedInNav };
}

document.addEventListener('DOMContentLoaded', () => {
  if (!navbar) {
    console.error("Navbar element not found!");
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (!navbar) return;

    const { loggedOutNav, loggedInNav } = updateNavLinks();
    navbar.innerHTML = user ? loggedInNav : loggedOutNav;

    if (user) {
      attachLogoutListener();
      startInactivityLogoutTimer(); // 🔒 add this line
    }
  });
});

function attachLogoutListener() {
  const logoutLink = document.getElementById("logout");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      signOut(auth).then(() => {
        console.log("Signed out successfully");
        localStorage.clear();
        window.location.href = `${getBaseUrl()}/pages/login.html`;
      }).catch((error) => {
        console.error("Logout error:", error);
      });
    });
  }
}

// === Inactivity Timer for Auto Logout ===
function startInactivityLogoutTimer() {
  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
  let timer;

  function logoutUser() {
    signOut(auth).then(() => {
      console.log("Logged out due to inactivity.");
      localStorage.clear();
      window.location.href = `${getBaseUrl()}/pages/login.html`;
    }).catch((error) => {
      console.error("Auto-logout error:", error);
    });
  }

  function resetTimer() {
    clearTimeout(timer);
    timer = setTimeout(logoutUser, INACTIVITY_LIMIT);
  }

  ['mousemove', 'keydown', 'click', 'touchstart'].forEach(event => {
    window.addEventListener(event, resetTimer);
  });

  resetTimer(); // Initial timer start
}
