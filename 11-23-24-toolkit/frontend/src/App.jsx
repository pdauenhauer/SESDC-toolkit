import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./Components/homepage"; // Make sure this is the correct import
import About from "./Components/About";
import Help from "./Components/Help";
import ContactUs from "./Components/ContactUs";
import Login from "./Components/login";
import Signup from "./Components/signup";
import Dashboard from "./Components/Dashboard";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Router>
      <Routes>
        {/* Home Page as the default route */}
        <Route path="/" element={<HomePage />} />

        {/* Other pages */}
        <Route path="/about" element={<About />} />
        <Route path="/help" element={<Help />} />
        <Route path="/contactus" element={<ContactUs />} />

        {/* Login and Signup pages */}
        <Route path="/login" element={<Login onLogin={() => setIsLoggedIn(true)} />} />
        <Route path="/signup" element={<Signup onSignup={() => setIsLoggedIn(true)} />} />

        {/* Dashboard - requires login */}
        <Route path="/dashboard" element={isLoggedIn ? <Dashboard /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

