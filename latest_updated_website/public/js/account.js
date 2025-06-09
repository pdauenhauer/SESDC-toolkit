import { app } from './firebase-init.js';
import {
  getAuth,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  updatePassword,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
  getStorage,
  ref,
  listAll,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const auth = getAuth(app);
const storage = getStorage(app);

// Show message helper with animation
function showMessage(message, divId) {
  const messageDiv = document.getElementById(divId);
  if (!messageDiv) return;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  messageDiv.style.animation = 'fade-out 5s forwards';
}

// Improved robust folder deletion function
async function deleteFolder(folderRef) {
  console.log(`Processing folder: ${folderRef.fullPath}`);

  try {
    // Get list of all items in this folder
    const listResult = await listAll(folderRef).catch(error => {
      console.warn(`Error listing contents of ${folderRef.fullPath}:`, error);
      return null;
    });

    if (!listResult) return false;

    // Delete all files in this folder first
    const fileDeletions = listResult.items.map(async (fileRef) => {
      try {
        console.log(`Attempting to delete file: ${fileRef.fullPath}`);
        await deleteObject(fileRef);
        console.log(`Successfully deleted file: ${fileRef.fullPath}`);
      } catch (error) {
        // Only log errors that aren't "file not found"
        if (error.code !== 'storage/object-not-found' && error.code !== '404') {
          console.error(`Error deleting file ${fileRef.fullPath}:`, error);
        }
      }
    });

    // Wait for all file deletions to complete
    await Promise.all(fileDeletions);

    // Now process all subfolders recursively
    const folderDeletions = listResult.prefixes.map(async (subfolderRef) => {
      await deleteFolder(subfolderRef);
    });

    // Wait for all subfolder deletions to complete
    await Promise.all(folderDeletions);

    return true;
  } catch (error) {
    console.error(`Error processing folder ${folderRef.fullPath}:`, error);
    return false;
  }
}

// Main function to delete all user files
async function deleteUserFiles(uid) {
  const rootFolderRef = ref(storage, `${uid}/`);

  try {
    console.log(`Starting deletion of user files for ${uid}...`);

    // Try deletion with multiple attempts if needed
    let success = false;
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for user ${uid}`);
      }
      success = await deleteFolder(rootFolderRef);

      if (!success) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final verification
    try {
      const finalCheck = await listAll(rootFolderRef);
      if (finalCheck.items.length === 0 && finalCheck.prefixes.length === 0) {
        console.log(`Fully verified deletion of folder ${uid}/`);
      } else {
        console.warn(`⚠️ Folder ${uid}/ still has leftover files or folders:`);
        finalCheck.items.forEach(item => console.warn(`• ${item.fullPath}`));
        finalCheck.prefixes.forEach(prefix => console.warn(`• ${prefix.fullPath}/`));
      }
    } catch (error) {
      console.log(`Could not verify final deletion status: ${error.message}`);
    }

    return success;
  } catch (error) {
    console.error(`Failed to delete user files for ${uid}:`, error);
    return false;
  }
}

// Account deletion
const deleteBtn = document.getElementById('confirmDeleteBtn');
if (deleteBtn) {
  deleteBtn.addEventListener('click', async () => {
    const password = document.getElementById('deletePassword')?.value;
    const user = auth.currentUser;
    const messageDivId = 'account-management-message';

    if (!user || !password) {
      showMessage("Missing password or user session.", messageDivId);
      return;
    }

    try {
      showMessage("Processing account deletion...", messageDivId);

      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Store the user ID before deletion
      const userId = user.uid;
      console.log(`Beginning deletion process for user ${userId}`);

      // Delete all user files
      showMessage("Deleting user files...", messageDivId);
      const filesDeleted = await deleteUserFiles(userId);

      if (!filesDeleted) {
        console.warn("Warning: Some files may not have been deleted completely");
      }

      // Delete the user account
      showMessage("Deleting account...", messageDivId);
      await deleteUser(user);

      // Clear local data and redirect
      showMessage("Account deleted successfully!", messageDivId);
      localStorage.clear();
      sessionStorage.clear();

      setTimeout(() => {
        window.location.href = `${window.location.origin}/latest_updated_website/public/index.html`;
      }, 3000);

    } catch (error) {
      console.error("Account deletion error:", error);
      showMessage(`Account deletion failed: ${error.message}`, messageDivId);
    }
  });
}

// Cancel account deletion
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', () => {
    const confirmBox = document.getElementById('deleteConfirmation');
    if (confirmBox) confirmBox.classList.add('hidden');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) deleteAccountBtn.style.display = 'inline-block';
  });
}

// Update password
const updatePasswordBtn = document.getElementById('updatePasswordBtn');
if (updatePasswordBtn) {
  updatePasswordBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    const messageDivId = 'account-management-message';

    if (!user) {
      showMessage("You must be logged in to update your password.", messageDivId);
      return;
    }

    const currentPassword = prompt("Enter your current password:");
    if (!currentPassword) return;

    const newPassword = prompt("Enter new password:");
    if (!newPassword) return;

    try {
      // Re-authenticate before password change
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update the password
      await updatePassword(user, newPassword);
      showMessage("Password updated successfully!", messageDivId);
    } catch (error) {
      console.error("Password update error:", error);
      showMessage(`Failed to update password: ${error.message}`, messageDivId);
    }
  });
}

// Show delete confirmation
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener('click', () => {
    const confirmBox = document.getElementById('deleteConfirmation');
    if (confirmBox) confirmBox.classList.remove('hidden');
    deleteAccountBtn.style.display = 'none';
  });
}