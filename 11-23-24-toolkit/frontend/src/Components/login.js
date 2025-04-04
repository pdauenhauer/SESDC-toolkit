document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const errorMsg = document.getElementById("errorMsg");
  
    // Simulated login function; replace with real authentication.
    function login(email, password) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (email === "test@test.com" && password === "password") {
            resolve();
          } else {
            reject(new Error("Invalid email or password."));
          }
        }, 1000);
      });
    }
  
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
  
      // Clear any previous error
      errorMsg.style.display = "none";
      errorMsg.textContent = "";
  
      // Custom validation checks
      if (!emailInput.value.trim()) {
        errorMsg.style.display = "block";
        errorMsg.textContent = "Please enter your email.";
        return;
      }
      if (!passwordInput.value.trim()) {
        errorMsg.style.display = "block";
        errorMsg.textContent = "Please enter your password.";
        return;
      }
  
      // Attempt login
      try {
        await login(emailInput.value, passwordInput.value);
        alert("Login successful!");
  
        // Close the modal in the parent window if using an iframe
        if (window.parent && window.parent.document) {
          window.parent.document.getElementById("modal").classList.remove("active");
          window.parent.document.getElementById("loginIframe").src = "";
        }
      } catch (error) {
        errorMsg.style.display = "block";
        errorMsg.textContent = "Login failed: " + error.message;
      }
    });
  
    // Handle switching to signup (if you have a signup page)
    const toggleToSignup = document.getElementById("toggleToSignup");
    if (toggleToSignup) {
      toggleToSignup.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "signup.html";
      });
    }
  });
  