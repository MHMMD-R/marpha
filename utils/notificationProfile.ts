import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationProfileRole = 'teacher' | 'student';

export function isNotificationsEnabled(data: any): boolean {
  return data?.notificationsEnabled !== false;
}

export async function resolveNotificationProfile(uid: string): Promise<{
  role: NotificationProfileRole;
  ref: ReturnType<typeof doc>;
  data: any;
} | null> {
  const teacherRef = doc(db, 'teachers', uid);
  const teacherSnap = await getDoc(teacherRef);
  if (teacherSnap.exists()) {
    return {
      role: 'teacher',
      ref: teacherRef,
      data: teacherSnap.data(),
    };
  }

  const studentRef = doc(db, 'students', uid);
  const studentSnap = await getDoc(studentRef);
  if (studentSnap.exists()) {
    return {
      role: 'student',
      ref: studentRef,
      data: studentSnap.data(),
    };
  }

  return null;
}

export function getNotificationProfileRef(role: NotificationProfileRole, uid: string) {
  return doc(db, role === 'teacher' ? 'teachers' : 'students', uid);
}

export async function updateNotificationProfile(
  uid: string,
  updates: Record<string, unknown>,
  role?: NotificationProfileRole | null
) {
  const resolvedRole = role ?? (await resolveNotificationProfile(uid))?.role;
  if (!resolvedRole) {
    return null;
  }

  const ref = getNotificationProfileRef(resolvedRole, uid);
  await setDoc(ref, updates, { merge: true });
  return {
    role: resolvedRole,
    ref,
  };
}
