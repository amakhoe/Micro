import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfigData from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfigData) : getApp();
export const auth = getAuth(app);

// Use custom firestoreDatabaseId if specified, or default
const dbId =
  firebaseConfigData.firestoreDatabaseId &&
  firebaseConfigData.firestoreDatabaseId !== '(default)'
    ? firebaseConfigData.firestoreDatabaseId
    : undefined;

// Use initializeFirestore with experimentalForceLongPolling: true to prevent WebChannel streaming
// timeouts in iframe/proxy environments ("Could not reach Cloud Firestore backend within 10 seconds")
let dbInstance;
try {
  dbInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    dbId
  );
} catch {
  dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = dbInstance;
export default app;
