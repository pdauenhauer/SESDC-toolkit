import '../css/contact.css'; // adjust path to where your css actually is

function Contact() {
  return (
    <>
      <nav>
        <input type="checkbox" id="check" />
        <label htmlFor="check" class="check-btn">
          <i class="bx bx-menu"></i>
        </label>

        <div class="nav-left">
          <img src="/media/Logo-white.svg" alt="Logo" class="nav-logo" />
          <label class="logo-nav">Microgrid Toolkit</label>
        </div>

        <ul id="SESDCHeader">
          {/* if your old navbar.js populated this, you can hardcode links here later */}
        </ul>
      </nav>

      <div class="contact-container">
        <h1 class="contact-title">Contact Us</h1>
        <p class="contact-info">
          Please fill out the form below:
          <br />
        </p>
      </div>

      <main class="content-wrapper">
        <div class="page-container">
          <form
            action="https://api.web3forms.com/submit"
            method="POST"
            class="contact-form"
          >
            <input
              class="input"
              type="hidden"
              name="access_key"
              value="b577f2c5-cd3f-4e78-8641-fc14d0f4f76e"
            />

            <label htmlFor="name">Name:</label>
            <input class="input" id="name" type="text" name="name" required />

            <label htmlFor="email">Email:</label>
            <input
              class="input"
              id="email"
              type="email"
              name="email"
              required
            />

            <label htmlFor="message">Message:</label>
            <textarea
              class="textarea"
              id="message"
              name="message"
              rows={2}
              required
            ></textarea>

            <button class="contact-submit-btn" id="button" type="submit">
              Submit
            </button>
          </form>
        </div>
      </main>

      <footer class="SESDCFooter">
        <div class="social-icons">
          <a
            href="https://www.facebook.com/KilowattsforHumanity/"
            target="_blank"
            rel="noreferrer"
          >
            <i class="bx bxl-facebook"></i>
          </a>
          <a
            href="https://www.instagram.com/kilowattsforhumanity/"
            target="_blank"
            rel="noreferrer"
          >
            <i class="bx bxl-instagram"></i>
          </a>
          <a
            href="https://www.linkedin.com/company/kilowatts-for-humanity/posts/?feedView=all"
            target="_blank"
            rel="noreferrer"
          >
            <i class="bx bxl-linkedin"></i>
          </a>
          <a
            href="https://github.com/pdauenhauer/SESDC-toolkit"
            target="_blank"
            rel="noreferrer"
          >
            <i class="bx bxl-github"></i>
          </a>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2025 SESDC. All rights reserved</p>
        </div>
      </footer>
    </>
  );
}

export default Contact;
