import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';

import { useEffect, useState } from 'preact/hooks';
import "../css/account.css";

import { deleteAccount } from "../utils/deleteAccount";
import {
    updateUserPassword,
    logoutUser,
    getCurrentUserId,
    getUserProfile,
    updateUserMetadata,
    getUserStats,
    UserProfile,
    UserMetadata,
    UserStats
} from "../utils/user";


export default function Account() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [metadata, setMetadata] = useState<UserMetadata | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingMetadata, setSavingMetadata] = useState(false);

    const [showUpdatePassword, setShowUpdatePassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const uid = getCurrentUserId();
        if (!uid) {
            setMessage("You must be logged in to view your account.");
            setLoading(false);
            return;
        }

        (async () => {
            try {
            const [profileData, statsData] = await Promise.all([
                getUserProfile(uid),
                getUserStats(uid),
            ]);

            if (profileData) {
                setProfile(profileData);
                setMetadata(profileData.metadata);
            }
            setStats(statsData);
            } catch (err) {
            console.error(err);
            setMessage("Failed to load account information.");
            } finally {
            setLoading(false);
            }
        })();
    }, []);

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

    function handleMetadataChange<K extends keyof UserMetadata>(
        key: K,
        value: UserMetadata[K]
    ) {
    if (!metadata) return;
    setMetadata({ ...metadata, [key]: value });
    }

    async function handleSaveMetadata() {
    const uid = getCurrentUserId();
    if (!uid || !metadata) return;

    try {
        setSavingMetadata(true);
        await updateUserMetadata(uid, metadata);
        setMessage("Account preferences updated.");
    } catch (err) {
        console.error(err);
        setMessage("Failed to update preferences.");
    } finally {
        setSavingMetadata(false);
    }
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
                        
                        {loading ? (
                            <p>Loading account information...</p>
                        ) : (
                        <>
                        
                        {profile && (
                            <section class="account-section">
                            <h2>Profile Details</h2>
                            <p><strong>Name:</strong> {profile.displayName ?? "N/A"}</p>
                            <p><strong>Email:</strong> {profile.email ?? "N/A"}</p>
                            </section>
                        )}

                        {metadata && (
                            <section class="account-section">
                            <h2>Account Preferences</h2>

                            <label class="toggle-row">
                                <span>Email updates</span>
                                <input
                                type="checkbox"
                                checked={metadata.emailUpdates}
                                onChange={(e) =>
                                    handleMetadataChange(
                                    "emailUpdates",
                                    (e.currentTarget as HTMLInputElement).checked
                                    )
                                }
                                />
                            </label>

                            <button
                                class="btn primary-btn"
                                type="button"
                                onClick={handleSaveMetadata}
                                disabled={savingMetadata}
                            >
                                {savingMetadata ? "Saving..." : "Save Preferences"}
                            </button>
                            </section>
                        )}

                        {stats && (
                            <section class="account-section">
                            <h2>Insights &amp; Analytics</h2>
                            <p><strong>Projects owned:</strong> {stats.projectCount}</p>
                            </section>
                        )}
                        </>
                    )}



                        <div class="button-group">
                            <button class="btn secondary-btn" type="button" onClick={toggleUpdatePassword}>
                                {showUpdatePassword ? 'Hide Password Form' : 'Update Password'}
                            </button>

                            {showUpdatePassword && (
                                <div id="updatePasswordSection">
                                    <div class="input-box">
                                        <input id="newPassword" type="password" placeholder="Enter new password" required />
                                    </div>
                                    <div class="confirmation-buttons">
                                        <button class="btn secondary-btn" type="button" onClick={handleConfirmPasswordUpdate}>
                                            Confirm Update
                                        </button>
                                        <button class="btn secondary-btn" type="button" onClick={handleCancelPasswordUpdate}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button class="btn danger-btn" type="button" onClick={toggleDelete}>
                                {showDeleteConfirm ? 'Hide Delete Form' : 'Delete Account'}
                            </button>

                            <button class="btn primary-btn" type="button" onClick={handleGoToLogin}>
                                Go to Login
                            </button>
                        </div>

                        {showDeleteConfirm && (
                            <div id="deleteConfirmation">
                                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                                <div class="input-box">
                                    <input id="deletePassword" type="password" placeholder="Enter your password to confirm" required />
                                </div>
                                <div class="confirmation-buttons">
                                    <button class="btn danger-btn" type="button" onClick={handleConfirmDelete}>
                                        Confirm Delete
                                    </button>
                                    <button class="btn secondary-btn" type="button" onClick={handleCancelDelete}>
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
