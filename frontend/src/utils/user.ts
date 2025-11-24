import { auth } from "./firebase/firebase-init";
import { updatePassword, signOut } from "firebase/auth";

export async function updateUserPassword(newPassword: string) {
    const user = auth.currentUser;

    if (!user) {
        return "You must be logged in to update your password.";
    }

    try {
        await updatePassword(user, newPassword);
        return "Password updated successfully.";
    } catch (err: any) {
        return err.message ?? "Failed to update password.";
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.removeItem("loggedInUserId");
        return "Logged out.";
    } catch (err: any) {
        return err.message ?? "Failed to log out.";
    }
}
