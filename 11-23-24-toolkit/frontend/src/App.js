import React, { useState } from "react";
import Login from "./Components/Login";
import Signup from "./Components/Signup";
import Dashboard from "./Components/Dashboard";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login status
  const [isSigningUp, setIsSigningUp] = useState(false); // Track signup form visibility

  const handleLogin = () => {
    setIsLoggedIn(true); // Switch to dashboard after login
  };

  return (
    <div>
      {isLoggedIn ? (
        <Dashboard />
      ) : isSigningUp ? (
        <Signup
          onSignup={() => setIsLoggedIn(true)} // Redirect to Dashboard after signup
          onToggle={() => setIsSigningUp(false)} // Go back to Login
        />
      ) : (
        <Login
          onLogin={handleLogin} // Redirect to Dashboard after login
          onToggle={() => setIsSigningUp(true)} // Go to Signup
        />
      )}
    </div>
  );
}

export default App;
