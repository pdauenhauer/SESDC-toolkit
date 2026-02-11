import { beforeAll, afterAll, describe, expect, test } from "vitest";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { makeEmulatorClients } from "./firebase-test-init";

const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";

// Create a user in the Auth emulator via local REST endpoint
async function createUserInAuthEmulator(email: string, password: string) {
  const res = await fetch(
    `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth emulator signUp failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return { uid: data.localId as string };
}

describe("Firestore smoketest (emulators) - users/{uid}/projects", () => {
  const { auth, db } = makeEmulatorClients();

  const createdProjectIds: string[] = [];
  const email = `smoke_${Date.now()}_${Math.random().toString(16).slice(2)}@test.local`;
  const password = "test-password-123!";

  let uid: string;

  beforeAll(async () => {
    // Ensure we can "sign in"
    const created = await createUserInAuthEmulator(email, password);
    uid = created.uid;

    await signInWithEmailAndPassword(auth, email, password);

    // Ensure base user doc exists so updateDoc won't fail
    await setDoc(
      doc(db, "users", uid),
      { numprojects: 0, projectids: [] },
      { merge: true }
    );
  });

  afterAll(async () => {
    // Cleanup like your cleanupSmokeTest
    for (const projectId of createdProjectIds) {
      await deleteDoc(doc(db, "users", uid, "projects", projectId)).catch(() => {});
      await updateDoc(doc(db, "users", uid), {
        projectids: arrayRemove(projectId),
        numprojects: increment(-1),
      }).catch(() => {});
    }
  });

  test("create + read one + query recent", async () => {
    // CREATE (mirrors your testdb.ts)
    const projectRef = doc(collection(db, "users", uid, "projects"));
    const projectId = projectRef.id;

    await setDoc(projectRef, {
      id: projectId,
      name: `SmokeTest ${projectId.slice(0, 6)}`,
      description: "Created by CI smoke test",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      isShared: false,
      projectOwner: uid,
      projectEditors: [],
      projectViewers: [],
      simulationRan: false,

      projectSettings: {
        latitude: 47.61,
        longitude: -122.33,
        laborCost: 25,
        energyPrice: 0.15,
        projectInflationRate: 3.0,
      },
    });

    // Update "index" doc like your existing code
    await updateDoc(doc(db, "users", uid), {
      projectids: arrayUnion(projectId),
      numprojects: increment(1),
    });

    createdProjectIds.push(projectId);

    // READ ONE
    const one = await getDoc(doc(db, "users", uid, "projects", projectId));
    expect(one.exists()).toBe(true);
    expect(one.data()!.projectOwner).toBe(uid);

    // QUERY recent
    const q = query(
      collection(db, "users", uid, "projects"),
      orderBy("updatedAt", "desc"),
      limit(10)
    );
    const list = await getDocs(q);
    expect(list.docs.length).toBeGreaterThan(0);
  });
});
