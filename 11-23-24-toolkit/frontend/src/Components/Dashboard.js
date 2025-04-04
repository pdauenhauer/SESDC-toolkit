// src/components/Dashboard.js
import React from "react";
import UploadForm from "./UploadForm";


const Dashboard = () => {
  return (
    <div>
      <h1>Welcome to your dashboard!</h1>
      <p>Here you can manage your account, view analytics, and more.</p>
      <h1>CSV Uploader</h1>
      <UploadForm />
    </div>
  );
};

export default Dashboard;
