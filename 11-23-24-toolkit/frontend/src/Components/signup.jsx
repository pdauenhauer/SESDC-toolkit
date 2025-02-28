import React, { useState } from "react";
import { signup } from "../auth";
import "../Components/login.css";

const Signup = ({ onSignup, onToggle }) => {
  // Define states for email, password, confirmPassword, and error
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous error messages

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      await signup(email, password);
      alert("Signup successful!");
      onSignup(); // Close modal
    } catch (error) {
      setError("Signup failed: " + error.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup}>
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
        <input
          type="password"
          className="auth-input"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="auth-button">Sign Up</button>
      </form>
      <p>
        Already have an account?{" "}
        <button className="auth-switch" onClick={() => { 
          onToggle();
          setEmail("");
          setPassword("");
          setConfirmPassword(""); // Reset fields when switching
        }}>
          Log In
        </button>
      </p>
    </div>
  );
};

export default Signup;