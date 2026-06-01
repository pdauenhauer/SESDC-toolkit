import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { onAuthStateChanged } from "firebase/auth";
import "../css/account.css";
import { auth } from "../utils/firebase/firebase-init";
import keyRoundIcon from "../media/key-round.svg";
import trashDefaultIcon from "../media/trash-2-3.svg";
import trashHoverIcon from "../media/trash-2-4.svg";
import bellIcon from "../media/bell.svg";
import mailIcon from "../media/mail.svg";
import user2Icon from "../media/user-2.svg";
import briefcaseIcon from "../media/briefcase-business.svg";
import chevronDownIcon from "../media/chevron-down.svg";
import chevronUpIcon from "../media/chevron-up.svg";
import signOutIcon from "../media/log-out.svg";

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
    const { route } = useLocation();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [metadata, setMetadata] = useState<UserMetadata | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingMetadata, setSavingMetadata] = useState(false);

    const [showUpdatePassword, setShowUpdatePassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const loadAccount = async (uid: string) => {
            try {
                const profileData = await getUserProfile(uid);
                if (profileData) {
                    setProfile(profileData);
                    setMetadata(profileData.metadata);
                }
            } catch (err) {
                console.error(err);
                setMessage("Failed to load account information.");
            }

            try {
                const statsData = await getUserStats(uid);
                setStats(statsData);
            } catch (err) {
                console.warn("Failed to load account project stats:", err);
                setStats({ projectCount: 0 });
            } finally {
                setLoading(false);
            }
        };

        const uid = getCurrentUserId();
        if (uid) {
            loadAccount(uid);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (!user) {
                setMessage("You must be logged in to view your account.");
                setLoading(false);
                return;
            }
            loadAccount(user.uid);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => setMessage(''), 3000);
        return () => clearTimeout(timer);
    }, [message]);

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
                route("/");
            }, 2000);
        }
    }

    function handleCancelDelete() {
        setShowDeleteConfirm(false);
    }

    async function handleGoToLogin() {
        await logoutUser();
        route("/");
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
        setMessage("Account preferences updated");
    } catch (err) {
        console.error(err);
        setMessage("Failed to update preferences.");
    } finally {
        setSavingMetadata(false);
    }
}


return (
    <div class="account-page-shell">
      <main class="account-page">
        <section class="account-panel">
          <header class="account-panel-header">
            <h1>Account Management</h1>
            <p>Manage your account and preferences</p>
          </header>
            {loading ? (
              <p>Loading account information...</p>
            ) : (
              <>
                {profile && (
                  <section class="account-section">
                    <h3>Profile Details</h3>
                    <p class="account-field-row">
                      <strong class="account-label-with-icon">
                        <img src={user2Icon} alt="" class="account-inline-icon" />
                        Username:
                      </strong>{" "}
                      <span class="account-name-value">{profile.displayName ?? "N/A"}</span>
                    </p>
                    <p class="account-field-row">
                      <strong class="account-label-with-icon">
                        <img src={mailIcon} alt="" class="account-inline-icon" />
                        Email:
                      </strong>{" "}
                      <span class="account-email-value">{profile.email ?? "N/A"}</span>
                    </p>
                    <button
                      type="button"
                      class="account-profile-action account-label-with-icon"
                      onClick={toggleUpdatePassword}
                      aria-expanded={showUpdatePassword}
                    >
                      <img src={keyRoundIcon} alt="" class="account-inline-icon" />
                      Password
                      <img
                        src={showUpdatePassword ? chevronUpIcon : chevronDownIcon}
                        alt=""
                        class="account-profile-chevron"
                      />
                    </button>
                    {showUpdatePassword && (
                      <div class="account-inline-form account-inline-form--profile">
                        <input id="newPassword" type="password" placeholder="New password" />
                        <div class="account-inline-actions">
                          <button class="account-signout-btn account-inline-action-btn" onClick={handleConfirmPasswordUpdate}>
                            Confirm
                          </button>
                          <button class="account-signout-btn account-inline-action-btn" onClick={handleCancelPasswordUpdate}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                )}
  
                {metadata && (
                  <section class="account-section">
                    <h3>Account Preferences</h3>
  
                    <label class="account-toggle-row">
                      <span class="account-toggle-label">
                        <img src={bellIcon} alt="" class="account-inline-icon" />
                        Email updates
                      </span>
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
                      class="account-signout-btn account-preferences-save-btn"
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
                    <p class="account-field-row">
                      <strong class="account-label-with-icon">
                        <img src={briefcaseIcon} alt="" class="account-inline-icon" />
                        Projects owned:
                      </strong>
                      <span class="account-projects-owned-value">{Math.max(0, stats.projectCount - 1)}</span>
                    </p>
                  </section>
                )}
              </>
            )}
  
            {/* ACTIONS */}
            <div class="account-actions">
              <button class="account-danger-btn account-btn-with-icon account-delete-toggle-btn" onClick={toggleDelete}>
                <img src={trashDefaultIcon} alt="" class="account-btn-icon account-delete-icon-default" />
                <img src={trashHoverIcon} alt="" class="account-btn-icon account-delete-icon-hover" />
                <span>{showDeleteConfirm ? "Hide Delete Form" : "Delete Account"}</span>
              </button>
  
              <button class="account-signout-btn account-btn-with-icon" onClick={handleGoToLogin}>
                <img src={signOutIcon} alt="" class="account-btn-icon" />
                <span>Sign Out</span>
              </button>
            </div>
  
            {showDeleteConfirm && (
              <div class="account-delete-box">
                <p>This action cannot be undone.</p>
                <input id="deletePassword" type="password" placeholder="Confirm password" />
                <div class="account-inline-actions">
                  <button class="account-signout-btn account-inline-action-btn" onClick={handleConfirmDelete}>
                    Confirm Delete
                  </button>
                  <button class="account-signout-btn account-inline-action-btn" onClick={handleCancelDelete}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div class="account-messageDiv">{message}</div>
            )}
        </section>
      </main>
    </div>
  );
}
