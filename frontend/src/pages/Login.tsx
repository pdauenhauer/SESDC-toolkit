import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';
import logo from '../media/Logo.svg'
import { useState } from 'preact/hooks';
import '../css/login.css';

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
      <SESDCHeader />

      <main class="login-main">
        <div class="login-logo-container">
          <img src={logo} alt="Logo" class="login-logo" />
        </div>

        <div class="login-wrapper">
          {/* LOGIN */}
          <div
            id="loginForm"
            class={`login-form-container ${activeForm === 'login' ? '' : 'login-hidden'}`}

          >
            <h1>Login</h1>
            <form id="login-form" onSubmit={handleLoginSubmit}>
              {loginMessage && (
                <div id="account-login-message" class="login-messageDiv" style="display: block;">
                  {loginMessage}
                </div>
              )}

              <div class="login-input-box">
                <input id="loginEmail" type="text" placeholder="Email" required />
                <i class="bx bxs-user"></i>
              </div>
              <div class="login-input-box">
                <input id="loginPassword" type="password" placeholder="Password" required />
                <i class="bx bxs-lock-alt"></i>
              </div>
              <button id="login" type="submit" class="btn">
                Login
              </button>
            </form>
            <div class="login-register">
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
            class={`login-form-container ${activeForm === 'register' ? '' : 'login-hidden'}`}
          >
            <h1>Create an Account</h1>
            <form id="signup-form" onSubmit={handleRegisterSubmit}>
              {registerMessage && (
                <div id="account-creation-message" class="login-messageDiv" style="display: block;">
                  {registerMessage}
                </div>
              )}

              <div class="login-input-box">
                <input id="enterEmail" type="text" placeholder="Email" required />
                <i class="bx bxs-envelope"></i>
              </div>
              <div class="login-input-box">
                <input id="enterUsername" type="text" placeholder="Username" required />
                <i class="bx bxs-user"></i>
              </div>
              <div class="login-input-box">
                <input id="enterPassword" type="password" placeholder="Password" required />
                <i class="bx bxs-lock-alt"></i>
              </div>
              <button id="register" type="submit" class="btn">
                Register
              </button>
            </form>
            <div class="login-register">
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
