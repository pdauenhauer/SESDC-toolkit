import { useState } from 'preact/hooks';
import { registerUser } from '../services/auth';

interface RegisterFormProps {
  isVisible: boolean;
  showLogin: () => void;
}

export default function RegisterForm({ isVisible, showLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleRegister(e: Event) {
    e.preventDefault();

    const result = await registerUser(email, password, username);
    setMessage(result);
  }

  return (
    <div class={`form-container ${isVisible ? 'visible' : 'hidden'}`}>
      <h2>Create Account</h2>

      {message && <p class="message">{message}</p>}

      <form onSubmit={handleRegister}>
        <div class="input-box">
          <input
            type="text"
            placeholder="Username"
            required
            onInput={(e: any) => setUsername(e.target.value)}
          />
        </div>

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

        <button class="btn primary-btn" type="submit">Register</button>

        <p class="toggle-text">
          Already have an account?{' '}
          <a href="#" onClick={showLogin}>Log In</a>
        </p>
      </form>
    </div>
  );
}
