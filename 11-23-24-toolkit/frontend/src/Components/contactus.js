document.addEventListener("DOMContentLoaded", function() {
    const contactForm = document.getElementById("contactForm");
  
    contactForm.addEventListener("submit", function(e) {
      e.preventDefault();
  
      // Gather the form data into an object
      const formData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        message: document.getElementById("message").value.trim()
      };
  
      // Log the form data (simulate form submission)
      console.log(formData);
  
      // Show a success message
      alert("Message sent!");
  
      // Clear the form fields
      contactForm.reset();
    });
  });
  