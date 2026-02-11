// src/pages/Logout.tsx
import { useEffect } from 'preact/hooks';
import { getAuth, signOut } from "firebase/auth";

import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';

import '../css/login.css'; // optional if you want the same fonts/style

export default function Logout() {

    useEffect(() => {
        const auth = getAuth();

        // sign the user out
        signOut(auth)
            .then(() => {
                console.log("User logged out");

                // redirect after short delay
                setTimeout(() => {
                    window.location.href = "/login";
                }, 1500);
            })
            .catch((err) => {
                console.error("Logout error:", err);
            });
    }, []);

    return (
        <>
            <SESDCHeader />

            {/* TODO: Styling */}
            <main>
                <div class="wrapper logout-wrapper">
                    <h1>You have been logged out</h1>
                    <p>Redirecting to login...</p>
                </div>
            </main>

            <SESDCFooter />
        </>
    );
}
