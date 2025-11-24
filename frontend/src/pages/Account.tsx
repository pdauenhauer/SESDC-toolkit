import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';
import { useState } from 'preact/hooks';
import '../css/account.css';

import { deleteAccount } from "../utils/deleteAccount";
import { updateUserPassword, logoutUser } from "../utils/user";

export default function Account() {

    const [showUpdatePassword, setShowUpdatePassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [message, setMessage] = useState('');

    function toggleUpdatePassword() {
        setShowUpdatePassword(prev => !prev);
        setShowDeleteConfirm(false);
        setMessage('');
    }

    function toggleDelete() {
        setShowDeleteConfirm(prev => !prev);
        setShowUpdatePassword(false);
        setMessage('');
    }

    async function handleConfirmPasswordUpdate() {
        const passwordInput = document.getElementById('newPassword') as HTMLInputElement;
        const newPassword = passwordInput.value;

        const response = await updateUserPassword(newPassword);
        setMessage(response);

        if (response === "Password updated successfully.") {
            setShowUpdatePassword(false);
            passwordInput.value = "";
        }
    }

    function handleCancelPasswordUpdate() {
        setShowUpdatePassword(false);
    }

    async function handleConfirmDelete() {
        const passwordInput = document.getElementById('deletePassword') as HTMLInputElement;
        const password = passwordInput.value;

        const result = await deleteAccount(password);
        setMessage(result);

        if (result === "Account deleted successfully.") {
            setTimeout(async () => {
                await logoutUser();
                window.location.href = "/login";
            }, 2000);
        }
    }

    function handleCancelDelete() {
        setShowDeleteConfirm(false);
    }

    async function handleGoToLogin() {
        await logoutUser();
        window.location.href = "/login";
    }

    return (
        <>
            <SESDCHeader />

            <div class="account-main-content">
                <div class="account-wrapper">
                    <div id="accountManagement" class="account-form-container visible">
                        <h1 class="account-heading">Account Management</h1>

                        {message && (
                            <div id="account-management-message" class="account-messageDiv" style="display: block;">
                                {message}
                            </div>
                        )}

                        <div class="account-button-group">
                            <button id="updatePasswordBtn" class="account-btn account-secondary-btn" type="button" onClick={toggleUpdatePassword}>
                                {showUpdatePassword ? 'Hide Password Form' : 'Update Password'}
                            </button>

                            {showUpdatePassword && (
                                <div id="account-updatePasswordSection">
                                    <div class="account-input-box">
                                        <input id="newPassword" type="password" placeholder="Enter new password" required />
                                    </div>
                                    <div class="account-confirmation-buttons">
                                        <button id="confirmUpdatePasswordBtn" class="account-btn account-secondary-btn" type="button" onClick={handleConfirmPasswordUpdate}>
                                            Confirm Update
                                        </button>
                                        <button id="cancelUpdatePasswordBtn" class="account-btn account-secondary-btn" type="button" onClick={handleCancelPasswordUpdate}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button id="deleteAccountBtn" class="account-btn account-danger-btn" type="button" onClick={toggleDelete}>
                                {showDeleteConfirm ? 'Hide Delete Form' : 'Delete Account'}
                            </button>

                            <button id="goToLoginBtn" class="account-btn account-primary-btn" type="button" onClick={handleGoToLogin}>
                                Go to Login
                            </button>
                        </div>

                        {showDeleteConfirm && (
                            <div id="account-deleteConfirmation">
                                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                                <div class="account-input-box">
                                    <input id="deletePassword" type="password" placeholder="Enter your password to confirm" required />
                                </div>
                                <div class="account-confirmation-buttons">
                                    <button id="confirmDeleteBtn" class="account-btn account-danger-btn" type="button" onClick={handleConfirmDelete}>
                                        Confirm Delete
                                    </button>
                                    <button id="cancelDeleteBtn" class="account-btn account-secondary-btn" type="button" onClick={handleCancelDelete}>
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