import { storage } from './firebase-init'
import { ref, uploadString } from 'firebase/storage'

export async function createFolder(folder_path: string) {
    const fileRef = ref(storage, `${folder_path}/.temp`);
    await uploadString(fileRef, '');
    console.log(`Folder created: ${folder_path}`);
}
