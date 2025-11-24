import { auth, db } from "./firebase/firebase-init";
import { updatePassword, signOut } from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";


export interface UserMetadata {
    emailUpdates: boolean;

}

export interface UserProfile {
    uid : string;
    displayName: string | null;
    email: string | null;
    metadata: UserMetadata;
}

export interface UserStats {
    projectCount: number;
}

export function getCurrentUserId(): string | null{
    return auth.currentUser?.uid ?? null;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, "users", uid);
  const snap = await getDoc(userDocRef);

  const defaultMetadata: UserMetadata = {
    emailUpdates: true,
  };


  if (!snap.exists()) {
    const profile: UserProfile = {
      uid,
      displayName: auth.currentUser?.displayName ?? null,
      email: auth.currentUser?.email ?? null,
      metadata: defaultMetadata,
    };

    await setDoc(userDocRef, profile, { merge: true });
    return profile;
  }

  const data = snap.data() as any;

  const profile: UserProfile = {
    uid,
    displayName: data.displayName ?? auth.currentUser?.displayName ?? null,
    email: data.email ?? auth.currentUser?.email ?? null,
    metadata: {
      emailUpdates: data.metadata?.emailUpdates ?? defaultMetadata.emailUpdates,
    },
  };

  return profile;
}

export async function updateUserMetadata(
  uid: string,
  updates: Partial<UserMetadata>
): Promise<void> {
  const userDocRef = doc(db, "users", uid);

  const payload: any = {};
  if (updates.emailUpdates !== undefined) {
    payload["metadata.emailUpdates"] = updates.emailUpdates;
  }

  await updateDoc(userDocRef, payload);
}

export async function getUserStats(uid: string): Promise<UserStats> {
  const projectsRef = collection(db, "projects");
  const q = query(projectsRef, where("ownerId", "==", uid));
  const snap = await getDocs(q);

  return { projectCount: snap.size };
}

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
