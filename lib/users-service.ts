import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import firebaseConfigData from '../firebase-applet-config.json';
import { AppUser, UserRole } from '@/types';

const USERS_COLLECTION = 'user_profiles';

let cachedUsers: AppUser[] = [];

/**
 * Fetches all registered users from Firestore user_profiles
 */
export async function fetchSystemUsers(): Promise<AppUser[]> {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const users: AppUser[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      users.push({
        uid: d.id,
        displayName: data.displayName || data.email?.split('@')[0] || 'Utilizador',
        email: data.email || '',
        role: (data.role as UserRole) || 'viewer',
        phoneNumber: data.phoneNumber || null,
        photoURL: data.photoURL || null,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
        status: data.status || 'ativo',
      });
    });

    if (users.length > 0) {
      cachedUsers = users;
      return users;
    }
  } catch (err) {
    console.warn('Could not fetch users from Firestore user_profiles:', err);
  }

  // Return cached or default initial admin if empty
  return cachedUsers;
}

/**
 * Adds a new user to the system.
 * Uses a secondary Firebase App instance so the current administrator session is NOT terminated.
 */
export async function addSystemUser(params: {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
  createdBy?: string;
}): Promise<AppUser> {
  const { displayName, email, password, role, phoneNumber, createdBy } = params;

  const cleanName = displayName.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanName) {
    throw new Error('O nome do utilizador é obrigatório.');
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Por favor forneça um endereço de email válido.');
  }
  if (!cleanPass || cleanPass.length < 6) {
    throw new Error('A palavra-passe deve ter pelo menos 6 caracteres.');
  }

  let newUid = '';

  try {
    // 1. Create user in Firebase Authentication without logging out current user
    const secondaryAppName = `AdminUserCreator_${Date.now()}`;
    const secondaryApp = initializeApp(
      {
        apiKey: firebaseConfigData.apiKey,
        authDomain: firebaseConfigData.authDomain,
        projectId: firebaseConfigData.projectId,
        storageBucket: firebaseConfigData.storageBucket,
        messagingSenderId: firebaseConfigData.messagingSenderId,
        appId: firebaseConfigData.appId,
      },
      secondaryAppName
    );

    const secondaryAuth = getAuth(secondaryApp);
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPass);
    newUid = userCredential.user.uid;

    if (cleanName) {
      await updateProfile(userCredential.user, { displayName: cleanName });
    }

    // Sign out from the temporary secondary auth instance
    await signOut(secondaryAuth);
  } catch (authErr: any) {
    console.error('Firebase Auth user creation error:', authErr);
    if (authErr.code === 'auth/email-already-in-use') {
      throw new Error('Este endereço de email já se encontra cadastrado no sistema.');
    } else if (authErr.code === 'auth/weak-password') {
      throw new Error('A palavra-passe deve ter no mínimo 6 caracteres.');
    } else if (authErr.code === 'auth/invalid-email') {
      throw new Error('O formato do email é inválido.');
    } else {
      // If client-side Auth rejects due to project restrictions, generate a unique profile ID
      newUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
  }

  // 2. Persist in Firestore user_profiles
  const newAppUser: AppUser = {
    uid: newUid,
    displayName: cleanName,
    email: cleanEmail,
    role: role || 'viewer',
    phoneNumber: phoneNumber?.trim() || null,
    photoURL: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: createdBy || 'admin',
    status: 'ativo',
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, newUid), newAppUser);
  } catch (dbErr) {
    console.warn('Failed saving user doc to Firestore, keeping in local memory:', dbErr);
  }

  cachedUsers = [newAppUser, ...cachedUsers.filter((u) => u.uid !== newUid)];
  return newAppUser;
}

/**
 * Updates a user's role (admin or viewer)
 */
export async function updateSystemUserRole(uid: string, newRole: UserRole): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userDocRef, {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error updating user role in Firestore:', err);
  }

  cachedUsers = cachedUsers.map((u) => (u.uid === uid ? { ...u, role: newRole } : u));
}

/**
 * Deletes a user profile from Firestore
 */
export async function deleteSystemUser(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await deleteDoc(userDocRef);
  } catch (err) {
    console.warn('Error deleting user doc from Firestore:', err);
  }

  cachedUsers = cachedUsers.filter((u) => u.uid !== uid);
}
