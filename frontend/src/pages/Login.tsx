// src/pages/Login.tsx
import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
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
          <RegisterForm isVisible={!isLoginActive} handleRegisterSubmit={handleRegisterSubmit} showLogin={showLogin}/>
        </div>
      </main>

      <SESDCFooter />

    </>
  );
}
