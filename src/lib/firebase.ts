import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Assessment,
  AssessmentAttempt,
  Question,
  UserProfile,
} from '../types/assessment';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'doc-1';
}

export async function signInWithGooglePopup() {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutFirebase() {
  await signOut(auth);
}

export async function syncUserProfileToFirestore(profile: UserProfile, isCreate = false) {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const uid = sanitizeId(auth.currentUser.uid);
  const path = `users/${uid}`;
  try {
    const safeRole =
      profile.role === 'instructor' || profile.role === 'participant'
        ? profile.role
        : 'instructor';
    await setDoc(doc(db, 'users', uid), {
      uid,
      fullName: (profile.fullName || 'Pengguna ASKIA').slice(0, 120),
      role: isCreate ? safeRole : profile.role,
      organizationId: sanitizeId(profile.organizationId || 'org-sman1'),
      jobTitle: (profile.jobTitle || 'Instruktur').slice(0, 100),
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, isCreate ? OperationType.CREATE : OperationType.WRITE, path);
  }
}

export async function syncAssessmentToFirestore(assessment: Assessment) {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const id = sanitizeId(assessment.id);
  const path = `assessments/${id}`;
  try {
    await setDoc(doc(db, 'assessments', id), {
      ownerId: sanitizeId(auth.currentUser.uid),
      organizationId: sanitizeId(assessment.organizationId),
      title: assessment.title.slice(0, 200),
      assessmentType: assessment.assessmentType,
      status: assessment.status,
      accessCode: sanitizeId(assessment.accessCode).slice(0, 32),
      durationMinutes: Math.max(1, Math.min(600, Math.round(assessment.durationMinutes))),
      passingScore: Math.max(0, Math.min(100, Math.round(assessment.passingScore))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncQuestionToFirestore(question: Question) {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const id = sanitizeId(question.id);
  const path = `questions/${id}`;
  const boundedTags = Array.isArray(question.tags)
    ? question.tags
        .map((t) => String(t).trim().slice(0, 50))
        .filter((t) => t.length >= 1)
        .slice(0, 10)
    : [];
  try {
    await setDoc(doc(db, 'questions', id), {
      ownerId: sanitizeId(auth.currentUser.uid),
      organizationId: sanitizeId(question.organizationId),
      prompt: question.prompt.slice(0, 2000),
      questionType: question.questionType,
      category: (question.category || 'Umum').slice(0, 100),
      topic: (question.topic || 'Umum').slice(0, 100),
      tags: boundedTags,
      difficulty: question.difficulty,
      points: Math.max(1, Math.min(100, Math.round(question.points))),
      status: question.isDraft || question.status === 'draft' ? 'draft' : 'published',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncAttemptToFirestore(attempt: AssessmentAttempt, isCreate = false) {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const id = sanitizeId(attempt.id);
  const path = `attempts/${id}`;
  try {
    await setDoc(doc(db, 'attempts', id), {
      participantId: sanitizeId(auth.currentUser.uid),
      assessmentId: sanitizeId(attempt.assessmentId),
      status: isCreate ? 'in_progress' : attempt.status === 'graded' ? 'graded' : 'submitted',
      objectiveScore: isCreate ? 0 : Math.max(0, Math.min(100, Math.round(attempt.objectiveScore))),
      finalScore: isCreate ? 0 : Math.max(0, Math.min(100, Math.round(attempt.finalScore))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, isCreate ? OperationType.CREATE : OperationType.WRITE, path);
  }
}

export async function fetchOwnedAssessmentsFromFirestore(uid: string) {
  const path = 'assessments';
  try {
    const q = query(collection(db, path), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
