import { auth, db } from './firebase-init.ts';
import { createFolder } from './storage.ts';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    EmailAuthProvider,
    reauthenticateWithCredential,
    deleteUser
} from 'firebase/auth';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';

export async function registerUser(email: string, password: string, username: string) {
    try {
        // 1. Create user object
        // If user exists, should throw 'auth/email-already-exists'
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const user = credentials.user;

        // 2. Set user data and save initial 
        await setDoc(doc(db, "users", user.uid), {
            username,
            email,
            numprojects: 0,
            projectids: [],
            createdAt: new Date().toISOString(),
        });

        // 3. Create a folder for the user with the user's unique id
        await createFolder(user.uid);

        // 4. Send an email verification to the user
        await sendEmailVerification(user);

        // 5. Sign out after data is saved
        await auth.signOut();
        return `Registration Complete! Last step: check your email (${email}) for a verification link.`;
    } catch (error: any) {
        return errorHandling(error);
    }
}


export async function loginUser(email: string, password: string) {
    try {
        await signInWithEmailAndPassword(auth, email, password)
        const user = auth.currentUser

        // Null validation (realistically should not hit this)
        if (!user) {
            return "User does not exist."
        }

        // Check verification of the email
        if (!user.emailVerified) {
            await auth.signOut();
            return `User is not verified. Please check ${email} for a confirmation link.`;
        }

        // Successful login; cache in localStorage
        localStorage.setItem("loggedInUserId", user.uid);
        return "Login Successful!"
    } catch (error: any) {
        return errorHandling(error)
    }
}


function errorHandling(error: any) {
    // Message for if the email is invalid
    if (error.message.includes('auth/invalid-email')) {
        return "Email is invalid."

    // Message for if the password is incorrect
    } else if (error.message.includes('auth/invalid-credential')) {
        return "Password is incorrect."

    // Account exists already (only available for user registration)
    } else if (error.message.includes('auth/email-already-in-use')) {
        return "Account already exists with this email."

    } else if (error.message.includes('auth/weak-password')) {
        return "Password is weak. Make sure to include at least 6 characters."

    // Anything else
    } else {
        return error.message
    }
}


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