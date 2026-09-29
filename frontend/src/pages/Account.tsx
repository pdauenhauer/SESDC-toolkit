import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../utils/firebase/firebase-init";
import { deleteAccount } from "../utils/firebase/auth";
import { getUserProfile, getUserStats, logoutUser, updateUserMetadata, updateUserPassword } from "../utils/user";
import { AccountView, type AccountProfile } from "../components/account/AccountView";
import { Button, useToast } from "../components/ui";

const TOAST_MS = 3000;

/** Turn Firebase's "Firebase: Error (auth/…)" strings into something readable. */
function friendlyAuthError(message: string): string {
  if (/requires-recent-login/.test(message)) return "For security, sign out and sign back in, then try again.";
  if (/wrong-password|invalid-credential|invalid-login-credentials/.test(message)) return "That password is incorrect.";
  if (/too-many-requests/.test(message)) return "Too many attempts. Try again in a few minutes.";
  if (/weak-password/.test(message)) return "Choose a stronger password.";
  if (/network-request-failed/.test(message)) return "Network error. Check your connection and try again.";
  return message.replace(/^Firebase:\s*/, "");
}

export default function Account() {
  const { route } = useLocation();
  const flash = useToast();
  const toast = (msg: string, tone: "success" | "error" = "success") => flash(msg, TOAST_MS, tone);

  const [status, setStatus] = useState<"loading" | "signed-out" | "ready">("loading");
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [emailUpdates, setEmailUpdates] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("signed-out");
        setUid(null);
        return;
      }
      setUid(user.uid);
      // Show what Auth already knows immediately; Firestore fills in the rest.
      setProfile({ displayName: user.displayName, email: user.email });
      setStatus("ready");
      try {
        const data = await getUserProfile(user.uid);
        if (data) {
          setProfile({ displayName: data.displayName, email: data.email });
          setEmailUpdates(data.metadata.emailUpdates);
        }
      } catch (err) {
        console.error(err);
        toast("Failed to load account information.", "error");
      }
      try {
        setProjectCount((await getUserStats(user.uid)).projectCount);
      } catch (err) {
        console.warn("Failed to load account project stats:", err);
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleEmail = async (next: boolean) => {
    if (!uid) return;
    setEmailUpdates(next); // saves immediately; roll back if the write fails
    try {
      await updateUserMetadata(uid, { emailUpdates: next });
      toast(next ? "Email updates turned on" : "Email updates turned off");
    } catch (err) {
      console.error(err);
      setEmailUpdates(!next);
      toast("Couldn't save your preference. Try again.", "error");
    }
  };

  const updatePassword = async (password: string) => {
    const result = await updateUserPassword(password);
    const ok = result === "Password updated successfully.";
    toast(ok ? result : friendlyAuthError(result), ok ? "success" : "error");
    return ok;
  };

  const removeAccount = async (password: string) => {
    const result = await deleteAccount(password);
    const ok = result === "Account deleted successfully.";
    toast(ok ? result : friendlyAuthError(result), ok ? "success" : "error");
    if (ok) {
      window.setTimeout(async () => {
        await logoutUser();
        route("/");
      }, 1500);
    }
    return ok;
  };

  const signOut = async () => {
    await logoutUser();
    route("/");
  };

  const state =
    status === "loading" ? (
      <div class="mg-state mg-state--loading">Loading account…</div>
    ) : status === "signed-out" ? (
      <div class="mg-card mg-state">
        <div class="mg-state__title">Sign in to manage your account</div>
        <Button variant="primary" size="sm" onClick={() => route("/")}>
          Go to sign in
        </Button>
      </div>
    ) : undefined;

  return (
    <AccountView
      profile={profile}
      projectCount={projectCount}
      emailUpdates={emailUpdates}
      onToggleEmail={toggleEmail}
      onUpdatePassword={updatePassword}
      onDeleteAccount={removeAccount}
      onSignOut={signOut}
      onBack={() => route("/projects")}
      onHelp={() => route("/guide")}
      state={state}
    />
  );
}
