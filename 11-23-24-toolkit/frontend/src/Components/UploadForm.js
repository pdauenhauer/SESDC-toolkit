import React, { useState } from "react";

function UploadForm() {
  const [file, setFile] = useState(null); //store the uploaded file
  const [responseMessage, setResponseMessage] = useState(""); //to display server response
  const [imageUrl, setImageUrl] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]); //update the file state with the selected file
    console.log("File selected:", event.target.files[0]); //debug
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log("Uploading file:", file);

    if (!file) {
      alert("Please upload a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file); //append the file to the FormData object

    try {
      console.log("fetching response...");
      const response = await fetch("http://localhost:8080/upload", {
        method: "POST",
        body: formData,
      });
      console.log("Response status:", response.status);

      if (!response.ok) {
        // Log the full response for debugging
	console.log("Response not accepted");
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.error || "File upload failed.");
      }

      const data = await response.json();
      console.log("Data from backend:", data);

      if (data.message) {
	  setResponseMessage(data.message);
      } else {
	  alert("Message not found in response.");
      }

      if (data.plot_url) {
          setImageUrl(data.plot_url);  //set the plot image URL returned from the backend
      }

    } catch (error) {
      console.error("Error uploading file:", error);
      setResponseMessage("Error uploading file.");
    }
  };

  return (
    <div>
      <h2>Upload CSV File</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <button type="submit">Upload</button>
      </form>
      {responseMessage && <p>{responseMessage}</p>}
      {/* Display the generated plot image */}
      {imageUrl && <div>
          <h3>Generated Graph:</h3>
          <img src={`http://localhost:8080/${imageUrl}`} alt="Generated graph" style={{ maxWidth: '100%' }} />
      </div>}
    </div>
  );
};

export default UploadForm;