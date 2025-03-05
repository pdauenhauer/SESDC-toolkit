document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("modal");
  const loginIframe = document.getElementById("loginIframe");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const modalClose = document.getElementById("modal-close");

  console.log("Elements loaded:", { modal, loginIframe, loginBtn, signupBtn, modalClose });

  if (loginBtn) {
    loginBtn.addEventListener("click", function () {
      console.log("Login button clicked");
      loginIframe.src = "login.html";
      modal.classList.add("active");
    });
  } else {
    console.log("loginBtn not found");
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", function () {
      console.log("Signup button clicked");
      loginIframe.src = "signup.html";
      modal.classList.add("active");
    });
  } else {
    console.log("signupBtn not found");
  }

  if (modalClose) {
    modalClose.addEventListener("click", function () {
      console.log("Modal close clicked");
      modal.classList.remove("active");
      loginIframe.src = "";
    });
  } else {
    console.log("modalClose not found");
  }
});

