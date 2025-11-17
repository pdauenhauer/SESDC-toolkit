// src/pages/Login.tsx
import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';
import LoginForm from '../components/LoginForm';
import logo from '../media/Logo.svg'

import { useState } from 'preact/hooks';
import '../css/new-login.css';

export default function Login() {
  // which form is showing
  const [isLoginActive, setIsLoginActive] = useState<boolean>(true);
  const [loginMessage, setLoginMessage] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');

  function showLogin(e?: Event) {
    e?.preventDefault();
    setIsLoginActive(true);
    setRegisterMessage('');
  }

  function showRegister(e?: Event) {
    e?.preventDefault();
    setIsLoginActive(false);
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
      <SESDCHeader />

      <main>
        <div class="logo-container">
          <img src={logo} alt="Logo" class="logo" />
        </div>

        <div class="wrapper">
          {/* LOGIN */}
          <LoginForm isVisible={isLoginActive} handleLoginSubmit={handleLoginSubmit} showRegister={showRegister}/>

          {/* REGISTER */}
          <div
            id="registerForm"
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

      <SESDCFooter />

    </>
  );
}
