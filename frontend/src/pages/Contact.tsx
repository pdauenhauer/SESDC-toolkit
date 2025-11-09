import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';

import '../css/contact.css'; // adjust path to where your css actually is

function Contact() {
  return (
    <>
      <SESDCHeader />

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

     <SESDCFooter />
    </>
  );
}

export default Contact;
