import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import type { Load } from "./models/load";
import { migrateLoad } from "./models/load";


import type { User, Project } from "./models/metadata";
import { db } from "../utils/firebase/firebase-init";

//path helpers 
const userRef = (uid: string) => doc(db, "users", uid);
const projectsCol = (uid: string) => collection(db, "users", uid, "projects");
const projectRef = (uid: string, projectId: string) => doc(db, "users", uid, "projects", projectId);

//user 
export async function getUser(uid: string) {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? ({ ...(snap.data() as User) }) : null;
}

export async function upsertUser(uid: string, data: Partial<User>) {
  //merge keeps existing fields
  await setDoc(
    userRef(uid),
    {
      ...data,
    },
    { merge: true }
  );
}

//projects 
export async function createProject(uid: string, data: Omit<Partial<Project>, "createdAt" | "updatedAt">) {
  const docRef = await addDoc(projectsCol(uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as DocumentData);
  return docRef.id;
}

export async function getProject(uid: string, projectId: string) {
  const snap = await getDoc(projectRef(uid, projectId));
  return snap.exists() ? ({ ...(snap.data() as Project), id: snap.id }) : null;
}

export async function listProjects(uid: string, _max = 50) {
  // orderBy requires createdAt/updatedAt to be Timestamp (serverTimestamp is fine)
  const q = query(projectsCol(uid), orderBy("updatedAt", "desc"));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ ...(d.data() as Project), id: d.id }));
}

export async function updateProject(uid: string, projectId: string, patch: Partial<Project>) {
  await updateDoc(projectRef(uid, projectId), {
    ...patch,
    updatedAt: serverTimestamp(),
  } as DocumentData);
}

export async function deleteProject(uid: string, projectId: string) {
  await deleteDoc(projectRef(uid, projectId));
}

// Fetch the persisted load tree for a project (auto-migrates legacy single-profile loads)
export async function getProjectLoads(uid: string, projectId: string): Promise<Load[]> {
  const snap = await getDoc(projectRef(uid, projectId));
  if (!snap.exists()) return [];
  const data = snap.data() as any;
  const rawLoads: any[] = data.loads ?? [];
  return rawLoads.map(migrateLoad);
}
// Persist the project's load tree to Firestore and update its last-modified timestamp.
export async function saveProjectLoads(uid: string, projectId: string, loads: Load[]) {
  await updateDoc(projectRef(uid, projectId), {
    loads: sanitizeLoads(loads),
    updatedAt: serverTimestamp(),
  } as DocumentData);
}

// sanitize loads for Firestore by stripping undefined fields and recursively sanitizing children.

function sanitizeLoads(loads: Load[]): any[] {
  const sanitize = (l: Load): any => ({
    id: l.id,
    name: l.name,
    labelId: l.labelId,
    seasonalProfiles: l.seasonalProfiles ?? {},
    ...(l.children && l.children.length ? { children: l.children.map(sanitize) } : {}),
  });

  return loads.map(sanitize);
}

//For Emulator connections
import { connectFirestoreEmulator } from "firebase/firestore";
const useFirestoreEmulator = import.meta.env.VITE_USE_FIRESTORE_EMULATOR === "true";
const firestoreEmulatorHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || "127.0.0.1";
const firestoreEmulatorPort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || "8080");

if (useFirestoreEmulator) {
  connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort);
  console.log(
    ` Connected to local Firestore emulator at ${firestoreEmulatorHost}:${firestoreEmulatorPort}`
  );
}
