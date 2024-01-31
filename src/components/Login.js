// Login.js
import React, { useState } from 'react';
import './Login.css';


const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
  
    const handleLogin = () => {
      // Add your login logic here, e.g., making an API call
      console.log('Logging in with:', { username, password });
    };
  
    return (
      <div className="login">
        <h1>Login Page</h1>
        <form>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
  
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
  
          <button type="button" onClick={handleLogin}>
            Login
          </button>
        </form>
      </div>
    );
  };
  
  export default Login;