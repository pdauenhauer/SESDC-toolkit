// src/pages/Account.tsx
import { useState } from 'preact/hooks';
import '../css/account.css';

export default function Account() {
  // whether each section is open
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState('');

  function toggleUpdatePassword() {
    setShowUpdatePassword((prev) => !prev);
    // hide other section when opening this one, if you want
    setShowDeleteConfirm(false);
    setMessage('');
  }

  function toggleDelete() {
    setShowDeleteConfirm((prev) => !prev);
    setShowUpdatePassword(false);
    setMessage('');
  }

  function handleConfirmPasswordUpdate() {
    // TODO: call your real API here
    setMessage('Password updated (demo).');
    setShowUpdatePassword(false);
  }

  function handleCancelPasswordUpdate() {
    setShowUpdatePassword(false);
  }

  function handleConfirmDelete() {
    // TODO: call your real API here
    setMessage('Account deleted (demo).');
    setShowDeleteConfirm(false);
  }

  function handleCancelDelete() {
    setShowDeleteConfirm(false);
  }

  return (
    <>
      {/* navbar */}
      <nav>
        <input type="checkbox" id="check" />
        <label htmlFor="check" class="check-btn">
          <i class="bx bx-menu"></i>
        </label>

        <div class="nav-left">
          <img src="/media/Logo-white.svg" alt="Logo" class="nav-logo" />
          <label class="logo-nav">Microgrid Toolkit</label>
        </div>

        <ul id="navbar">{/* add links or reuse Navbar component here */}</ul>
      </nav>

      <div class="main-content">
        <div class="wrapper">
          <div id="accountManagement" class="form-container visible">
            <h1>Account Management</h1>

            {message && (
              <div
                id="account-management-message"
                class="messageDiv"
                style="display: block;"
              >
                {message}
              </div>
            )}

            <div class="button-group">
              {/* UPDATE PASSWORD */}
              <button
                id="updatePasswordBtn"
                class="btn secondary-btn"
                onClick={toggleUpdatePassword}
                type="button"
              >
                {showUpdatePassword ? 'Hide Password Form' : 'Update Password'}
              </button>

              {showUpdatePassword && (
                <div id="updatePasswordSection">
                  <div class="input-box">
                    <input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  <div class="confirmation-buttons">
                    <button
                      id="confirmUpdatePasswordBtn"
                      class="btn secondary-btn"
                      type="button"
                      onClick={handleConfirmPasswordUpdate}
                    >
                      Confirm Update
                    </button>
                    <button
                      id="cancelUpdatePasswordBtn"
                      class="btn secondary-btn"
                      type="button"
                      onClick={handleCancelPasswordUpdate}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* DELETE ACCOUNT */}
              <button
                id="deleteAccountBtn"
                class="btn danger-btn"
                type="button"
                onClick={toggleDelete}
              >
                {showDeleteConfirm ? 'Hide Delete Form' : 'Delete Account'}
              </button>
            </div>

            {showDeleteConfirm && (
              <div id="deleteConfirmation">
                <p>
                  Are you sure you want to delete your account? This action cannot be undone.
                </p>
                <div class="input-box">
                  <input
                    id="deletePassword"
                    type="password"
                    placeholder="Enter your password to confirm"
                    required
                  />
                  <i class="bx bxs-lock-alt"></i>
                </div>
                <div class="confirmation-buttons">
                  <button
                    id="confirmDeleteBtn"
                    class="btn danger-btn"
                    type="button"
                    onClick={handleConfirmDelete}
                  >
                    Confirm Delete
                  </button>
                  <button
                    id="cancelDeleteBtn"
                    class="btn secondary-btn"
                    type="button"
                    onClick={handleCancelDelete}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer class="footer">
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
