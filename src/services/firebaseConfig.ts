import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Configuration read from environment variables with project default fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBn0K3GxmES3eyFzQ01Xk4TMZ92Diz-qVQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'examtaker-45b98.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'examtaker-45b98',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'examtaker-45b98.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '208016146714',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:208016146714:web:7aff5df5cf24ab915eeca3',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-DV33R28M83',
};

// Check if credentials have been customized or if demo defaults are present
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.length > 20 &&
  !firebaseConfig.apiKey.includes('DemoDummyKey') &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('examtaker-demo')
);

// Safe singleton initialization
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
