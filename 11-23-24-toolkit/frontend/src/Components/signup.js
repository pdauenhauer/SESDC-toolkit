document.addEventListener("DOMContentLoaded", function () {
    const signupForm = document.getElementById("signupForm");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const confirmPasswordInput = document.getElementById("confirmPasswordInput");
    const errorMsg = document.getElementById("errorMsg");
    const toggleToLogin = document.getElementById("toggleToLogin");
  
    // Simulated signup function; replace with your actual authentication logic.
    function signup(email, password) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (email && password) {
            resolve();
          } else {
            reject(new Error("Invalid input"));
          }
        }, 1000);
      });
    }
  
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      errorMsg.style.display = "none";
      errorMsg.textContent = "";
  
      const email = emailInput.value;
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;
  
      if (password !== confirmPassword) {
        errorMsg.style.display = "block";
        errorMsg.textContent = "Passwords do not match!";
        return;
      }
  
      try {
        await signup(email, password);
        alert("Signup successful!");
        // Close the modal in the parent window if this is in an iframe
        if (window.parent && window.parent.document) {
          window.parent.document.getElementById("modal").classList.remove("active");
          window.parent.document.getElementById("loginIframe").src = "";
        }
      } catch (err) {
        errorMsg.style.display = "block";
        errorMsg.textContent = "Signup failed: " + err.message;
      }
    });
  
    toggleToLogin.addEventListener("click", function (e) {
      e.preventDefault();
      // Clear fields if desired
      emailInput.value = "";
      passwordInput.value = "";
      confirmPasswordInput.value = "";
      // Switch the current iframe to load login.html
      window.location.href = "login.html";
    });
  });
  