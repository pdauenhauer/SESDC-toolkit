import '../css/contact.css'; 

function Contact() {
  return (
    <div class="contact-page">
      <div class="contact-container">
        <h1 class="contact-title">Contact Us</h1>
        <p class="contact-info">
          Please fill out the form below:
          <br />
        </p>
      </div>

      <main class="content-wrapper">
        <div class="contact-page-container">
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

            <label htmlFor="name">
              Name <span class="contact-required" aria-hidden="true">*</span>
            </label>
            <input class="input" id="name" type="text" name="name" required />

            <label htmlFor="email">
              Email <span class="contact-required" aria-hidden="true">*</span>
            </label>
            <input
              class="input"
              id="email"
              type="email"
              name="email"
              required
            />

            <label htmlFor="message">
              Message <span class="contact-required" aria-hidden="true">*</span>
            </label>
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
    </div>
  );
}

export default Contact;
