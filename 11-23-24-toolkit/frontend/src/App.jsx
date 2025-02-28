import React, { useState } from "react";
import HomePage from "./Components/homepage";
import Login from "./Components/login";
import Signup from "./Components/signup";
import Dashboard from "./Components/Dashboard";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login status
  const [isSigningUp, setIsSigningUp] = useState(false); // Track signup form visibility
  const [viewHome, setViewHome] = useState(true); // Control HomePage visibility

  return (
    <div>
      {viewHome ? (
        <HomePage 
          setIsSigningUp={setIsSigningUp} 
          setViewHome={setViewHome} 
        /> 
      ) : isLoggedIn ? (
        <Dashboard />
      ) : isSigningUp ? (
        <Signup onSignup={() => setIsLoggedIn(true)} onToggle={() => setIsSigningUp(false)} />
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} onToggle={() => setIsSigningUp(true)} />
      )}
    </div>
  );
}

export default App;