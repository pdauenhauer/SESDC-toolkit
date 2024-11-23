import React, { useState } from "react";
import { signup } from "../auth";

const Signup = ({ onSignup, onToggle }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await signup(email, password);
      alert("Signup successful!");
      onSignup(); // Call the onSignup function from App.js
    } catch (error) {
      alert("Signup failed: " + error.message);
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Sign Up</button>
      </form>
      <p>
        Already have an account?{" "}
        <button onClick={onToggle}>Log In</button>
      </p>
    </div>
  );
};

export default Signup;
