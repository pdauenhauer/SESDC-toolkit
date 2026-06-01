import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Timestamp, doc, collection, setDoc, getDoc, getDocs, query, orderBy, limit, updateDoc, increment, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { makeEmulatorClients } from "./firebase-test-init";
import { createUserInAuthEmulator } from "./auth-emulator";

describe("E2E - owner-only projects", () => {
  const clients = makeEmulatorClients("owner-e2e");
  const { auth, db } = clients;

  const createdProjectIds: string[] = [];
  const email = `smoke_${Date.now()}_${Math.random().toString(16).slice(2)}@test.local`;
  const password = "test-password-123!";
  let uid = "";

  beforeAll(async () => {
    uid = (await createUserInAuthEmulator(email, password)).uid;
    await signInWithEmailAndPassword(auth, email, password);

    // Ensure base user doc exists
    await setDoc(doc(db, "users", uid), { numprojects: 0, projectids: [] }, { merge: true });
  });

  afterAll(async () => {
    for (const projectId of createdProjectIds) {
      await deleteDoc(doc(db, "users", uid, "projects", projectId)).catch(() => {});
      await updateDoc(doc(db, "users", uid), {
        projectids: arrayRemove(projectId),
        numprojects: increment(-1),
      }).catch(() => {});
    }
    await clients.cleanup();
  });

  test("create -> read -> list recent", async () => {
    const projectRef = doc(collection(db, "users", uid, "projects"));
    const projectId = projectRef.id;

    // Use Timestamp.now() to make orderBy deterministic in tests
    const now = Timestamp.now();

    await setDoc(projectRef, {
      id: projectId,
      name: `SmokeTest ${projectId.slice(0, 6)}`,
      description: "Created by CI smoke test",
      createdAt: now,
      updatedAt: now,

      isShared: false,
      projectOwner: uid,
      projectEditors: [],
      projectViewers: [],
      simulationRan: false,
      projectSettings: { latitude: 47.61, longitude: -122.33 },
    });

    await updateDoc(doc(db, "users", uid), {
      projectids: arrayUnion(projectId),
      numprojects: increment(1),
    });

    createdProjectIds.push(projectId);

    const one = await getDoc(doc(db, "users", uid, "projects", projectId));
    expect(one.exists()).toBe(true);
    expect(one.data()!.projectOwner).toBe(uid);

    const q = query(
      collection(db, "users", uid, "projects"),
      orderBy("updatedAt", "desc"),
      limit(10)
    );
    const list = await getDocs(q);
    expect(list.docs.length).toBeGreaterThan(0);
  });
});
