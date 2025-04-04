import React, { useState } from "react";
import { login } from "../auth";
import "../Components/login.css";

const Login = ({ onLogin, onToggle }) => {
  // Define states for email, password, and error
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); // Clear any previous error messages

    try {
      await login(email, password);
      alert("Login successful!");
      onLogin(); // Close modal
    } catch (error) {
      setError("Login failed: " + error.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          className="auth-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="auth-input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="auth-button">Login</button>
      </form>
      <p>
        Don’t have an account?{" "}
        <button className="auth-switch" onClick={() => { 
          onToggle(); 
          setEmail(""); // Clear input fields when switching
          setPassword("");
        }}>
          Sign Up
        </button>
      </p>
    </div>
  );
};

export default Login;