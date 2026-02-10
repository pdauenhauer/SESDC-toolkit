import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

export function makeEmulatorClients(testName = "test") {
  const app = initializeApp(
    {
      projectId: "demo-sesdc-toolkit",
      apiKey: "fake-api-key",
      authDomain: "demo-sesdc-toolkit.firebaseapp.com",
    },
    // Makes a unique name for the app instance

    `${testName}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const auth = getAuth(app);
  const db = getFirestore(app);

  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);

  return {
    app,
    auth,
    db,
    cleanup: async () => {
      await deleteApp(app).catch(() => {});
    },
  };
}
