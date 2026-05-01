type AccessList = {
  allowedTeachers?: unknown;
  allowedSubjects?: unknown;
};

type StudentAccess = {
  id?: string;
  uid?: string;
  subscription?: {
    type?: string;
    endDate?: unknown;
  } & AccessList;
  freeTrial?: {
    isActive?: boolean;
    endDate?: unknown;
    access?: AccessList;
  };
};

type TeacherAccess = {
  id?: string;
  uid?: string;
  subject?: unknown;
};

const ARABIC_AL_PREFIX = /^\u0627\u0644/;

const stringArray = (value: unknown): string[] => {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
};

export const normalizeAccessSubject = (value: unknown) => {
  return typeof value === "string" ? value.trim().replace(ARABIC_AL_PREFIX, "") : "";
};

const getTime = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  const time = new Date(value as string | number | Date).getTime();
  return Number.isNaN(time) ? null : time;
};

const isSubscriptionActive = (subscription: StudentAccess["subscription"]) => {
  if (!subscription || subscription.type === "none") return false;
  const endTime = getTime(subscription.endDate);
  return endTime === null || Date.now() < endTime;
};

const isFreeTrialActive = (freeTrial: StudentAccess["freeTrial"]) => {
  if (!freeTrial?.isActive) return false;
  const endTime = getTime(freeTrial.endDate);
  return endTime !== null && Date.now() < endTime;
};

export const getTeacherIdentityIds = (teacher: TeacherAccess) => {
  return [teacher.id, teacher.uid].filter((id): id is string => typeof id === "string" && id.length > 0);
};

export const studentCanAccessTeacher = (student: StudentAccess, teacher: TeacherAccess) => {
  const subscription = student.subscription;
  const subscriptionActive = isSubscriptionActive(subscription);
  const hasFullAccess = subscriptionActive && subscription?.type === "full";

  if (hasFullAccess) return true;

  const allowedTeacherIds = new Set<string>();
  const allowedSubjects = new Set<string>();

  if (subscriptionActive && subscription?.type === "limited") {
    stringArray(subscription.allowedTeachers).forEach((id) => allowedTeacherIds.add(id));
    stringArray(subscription.allowedSubjects).map(normalizeAccessSubject).filter(Boolean).forEach((subject) => allowedSubjects.add(subject));
  }

  if (isFreeTrialActive(student.freeTrial)) {
    stringArray(student.freeTrial?.access?.allowedTeachers).forEach((id) => allowedTeacherIds.add(id));
    stringArray(student.freeTrial?.access?.allowedSubjects).map(normalizeAccessSubject).filter(Boolean).forEach((subject) => allowedSubjects.add(subject));
  }

  const teacherMatchesId = getTeacherIdentityIds(teacher).some((id) => allowedTeacherIds.has(id));
  const teacherSubject = normalizeAccessSubject(teacher.subject);
  const teacherMatchesSubject = teacherSubject.length > 0 && allowedSubjects.has(teacherSubject);

  return teacherMatchesId || teacherMatchesSubject;
};

export const studentCanAccessSubject = (student: StudentAccess, subject: unknown) => {
  const subscription = student.subscription;
  const subscriptionActive = isSubscriptionActive(subscription);

  if (subscriptionActive && subscription?.type === "full") return true;

  const normalizedSubject = normalizeAccessSubject(subject);
  if (!normalizedSubject) return false;

  const allowedSubjects = new Set<string>();

  if (subscriptionActive && subscription?.type === "limited") {
    stringArray(subscription.allowedSubjects).map(normalizeAccessSubject).filter(Boolean).forEach((item) => allowedSubjects.add(item));
  }

  if (isFreeTrialActive(student.freeTrial)) {
    stringArray(student.freeTrial?.access?.allowedSubjects).map(normalizeAccessSubject).filter(Boolean).forEach((item) => allowedSubjects.add(item));
  }

  return allowedSubjects.has(normalizedSubject);
};

export const filterTeachersForStudent = <T extends TeacherAccess>(teachers: T[], student: StudentAccess) => {
  return teachers.filter((teacher) => studentCanAccessTeacher(student, teacher));
};

export const filterStudentsForTeacher = <T extends StudentAccess>(students: T[], teacher: TeacherAccess) => {
  return students.filter((student) => studentCanAccessTeacher(student, teacher));
};

export const getVisibleTeacherIdSetForStudent = (teachers: TeacherAccess[], student: StudentAccess) => {
  const ids = new Set<string>();
  filterTeachersForStudent(teachers, student).forEach((teacher) => {
    getTeacherIdentityIds(teacher).forEach((id) => ids.add(id));
  });
  return ids;
};
