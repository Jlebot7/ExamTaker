export type UserRole = 'teacher' | 'student';

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName?: string;
  studentCode?: string;
  isAnonymous: boolean;
}
