import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebaseConfig';
import type { AppUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  isFirebaseActive: boolean;
  loginTeacher: (email: string, pass: string) => Promise<void>;
  registerTeacher: (email: string, pass: string, name: string) => Promise<void>;
  loginDemoTeacher: () => void;
  loginStudent: (name: string, code: string) => Promise<string>; // returns uid
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STUDENT_SESSION_KEY = 'examtaker_student_session';
const TEACHER_SESSION_KEY = 'examtaker_mock_teacher_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If real Firebase is available, listen to auth state changes
    if (isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          // Check if this is an anonymous student or an authenticated teacher
          if (firebaseUser.isAnonymous) {
            const stored = localStorage.getItem(STUDENT_SESSION_KEY);
            const studentData = stored ? JSON.parse(stored) : {};
            setUser({
              uid: firebaseUser.uid,
              email: null,
              role: 'student',
              displayName: studentData.name || 'Estudiante',
              studentCode: studentData.code || '',
              isAnonymous: true,
            });
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'teacher',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Docente',
              isAnonymous: false,
            });
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Fallback local/demo auth state restore
      const storedTeacher = localStorage.getItem(TEACHER_SESSION_KEY);
      const storedStudent = localStorage.getItem(STUDENT_SESSION_KEY);

      if (storedTeacher) {
        setUser(JSON.parse(storedTeacher));
      } else if (storedStudent) {
        const parsed = JSON.parse(storedStudent);
        setUser({
          uid: parsed.uid,
          email: null,
          role: 'student',
          displayName: parsed.name,
          studentCode: parsed.code,
          isAnonymous: true
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    }
  }, []);

  const loginTeacher = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        setUser({
          uid: cred.user.uid,
          email: cred.user.email,
          role: 'teacher',
          displayName: cred.user.displayName || email.split('@')[0],
          isAnonymous: false,
        });
      } else {
        // Mock teacher login
        const mockUser: AppUser = {
          uid: 'mock_teacher_' + Math.random().toString(36).substring(2, 9),
          email,
          role: 'teacher',
          displayName: email.split('@')[0],
          isAnonymous: false,
        };
        localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(mockUser));
        localStorage.removeItem(STUDENT_SESSION_KEY);
        setUser(mockUser);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión como docente';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerTeacher = async (email: string, pass: string, name: string) => {
    setError(null);
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: name });
        setUser({
          uid: cred.user.uid,
          email: cred.user.email,
          role: 'teacher',
          displayName: name,
          isAnonymous: false,
        });
      } else {
        const mockUser: AppUser = {
          uid: 'mock_teacher_' + Math.random().toString(36).substring(2, 9),
          email,
          role: 'teacher',
          displayName: name,
          isAnonymous: false,
        };
        localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(mockUser));
        localStorage.removeItem(STUDENT_SESSION_KEY);
        setUser(mockUser);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar docente';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginDemoTeacher = () => {
    const demoTeacher: AppUser = {
      uid: 'teacher_demo_uid',
      email: 'profesor@demo.edu',
      role: 'teacher',
      displayName: 'Prof. Arquitecto Demo',
      isAnonymous: false,
    };
    localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(demoTeacher));
    localStorage.removeItem(STUDENT_SESSION_KEY);
    setUser(demoTeacher);
  };

  const loginStudent = async (name: string, code: string): Promise<string> => {
    setError(null);
    setLoading(true);
    try {
      let uid = '';
      if (isFirebaseConfigured) {
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
      } else {
        uid = 'student_' + Math.random().toString(36).substring(2, 9);
      }

      const studentSession = { uid, name, code, startedAt: Date.now() };
      localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(studentSession));
      localStorage.removeItem(TEACHER_SESSION_KEY);

      const appStudent: AppUser = {
        uid,
        email: null,
        role: 'student',
        displayName: name,
        studentCode: code,
        isAnonymous: true,
      };
      setUser(appStudent);
      return uid;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al ingresar como estudiante';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        await signOut(auth);
      }
      localStorage.removeItem(TEACHER_SESSION_KEY);
      localStorage.removeItem(STUDENT_SESSION_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isFirebaseActive: isFirebaseConfigured,
        loginTeacher,
        registerTeacher,
        loginDemoTeacher,
        loginStudent,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
