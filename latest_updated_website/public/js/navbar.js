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
    <li><a ${isActive('contact.html')} href="${baseUrl}/pages/contact.html">Contact</a></li>
    <li><a ${isActive('userGuide.html')} href="${baseUrl}/pages/userGuide.html">User Guide</a></li>
    <li><a ${isActive('login.html')} href="${baseUrl}/pages/login.html">Login</a></li>
  `;

  const loggedInNav = `
    <li><a ${isActive('index.html')} href="${baseUrl}/index.html">Home</a></li>
    <li><a ${isActive('project-selection.html')} href="${baseUrl}/pages/project-selection.html">Projects</a></li>
    <li><a ${isActive('about.html')} href="${baseUrl}/pages/about.html">About</a></li>
    <li><a ${isActive('contact.html')} href="${baseUrl}/pages/contact.html">Contact</a></li>
    <li><a ${isActive('account.html')} href="${baseUrl}/pages/account.html">Account</a></li>
    <li><a ${isActive('userGuide.html')} href="${baseUrl}/pages/userGuide.html">User Guide</a></li>
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

    // Only show logged-in nav if user exists AND email is verified
    if (user && user.emailVerified) {
      navbar.innerHTML = loggedInNav;
      attachLogoutListener();
      startInactivityLogoutTimer();
    } else {
      // If user exists but email is not verified, sign them out
      if (user && !user.emailVerified) {
        // Don't sign out on login page to avoid redirect loops
        const currentPage = getCurrentPage();
        if (currentPage !== 'login.html') {
          signOut(auth).then(() => {
            console.log("Signed out unverified user");
            localStorage.clear();

            // Only redirect to login if not already there
            if (currentPage !== 'login.html') {
              window.location.href = `${getBaseUrl()}/pages/login.html`;
            }
          }).catch((error) => {
            console.error("Sign out error:", error);
          });
        }
      }

      // Always show logged-out nav if user is not verified
      navbar.innerHTML = loggedOutNav;
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
