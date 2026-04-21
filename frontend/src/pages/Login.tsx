import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

import { useEffect, useState } from 'preact/hooks';
import '../css/login.css';


export default function Login() {
  // which form is showing
  const [isLoginActive, setIsLoginActive] = useState<boolean>(true);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Sign in';
    return () => {
      document.title = previousTitle;
    };
  }, []);

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
      <main class="login-main">
        <div class="login-wrapper">
          {/* LOGIN */}
          <LoginForm isVisible={isLoginActive} showRegister={showRegister}/>

          {/* REGISTER */}
          <RegisterForm isVisible={!isLoginActive} showLogin={showLogin}/>
        </div>
      </main>
    </>
  );
}
