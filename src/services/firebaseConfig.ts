import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Configuration read strictly from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Check if credentials have been customized or if demo defaults are present
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.length > 20 &&
  !firebaseConfig.apiKey.includes('DemoDummyKey') &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('examtaker-demo')
);

// Safe singleton initialization: only initialize Firebase SDK if valid credentials are present
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('Error initializing Firebase services, falling back to mock mode:', err);
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Firestore;
  }
} else {
  // Graceful fallback dummies so the client bundle never crashes if secrets are missing
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
}

export { app, auth, db, firebaseConfig };
export default app;
