// src/Components/About.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../Components/style.css";
import Logo from "../logo.png";

const About = () => {
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
        <h1>About Us</h1>
        <p>
          Welcome to our project! Our mission is to help plan for the long-term impact and sustainability of microgrid installations. 
          The main feature of the tool is a customizable simulation that predicts energy production and consumption as well as socioeconomic 
          impacts of a microgrid system. It is a web application that should enable system designers optimize their plans for energy solutions in 
          developing countries.
        </p>
      </div>

    </div>
  );
};

export default About;

