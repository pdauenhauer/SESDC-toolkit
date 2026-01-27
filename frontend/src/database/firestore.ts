import { initializeApp } from "firebase/app";
import {
  getFirestore,
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

import type { User, Project } from "./models/metadata";

//import env data
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

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
  return snap.exists() ? ({ ...(snap.data() as Project) }) : null;
}

export async function listProjects(uid: string, max = 50) {
  // orderBy requires createdAt/updatedAt to be Timestamp (serverTimestamp is fine)
  const q = query(projectsCol(uid), orderBy("updatedAt", "desc"));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ ...(d.data() as Project) }));
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
