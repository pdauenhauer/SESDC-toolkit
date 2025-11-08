// src/pages/Login.tsx
import { useState } from 'preact/hooks';
import '../css/new-login.css';

export default function Login() {
  // which form is showing
  const [activeForm, setActiveForm] = useState<'login' | 'register'>('login');
  const [loginMessage, setLoginMessage] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');

  function showLogin(e?: Event) {
    e?.preventDefault();
    setActiveForm('login');
    setRegisterMessage('');
  }

  function showRegister(e?: Event) {
    e?.preventDefault();
    setActiveForm('register');
    setLoginMessage('');
  }

  function handleLoginSubmit(e: Event) {
    e.preventDefault();
    // TODO: replace with real login request
    setLoginMessage('Logged in (demo).');
  }

  function handleRegisterSubmit(e: Event) {
    e.preventDefault();
    // TODO: replace with real register request
    setRegisterMessage('Account created (demo).');
  }

  return (
    <>
      {/* navbar */}
      <nav>
        <input type="checkbox" id="check" />
        <label htmlFor="check" class="check-btn">
          <i class="bx bx-menu"></i>
        </label>

        <div class="nav-left">
          <img src="/media/Logo-white.svg" alt="Logo" class="nav-logo" />
          <label class="logo-nav">Microgrid Toolkit</label>
        </div>

        <ul id="navbar">{/* add links or replace with <Navbar /> */}</ul>
      </nav>

      <main>
        <div class="logo-container">
          <img src="/media/Logo.svg" alt="Logo" class="logo" />
        </div>

        <div class="wrapper">
          {/* LOGIN */}
          <div
            id="loginForm"
            class={`form-container ${activeForm === 'login' ? 'visible' : 'hidden'}`}
          >
            <h1>Login</h1>
            <form id="login-form" onSubmit={handleLoginSubmit}>
              {loginMessage && (
                <div id="account-login-message" class="messageDiv" style="display: block;">
                  {loginMessage}
                </div>
              )}

              <div class="input-box">
                <input id="loginEmail" type="text" placeholder="Email" required />
                <i class="bx bxs-user"></i>
              </div>
              <div class="input-box">
                <input id="loginPassword" type="password" placeholder="Password" required />
                <i class="bx bxs-lock-alt"></i>
              </div>
              <button id="login" type="submit" class="btn">
                Login
              </button>
            </form>
            <div class="register">
              <p>
                Don't have an account?{' '}
                <a href="#" class="toggle-form" onClick={showRegister}>
                  Register
                </a>
              </p>
            </div>
          </div>

          {/* REGISTER */}
          <div
            id="registerForm"
            class={`form-container ${activeForm === 'register' ? 'visible' : 'hidden'}`}
          >
            <h1>Create an Account</h1>
            <form id="signup-form" onSubmit={handleRegisterSubmit}>
              {registerMessage && (
                <div id="account-creation-message" class="messageDiv" style="display: block;">
                  {registerMessage}
                </div>
              )}

              <div class="input-box">
                <input id="enterEmail" type="text" placeholder="Email" required />
                <i class="bx bxs-envelope"></i>
              </div>
              <div class="input-box">
                <input id="enterUsername" type="text" placeholder="Username" required />
                <i class="bx bxs-user"></i>
              </div>
              <div class="input-box">
                <input id="enterPassword" type="password" placeholder="Password" required />
                <i class="bx bxs-lock-alt"></i>
              </div>
              <button id="register" type="submit" class="btn">
                Register
              </button>
            </form>
            <div class="register">
              <p>
                Already have an account?{' '}
                <a href="#" class="toggle-form" onClick={showLogin}>
                  Login
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer class="footer">
        <div class="social-icons">
          <a
            href="https://www.facebook.com/KilowattsforHumanity/"
            target="_blank"
            rel="noreferrer"
          >
            <i class="bx bxl-facebook"></i>
          </a>
          <a
            href="https://www.instagram.com/kilowattsforhumanity/"
            target="_blank"
            rel="noreferrer"
          >
            <i class="bx bxl-instagram"></i>
          </a>
          <a
            href="https://www.linkedin.com/company/kilowatts-for-humanity/posts/?feedView=all"
            target="_blank"
            rel="noreferrer"
          >
            <i class="bx bxl-linkedin"></i>
          </a>
          <a
            href="https://github.com/pdauenhauer/SESDC-toolkit"
            target="_blank"
            rel="noreferrer"
          >
            <i class="bx bxl-github"></i>
          </a>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2025 SESDC. All rights reserved</p>
        </div>
      </footer>
    </>
  );
}
