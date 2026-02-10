const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";

// Create a user in the Auth emulator via local REST endpoint
export async function createUserInAuthEmulator(email: string, password: string) {
  const res = await fetch(
    `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  if (!res.ok) {
    throw new Error(`Auth emulator signUp failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return { uid: data.localId as string };
}
