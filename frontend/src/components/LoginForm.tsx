import { useState } from 'preact/hooks';
import { loginUser } from '../services/auth';

interface LoginFormProps {
  isVisible: boolean;
  showRegister: () => void;
}

export default function LoginForm({ isVisible, showRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleLogin(e: Event) {
    e.preventDefault();
    const result = await loginUser(email, password);
    setMessage(result);

    if (result === 'Login Successful!') {
      window.location.href = '/project-selection';
    }
  }

  return (
    <div class={`form-container ${isVisible ? 'visible' : 'hidden'}`}>
      <h2>Login</h2>

      {message && <p class="message">{message}</p>}

      <form onSubmit={handleLogin}>
        <div class="input-box">
          <input
            type="email"
            placeholder="Email"
            required
            onInput={(e: any) => setEmail(e.target.value)}
          />
        </div>

        <div class="input-box">
          <input
            type="password"
            placeholder="Password"
            required
            onInput={(e: any) => setPassword(e.target.value)}
          />
        </div>

        <button class="btn primary-btn" type="submit">Login</button>

        <p class="toggle-text">
          Don't have an account?{' '}
          <a href="#" onClick={showRegister}>Register</a>
        </p>
      </form>
    </div>
  );
}
