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
  
  import { db } from "../firebase-init"; 
  
  const TRACK_KEY = "firestore_smoketest_created_projects_v1";
  
  function requireUid(): string {
    const uid = localStorage.getItem("loggedInUserId");
    if (!uid) throw new Error("No loggedInUserId in localStorage. Log in via the app first.");
    return uid;
  }
  
  function readTracked(): string[] {
    try {
      return JSON.parse(localStorage.getItem(TRACK_KEY) || "[]");
    } catch {
      return [];
    }
  }
  
  function writeTracked(ids: string[]) {
    localStorage.setItem(TRACK_KEY, JSON.stringify(ids));
  }
  
  export async function runSmokeTest(opts?: { createCount?: number }) {
    const uid = requireUid();
    const createCount = opts?.createCount ?? 1;
  
    const created: string[] = [];
  
    for (let i = 0; i < createCount; i++) {
      const projectRef = doc(collection(db, "users", uid, "projects"));
      const projectId = projectRef.id;
  
      await setDoc(projectRef, {
        id: projectId,
        name: `SmokeTest ${projectId.slice(0, 6)}`,
        description: "Created by TS smoke test",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
  
        isShared: false,
        projectOwner: uid,
        projectEditors: [],
        projectViewers: [],
        simulationRan: false,
  
        // optional representative nested fields
        projectSettings: {
          latitude: 47.61,
          longitude: -122.33,
          laborCost: 25,
          energyPrice: 0.15,
          projectInflationRate: 3.0,
        },
      });
  
      // keep existing indexing style working
      await updateDoc(doc(db, "users", uid), {
        projectids: arrayUnion(projectId),
        numprojects: increment(1),
      });
  
      created.push(projectId);
    }
  
    writeTracked([...readTracked(), ...created]);
  
    // Prove read works
    const last = created[created.length - 1];
    const one = await getDoc(doc(db, "users", uid, "projects", last));
    console.log("[SmokeTest] READ ONE:", one.exists() ? { id: one.id, ...one.data() } : "missing");
  
    // Prove query works (orderBy + limit)
    const q = query(
      collection(db, "users", uid, "projects"),
      orderBy("updatedAt", "desc"),
      limit(10)
    );
    const list = await getDocs(q);
    console.log(
      "[SmokeTest] LIST RECENT:",
      list.docs.map(d => ({ id: d.id, ...d.data() }))
    );
  
    return created;
  }
  
  export async function cleanupSmokeTest() {
    const uid = requireUid();
    const ids = readTracked();
    if (!ids.length) {
      console.log("[SmokeTest] No tracked projects to delete.");
      return 0;
    }
  
    for (const projectId of ids) {
      await deleteDoc(doc(db, "users", uid, "projects", projectId)).catch(() => {});
      await updateDoc(doc(db, "users", uid), {
        projectids: arrayRemove(projectId),
        numprojects: increment(-1),
      }).catch(() => {});
    }
  
    writeTracked([]);
    console.log(`[SmokeTest] Cleanup complete. Deleted ${ids.length} project(s).`);
    return ids.length;
  }
  