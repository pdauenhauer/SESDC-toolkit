import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';

import { useState } from 'preact/hooks';
import { deleteAccount } from '../utils/deleteAccount';
import { auth } from '../utils/firebase/firebase-init';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

import '../css/account.css';

export default function Account() {
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState('');

  function toggleUpdatePassword() {
    setShowUpdatePassword((prev) => !prev);
    setShowDeleteConfirm(false);
    setMessage('');
  }

  function toggleDelete() {
    setShowDeleteConfirm((prev) => !prev);
    setShowUpdatePassword(false);
    setMessage('');
  }

  // update password 
  async function handleConfirmPasswordUpdate() {
    const newPasswordInput = document.getElementById('newPassword') as HTMLInputElement;
    const newPassword = newPasswordInput.value;

    if (!newPassword) {
      setMessage("Please enter a new password.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        setMessage("No authenticated user.");
        return;
      }

      // Optionally reauth with old password (Firebase now requires reauth for this)
      // For now, just update:
      await updatePassword(user, newPassword);

      setMessage("Password updated successfully.");
      setShowUpdatePassword(false);
    } catch (error: any) {
      setMessage("Error updating password: " + error.message);
    }
  }

  function handleCancelPasswordUpdate() {
    setShowUpdatePassword(false);
  }

  //delete account
  async function handleConfirmDelete() {
    const passwordInput = document.getElementById('deletePassword') as HTMLInputElement;
    const password = passwordInput.value;

    if (!password) {
      setMessage("Please enter your password.");
      return;
    }

    const result = await deleteAccount(password);
    setMessage(result);

    if (result === "Account deleted successfully.") {
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
  }

  function handleCancelDelete() {
    setShowDeleteConfirm(false);
  }

  // logout for “Go to Login”
  async function handleLogoutAndGoToLogin() {
    await auth.signOut();
    localStorage.removeItem("loggedInUserId");
    window.location.href = "/login";
  }

  return (
    <>
      <SESDCHeader />

      <div class="main-content">
        <div class="wrapper">
          <div id="accountManagement" class="form-container visible">
            <h1>Account Management</h1>

            {message && (
              <div class="messageDiv" style="display: block;">
                {message}
              </div>
            )}

            <div class="button-group">
              {/* UPDATE PASSWORD */}
              <button
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
                      class="btn secondary-btn"
                      type="button"
                      onClick={handleConfirmPasswordUpdate}
                    >
                      Confirm Update
                    </button>
                    <button
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
                class="btn danger-btn"
                type="button"
                onClick={toggleDelete}
              >
                {showDeleteConfirm ? 'Hide Delete Form' : 'Delete Account'}
              </button>

              <button
                class="btn primary-btn"
                type="button"
                onClick={handleLogoutAndGoToLogin}
              >
                Go to Login
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
                </div>
                <div class="confirmation-buttons">
                  <button
                    class="btn danger-btn"
                    type="button"
                    onClick={handleConfirmDelete}
                  >
                    Confirm Delete
                  </button>
                  <button
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

      <SESDCFooter />
    </>
  );
}
