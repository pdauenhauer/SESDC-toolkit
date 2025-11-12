import { auth, db } from './firebase-init.ts';
import { createFolder } from './storage.ts';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    fetchSignInMethodsForEmail
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore'

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
    } catch (error: any) {
        throw error;
    }
}