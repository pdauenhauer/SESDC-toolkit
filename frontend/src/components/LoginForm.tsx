import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { loginUser } from '../utils/firebase/auth';
import logo from '../media/Logo.svg';


interface LoginFormProps {
  isVisible: boolean;
  showRegister: () => void;
}

export default function LoginForm({ isVisible, showRegister }: LoginFormProps) {
  const { route } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleLogin(e: Event) {
    e.preventDefault();
    const result = await loginUser(email, password);
    setMessage(result);

    if (result === 'Sign in successful!') {
      route('/');
    }
  }

  return (
    <div class={`login-form-container ${isVisible ? 'login-visible' : 'login-hidden'}`}>
      <div class="login-form-brand">
        <img src={logo} alt="SESDC logo" class="login-form-brand-logo" />
        <span class="login-form-brand-text">Microgrid Toolkit</span>
      </div>
      <h2>Sign in</h2>

      {message && <p class="message">{message}</p>}

      <form onSubmit={handleLogin}>
        <div class="login-input-box">
          <input
            type="email"
            placeholder="Email"
            required
            onInput={(e: any) => setEmail(e.target.value)}
          />
        </div>

        <div class="login-input-box">
          <input
            type="password"
            placeholder="Password"
            required
            onInput={(e: any) => setPassword(e.target.value)}
          />
        </div>

        <button class="login-btn login-primary-btn" type="submit">Sign in</button>

        <p class="toggle-text">
          Don't have an account?{' '}
          <a href="#" onClick={showRegister}>Register</a>
        </p>
      </form>
    </div>
  );
}
