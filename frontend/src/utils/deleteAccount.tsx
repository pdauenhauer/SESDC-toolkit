import { auth, db, storage } from "./firebase/firebase-init";
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';

export async function deleteAccount(password: string) {
  const user = auth.currentUser;
  if (!user) return "No authenticated user.";

  try {
    // 1. Reauthenticate using password
    const credential = EmailAuthProvider.credential(user.email!, password);
    await reauthenticateWithCredential(user, credential);

    // 2. Delete Firestore user document
    await deleteDoc(doc(db, "users", user.uid));

    // 3. Delete the user's entire storage folder
    const folderRef = ref(storage, user.uid);
    const items = await listAll(folderRef);

    for (const item of items.items) {
      await deleteObject(item);
    }

    // 4. Delete the auth user
    await deleteUser(user);

    // 5. Clear local cache
    localStorage.removeItem("loggedInUserId");

    return "Account deleted successfully.";
  } catch (error: any) {
    return error.message;
  }
}
