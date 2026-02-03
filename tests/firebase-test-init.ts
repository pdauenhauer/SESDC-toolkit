import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

export function makeEmulatorClients() {
  // Only projectId is required when using emulators
  const app = initializeApp({ projectId: "demo-sesdc-toolkit" });

  const auth = getAuth(app);
  const db = getFirestore(app);

  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);

  return { app, auth, db };
}
