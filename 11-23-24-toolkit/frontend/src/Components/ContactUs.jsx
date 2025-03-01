// src/Components/ContactUs.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../Components/style.css";
import Logo from "../logo.png";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Replace with your form submission logic
    console.log(formData);
    alert("Message sent!");
    setFormData({ name: "", email: "", message: "" });
  };

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
        <h1>Contact Us</h1>
        <p>If you have any questions or need support, please fill out the form below:</p>
        <form onSubmit={handleSubmit} className="contact-form">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Your name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Your email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            placeholder="Your message"
            value={formData.message}
            onChange={handleChange}
            required
          ></textarea>

          <button type="submit">Send Message</button>
        </form>
      </div>
    </div>
  );
};

export default ContactUs;

