import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

import logo from '../media/Logo.svg'
import { useState } from 'preact/hooks';
import '../css/login.css';


export default function Login() {
  // which form is showing
  const [isLoginActive, setIsLoginActive] = useState<boolean>(true);

  function showLogin(e?: Event) {
    e?.preventDefault();
    setIsLoginActive(true);
  }

  function showRegister(e?: Event) {
    e?.preventDefault();
    setIsLoginActive(false);
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
          <LoginForm isVisible={isLoginActive} showRegister={showRegister}/>

          {/* REGISTER */}
          <RegisterForm isVisible={!isLoginActive} showLogin={showLogin}/>
        </div>
      </main>

      <SESDCFooter />

    </>
  );
}
