import { describe, expect, test } from "vitest";
import { makeEmulatorClients } from "./firebase-test-init";
import { doc, setDoc } from "firebase/firestore";

describe("Firestore rules - anonymous", () => {
  const { db } = makeEmulatorClients();

  test("anonymous cannot write to users/{uid}/projects", async () => {
    // We are not signing in, so auth.currentUser is null
    const targetUid = "someUid";
    const ref = doc(db, "users", targetUid, "projects", "p1");

    await expect(
      setDoc(ref, { name: "should fail" })
    ).rejects.toThrow();
  });
});
