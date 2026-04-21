// src/pages/Logout.tsx
import { useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { getAuth, signOut } from "firebase/auth";
import '../css/login.css'; // optional if you want the same fonts/style

export default function Logout() {
    const { route } = useLocation();

    useEffect(() => {
        const auth = getAuth();

        // sign the user out
        signOut(auth)
            .then(() => {
                console.log("User logged out");

                // redirect after short delay
                setTimeout(() => {
                    route("/login");
                }, 1500);
            })
            .catch((err) => {
                console.error("Logout error:", err);
            });
    }, [route]);

    return (
        <>
            {/* TODO: Styling */}
            <main>
                <div class="wrapper logout-wrapper">
                    <h1>You have been logged out</h1>
                    <p>Redirecting to login...</p>
                </div>
            </main>
        </>
    );
}
