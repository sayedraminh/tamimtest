// profile.js - Firebase-integrated profile management
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

let currentUser = null;
let userData = null;

// Check auth state and load profile
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    
    // Load user data from Firestore
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            displayProfile(userData, user.email);
        } else {
            // Fallback to basic Firebase Auth info
            displayProfile({}, user.email);
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        displayProfile({}, user.email);
    }
});

function displayProfile(data, email) {
    document.getElementById('profileName').textContent = data.fullName || data.username || 'Not provided';
    document.getElementById('profileEmail').textContent = email || 'Not provided';
    document.getElementById('profileDOB').textContent = data.dateOfBirth || 'Not provided';
    document.getElementById('profilePhone').textContent = data.phoneNumber || 'Not provided';
    document.getElementById('profilePic').src = data.profilePic || 'https://via.placeholder.com/120?text=Profile';
}

// Change Picture
document.getElementById('changePicBtn').onclick = () => document.getElementById('changePicInput').click();

document.getElementById('changePicInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const newPic = ev.target.result;
        document.getElementById('profilePic').src = newPic;
        
        try {
            await updateDoc(doc(db, "users", currentUser.uid), {
                profilePic: newPic
            });
            alert('Profile picture updated!');
        } catch (error) {
            console.error("Error updating profile picture:", error);
            alert('Failed to save profile picture.');
        }
    };
    reader.readAsDataURL(file);
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('Log out?')) {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Logout error:", error);
        }
    }
});

// Delete Account
document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
        try {
            // Note: In production, you'd also delete the Firestore document
            await currentUser.delete();
            window.location.href = 'signup.html';
        } catch (error) {
            console.error("Delete account error:", error);
            alert('Failed to delete account. You may need to re-login and try again.');
        }
    }
});

// Edit Profile Modal
const editModal = document.getElementById('editModal');
document.getElementById('editBtn').onclick = () => {
    editModal.style.display = 'flex';
    document.getElementById('editName').value = userData?.fullName || '';
    document.getElementById('editDOB').value = userData?.dateOfBirth || '';
    document.getElementById('editPhone').value = userData?.phoneNumber || '';
};

document.getElementById('closeEditModal').onclick = () => editModal.style.display = 'none';

document.getElementById('saveEditBtn').onclick = async () => {
    const newName = document.getElementById('editName').value;
    const newDOB = document.getElementById('editDOB').value;
    const newPhone = document.getElementById('editPhone').value;

    if (!currentUser) return;

    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            fullName: newName,
            dateOfBirth: newDOB,
            phoneNumber: newPhone
        });

        document.getElementById('profileName').textContent = newName || 'Not provided';
        document.getElementById('profileDOB').textContent = newDOB || 'Not provided';
        document.getElementById('profilePhone').textContent = newPhone || 'Not provided';

        userData = { ...userData, fullName: newName, dateOfBirth: newDOB, phoneNumber: newPhone };
        alert('Profile updated!');
        editModal.style.display = 'none';
    } catch (error) {
        console.error("Error updating profile:", error);
        alert('Failed to update profile.');
    }
};

// Password Reset Modal
const verifyModal = document.getElementById('verifyModal');

document.getElementById('sendVerificationBtn').onclick = () => {
    verifyModal.style.display = 'flex';
};

document.getElementById('closeVerifyModal').onclick = () => verifyModal.style.display = 'none';

document.getElementById('submitVerification').onclick = async () => {
    const currentPassword = document.getElementById('verificationCode').value; // Repurposed as current password
    const pass1 = document.getElementById('newPassword').value;
    const pass2 = document.getElementById('confirmPassword').value;

    if (pass1 !== pass2) return alert('Passwords do not match!');
    if (pass1.length < 6) return alert('Password must be at least 6 characters!');

    try {
        // Re-authenticate user before password change
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, pass1);
        alert('Password changed successfully!');
        verifyModal.style.display = 'none';
    } catch (error) {
        console.error("Password change error:", error);
        if (error.code === 'auth/wrong-password') {
            alert('Current password is incorrect.');
        } else {
            alert('Failed to change password: ' + error.message);
        }
    }
};

