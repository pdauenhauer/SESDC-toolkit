import { auth, db, storage } from "./firebase/firebase-init";
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";

export async function deleteAccount(password: string): Promise<string> {
    const user = auth.currentUser;

    if (!user) return "No user logged in.";

    try {
        // 1. Reauthenticate
        const credential = EmailAuthProvider.credential(user.email!, password);
        await reauthenticateWithCredential(user, credential);

        // 2. Delete Firestore user doc
        await deleteDoc(doc(db, "users", user.uid));

        // 3. Delete Storage folder
        const userFolderRef = ref(storage, `${user.uid}/`);

        const folderList = await listAll(userFolderRef);
        const deletions = folderList.items.map((fileRef) => deleteObject(fileRef));
        await Promise.allSettled(deletions);

        // 4. Delete Authentication user
        await deleteUser(user);

        return "Account deleted successfully.";
    } catch (err: any) {
        return err.message ?? "Failed to delete account.";
    }
}
