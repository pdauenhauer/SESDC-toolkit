import React, { useState } from "react";
import { Link } from "react-router-dom"; // Import Link for routing
import Modal from "./modal";
import Login from "./login";
import Signup from "./signup";
import "../Components/style.css";
import Logo from "../logo.png";

const HomePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleOpenModal = (signingUp) => {
    setIsSigningUp(signingUp);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
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
            <button className="register-btn" onClick={() => handleOpenModal(true)}>
              Sign Up
            </button>
            <button className="login-btn" onClick={() => handleOpenModal(false)}>
              Login
            </button>
          </div>
        </div>
      </nav>


      {/* Hero Section */}
      <section className="hero-section">
        <div className="content-box">
          {/* Left Side: Title & Button */}
          <div className="left-content">
            <h1 className="title">
              A user-friendly microgrid <br /> design tool
            </h1>
            <button className="design-tool-button">Open Design Tool</button>
          </div>

          {/* Right Side: Image */}
          <div className="graph-placeholder">
            <img
              src="https://www.investopedia.com/thmb/4KkPFX210Dfk2P1vrH2WcJ_IsYc=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/CPI_select-c0428c0813204d739c2e48785d3bc49a.JPG"
              alt="Graph Example"
              className="graph-image"
            />
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="overview-section">
        <p>
          Understanding Our Project: Learn why we created this tool and how it benefits users. In addition to answering any questions you may have.
        </p>
        <button className="get-started">Learn More!</button>
      </section>

      {/* Login/Signup Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {isSigningUp ? (
          <Signup onSignup={() => setIsModalOpen(false)} onToggle={() => setIsSigningUp(false)} />
        ) : (
          <Login onLogin={() => setIsModalOpen(false)} onToggle={() => setIsSigningUp(true)} />
        )}
      </Modal>

      {/* Footer (Bottom Bar) */}
      <footer className="mt-auto bg-gray-800 text-white py-4 w-full text-center">
        <p>&copy; 2025 SESDC. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;

