import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';
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
      <SESDCHeader />

      <div class="account-main-content">
        <div class="account-wrapper">
          <div id="accountManagement" class="account-form-container visible">
            <h1 class="account-heading">Account Management</h1>

            {message && (
              <div
                id="account-management-message"
                class="account-messageDiv"
                style="display: block;"
              >
                {message}
              </div>
            )}

            <div class="account-button-group">
              {/* UPDATE PASSWORD */}
              <button
                id="updatePasswordBtn"
                class="account-btn account-secondary-btn"
                onClick={toggleUpdatePassword}
                type="button"
              >
                {showUpdatePassword ? 'Hide Password Form' : 'Update Password'}
              </button>

              {showUpdatePassword && (
                <div id="account-updatePasswordSection">
                  <div class="account-input-box">
                    <input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  <div class="account-confirmation-buttons">
                    <button
                      id="confirmUpdatePasswordBtn"
                      class="account-btn account-secondary-btn"
                      type="button"
                      onClick={handleConfirmPasswordUpdate}
                    >
                      Confirm Update
                    </button>
                    <button
                      id="cancelUpdatePasswordBtn"
                      class="account-btn account-secondary-btn"
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
                class="account-btn account-danger-btn"
                type="button"
                onClick={toggleDelete}
              >
                {showDeleteConfirm ? 'Hide Delete Form' : 'Delete Account'}
              </button>
            </div>

            {showDeleteConfirm && (
              <div id="account-deleteConfirmation">
                <p>
                  Are you sure you want to delete your account? This action cannot be undone.
                </p>
                <div class="account-input-box">
                  <input
                    id="deletePassword"
                    type="password"
                    placeholder="Enter your password to confirm"
                    required
                  />
                  <i class="bx bxs-lock-alt"></i>
                </div>
                <div class="account-confirmation-buttons">
                  <button
                    id="confirmDeleteBtn"
                    class="account-btn account-danger-btn"
                    type="button"
                    onClick={handleConfirmDelete}
                  >
                    Confirm Delete
                  </button>
                  <button
                    id="cancelDeleteBtn"
                    class="account-btn account-secondary-btn"
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

      <SESDCFooter />

    </>
  );
}
