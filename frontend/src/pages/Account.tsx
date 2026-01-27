import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';

import { useEffect, useState } from 'preact/hooks';
import "../css/account.css";

import placeholder_user from '../media/placeholder_user.png';
import { deleteAccount } from "../utils/firebase/auth";
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
  
      <main class="account-page">
        {/* HERO */}
        <section class="account-hero">
          <div class="account-hero-content">
            <h1>Account Management</h1>
            <p>Manage your account and preferences.</p>
          </div>
        </section>
  
        {/* CONTENT */}
        <section class="account-layout">
          {/* PROFILE CARD */}
          <aside class="account-profile-card">
            <div class="account-profile-row">
              <div class="account-avatar">
                <img src={placeholder_user} class="account-avatar" alt="User Avatar" />
              </div>
              <div>
                <div class="account-name">{profile?.displayName ?? "User"}</div>
                <div class="account-email">{profile?.email}</div>
              </div>
            </div>
          </aside>
  
          {/* MAIN PANEL */}
          <div class="account-panel">
            <h2>Account Management</h2>
  
            {message && (
              <div class="account-messageDiv">{message}</div>
            )}
  
            {loading ? (
              <p>Loading account information...</p>
            ) : (
              <>
                {profile && (
                  <section class="account-section">
                    <h3>Profile Details</h3>
                    <p><strong>Name:</strong> {profile.displayName ?? "N/A"}</p>
                    <p><strong>Email:</strong> {profile.email ?? "N/A"}</p>
                  </section>
                )}
  
                {metadata && (
                  <section class="account-section">
                    <h3>Account Preferences</h3>
  
                    <label class="account-toggle-row">
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
                      class="account-primary-btn"
                      onClick={handleSaveMetadata}
                      disabled={savingMetadata}
                    >
                      {savingMetadata ? "Saving..." : "Save Preferences"}
                    </button>
                  </section>
                )}
  
                {stats && (
                  <section class="account-section">
                    <h3>Insights & Analytics</h3>
                    <p><strong>Projects owned:</strong> {stats.projectCount}</p>
                  </section>
                )}
              </>
            )}
  
            {/* ACTIONS */}
            <div class="account-actions">
                {!showUpdatePassword && (
                    <button
                        class="account-secondary-btn"
                        onClick={toggleUpdatePassword}
                    >
                        Update Password
                    </button>
                )}
              {showUpdatePassword && (
                <div class="account-inline-form">
                  <input id="newPassword" type="password" placeholder="New password" />
                  <div class="account-inline-actions">
                    <button class="account-secondary-btn" onClick={handleConfirmPasswordUpdate}>
                      Confirm
                    </button>
                    <button class="account-secondary-btn" onClick={handleCancelPasswordUpdate}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
  
              <button class="account-danger-btn" onClick={toggleDelete}>
                {showDeleteConfirm ? "Hide Delete Form" : "Delete Account"}
              </button>
  
              <button class="account-primary-btn" onClick={handleGoToLogin}>
                Sign Out
              </button>
            </div>
  
            {showDeleteConfirm && (
              <div class="account-delete-box">
                <p>This action cannot be undone.</p>
                <input id="deletePassword" type="password" placeholder="Confirm password" />
                <div class="account-inline-actions">
                  <button class="account-danger-btn" onClick={handleConfirmDelete}>
                    Confirm Delete
                  </button>
                  <button class="account-secondary-btn" onClick={handleCancelDelete}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
  
      <SESDCFooter />
    </>
  );  
}