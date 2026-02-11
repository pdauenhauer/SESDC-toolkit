import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  Timestamp,
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
} from "firebase/firestore";

import { makeEmulatorClients } from "./firebase-test-init";
import { createUserInAuthEmulator } from "./auth-emulator";

describe("Firestore smoke (emulators) - create project then cleanup", () => {
  const clients = makeEmulatorClients("smoke-create-cleanup");
  const { auth, db } = clients;

  const createdProjectIds: string[] = [];
  const email = `smoke_${Date.now()}_${Math.random().toString(16).slice(2)}@test.local`;
  const password = "test-password-123!";
  let uid = "";

  beforeAll(async () => {
    uid = (await createUserInAuthEmulator(email, password)).uid;
    await signInWithEmailAndPassword(auth, email, password);

    // Ensure index doc exists
    await setDoc(doc(db, "users", uid), { numprojects: 0, projectids: [] }, { merge: true });
  });

  afterAll(async () => {
    // Cleanup created projects + index updates
    for (const projectId of createdProjectIds) {
      await deleteDoc(doc(db, "users", uid, "projects", projectId)).catch(() => {});
      await updateDoc(doc(db, "users", uid), {
        projectids: arrayRemove(projectId),
        numprojects: increment(-1),
      }).catch(() => {});
    }

    await clients.cleanup();
  });

  test("dummy user can create a project (then it will be cleaned up)", async () => {
    // CREATE
    const projectRef = doc(collection(db, "users", uid, "projects"));
    const projectId = projectRef.id;
    const now = Timestamp.now(); // deterministic ordering in tests

    await setDoc(projectRef, {
      id: projectId,
      name: `SmokeTest ${projectId.slice(0, 6)}`,
      description: "Created by smoke test",
      createdAt: now,
      updatedAt: now,

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

    await updateDoc(doc(db, "users", uid), {
      projectids: arrayUnion(projectId),
      numprojects: increment(1),
    });

    createdProjectIds.push(projectId);

    // READ ONE
    const one = await getDoc(doc(db, "users", uid, "projects", projectId));
    expect(one.exists()).toBe(true);
    expect(one.data()!.projectOwner).toBe(uid);

    // LIST RECENT (orderBy + limit)
    const q = query(
      collection(db, "users", uid, "projects"),
      orderBy("updatedAt", "desc"),
      limit(10)
    );
    const list = await getDocs(q);
    expect(list.docs.length).toBeGreaterThan(0);

    // make sure the created project is in the list
    expect(list.docs.some((d) => d.id === projectId)).toBe(true);
  });
});
