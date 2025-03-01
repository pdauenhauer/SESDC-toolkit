// src/Components/Help.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../Components/style.css";
import Logo from "../logo.png";

const Help = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav>
        <div className="nav-wrapper">
          <div className="logo">
            <img src={Logo} alt="SESDC Logo" className="logo-image" />
          </div>
          <div className="nav-center">
            <ul className="nav-links">
              <li>
                <Link to="/" className="nav-link">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="nav-link">
                  About
                </Link>
              </li>
              <li>
                <Link to="/help" className="nav-link">
                  Help
                </Link>
              </li>
              <li>
                <Link to="/contactus" className="nav-link">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
          <div className="button-container">
            <Link to="/signup" className="register-btn">
              Sign Up
            </Link>
            <Link to="/login" className="login-btn">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="page-container">
        <h1>Help</h1>
        <p>
          Here you'll find frequently asked questions and helpful guides for using our microgrid design tool.
        </p>
        
      </div>
    </div>
  );
};

export default Help;

