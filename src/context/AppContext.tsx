import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Assessment,
  AssessmentAttempt,
  AssessmentPair,
  AttemptAnswer,
  AuditLogEntry,
  ManualGradeRecord,
  NotificationItem,
  Organization,
  ParticipantGroup,
  Question,
  UserProfile,
  UserRole,
} from '../types/assessment';
import {
  SEED_ASSESSMENT_PAIRS,
  SEED_ASSESSMENTS,
  SEED_ATTEMPTS,
  SEED_AUDIT_LOGS,
  SEED_GROUPS,
  SEED_NOTIFICATIONS,
  SEED_ORGANIZATIONS,
  SEED_QUESTIONS,
  SEED_USERS,
} from '../data/seedData';
import { calculateAttemptScore } from '../utils/scoring';
import { getEffectiveQuestionTags } from '../utils/questionTags';
import {
  auth,
  signInWithGooglePopup,
  signOutFirebase,
  syncAssessmentToFirestore,
  syncAttemptToFirestore,
  syncQuestionToFirestore,
  syncUserProfileToFirestore,
} from '../lib/firebase';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error';
  title: string;
  detail?: string;
}

interface AppContextValue {
  currentUser: UserProfile;
  isAuthenticated: boolean;
  authReady: boolean;
  organizations: Organization[];
  users: UserProfile[];
  groups: ParticipantGroup[];
  questions: Question[];
  assessments: Assessment[];
  assessmentPairs: AssessmentPair[];
  attempts: AssessmentAttempt[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];
  toasts: ToastMessage[];
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  addToast: (type: ToastMessage['type'], title: string, detail?: string) => void;
  dismissToast: (id: string) => void;
  switchRoleDemo: (role: UserRole) => void;
  loginWithCredentials: (email: string, role?: UserRole) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUserProfile: (patch: Partial<UserProfile>) => void;
  // Assessments
  saveAssessment: (assessment: Assessment, publish?: boolean) => Assessment;
  duplicateAssessment: (assessmentId: string) => Assessment | null;
  archiveAssessment: (assessmentId: string) => void;
  restoreAssessment: (assessmentId: string) => void;
  deleteAssessment: (assessmentId: string) => void;
  // Questions
  saveQuestion: (question: Question) => Question;
  toggleQuestionDraftStatus: (questionId: string) => void;
  duplicateQuestion: (questionId: string) => Question | null;
  archiveQuestion: (questionId: string) => void;
  importQuestionsBatch: (items: Partial<Question>[]) => { imported: number; errors: string[]; duplicates: number; importedIds: string[] };
  // Exam & Attempts
  startOrResumeAttempt: (assessmentId: string, accessToken?: string) => AssessmentAttempt;
  saveAttemptAnswer: (attemptId: string, answer: AttemptAnswer, remainingSeconds?: number) => void;
  logAttemptIntegrityEvent: (attemptId: string, type: 'tab_switch' | 'fullscreen_exit' | 'connection_restored', detail: string) => void;
  submitAttempt: (attemptId: string) => AssessmentAttempt | null;
  saveManualEssayGrade: (attemptId: string, questionId: string, awardedPoints: number, feedback: string) => void;
  forceFinishAttemptByAdmin: (attemptId: string, reason: string) => void;
  extendAttemptTimeByAdmin: (attemptId: string, extraMinutes: number) => void;
  // Participants & Groups
  addParticipantUser: (data: { fullName: string; email: string; participantCode: string; groupId: string; organizationId: string }) => UserProfile;
  createGroup: (data: { name: string; code: string; level: ParticipantGroup['level']; description: string; organizationId: string }) => ParticipantGroup;
  // Admin
  toggleUserStatus: (uid: string) => void;
  updateUserRoleByAdmin: (uid: string, role: UserRole) => void;
  createOrganizationByAdmin: (data: { name: string; code: string; sector: Organization['sector']; address: string }) => void;
  markAllNotificationsRead: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = 'askia_testra_state_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>(SEED_ORGANIZATIONS);
  const [users, setUsers] = useState<UserProfile[]>(SEED_USERS);
  const [groups, setGroups] = useState<ParticipantGroup[]>(SEED_GROUPS);
  const [questions, setQuestions] = useState<Question[]>(SEED_QUESTIONS);
  const [assessments, setAssessments] = useState<Assessment[]>(SEED_ASSESSMENTS);
  const [assessmentPairs, setAssessmentPairs] = useState<AssessmentPair[]>(SEED_ASSESSMENT_PAIRS);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>(SEED_ATTEMPTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(SEED_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);

  const [currentUserId, setCurrentUserId] = useState<string>('user-instructor-1');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, detail?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, detail }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.assessments?.length) setAssessments(parsed.assessments);
        if (parsed.questions?.length) setQuestions(parsed.questions);
        if (parsed.attempts?.length) setAttempts(parsed.attempts);
        if (parsed.users?.length) setUsers(parsed.users);
        if (parsed.groups?.length) setGroups(parsed.groups);
        if (parsed.organizations?.length) setOrganizations(parsed.organizations);
        if (parsed.auditLogs?.length) setAuditLogs(parsed.auditLogs);
        if (parsed.currentUserId) setCurrentUserId(parsed.currentUserId);
      }
    } catch {
      // Ignore storage parse issues
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          assessments,
          questions,
          attempts,
          users,
          groups,
          organizations,
          auditLogs,
          currentUserId,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [assessments, questions, attempts, users, groups, organizations, auditLogs, currentUserId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setAuthReady(true);
      if (fbUser) {
        setIsAuthenticated(true);
        setUsers((prev) => {
          const exists = prev.find((u) => u.uid === fbUser.uid || u.email === fbUser.email);
          if (exists) {
            setCurrentUserId(exists.uid);
            return prev;
          }
          const newProfile: UserProfile = {
            uid: fbUser.uid,
            fullName: fbUser.displayName || 'Pengguna Terautentikasi',
            email: fbUser.email || 'pengguna@askia.id',
            emailVerified: fbUser.emailVerified,
            role: fbUser.email === 'gaskiakangipan@gmail.com' ? 'superadmin' : 'instructor',
            organizationId: 'org-sman1',
            organizationName: 'SMA Negeri 1 Nusantara [DATA DEMO]',
            jobTitle: 'Instruktur & Pengelola Asesmen',
            groupIds: ['grp-xii-mipa1'],
            avatarUrl: fbUser.photoURL || undefined,
            status: 'active',
            notificationEmail: true,
            notificationInApp: true,
            privacyShowScoreToGroup: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setCurrentUserId(newProfile.uid);
          syncUserProfileToFirestore(newProfile, true).catch(() => {});
          return [newProfile, ...prev];
        });
      }
    });
    return () => unsub();
  }, []);

  const currentUser = useMemo(() => {
    return users.find((u) => u.uid === currentUserId) || SEED_USERS[0];
  }, [users, currentUserId]);

  const recordAudit = (
    action: string,
    targetType: AuditLogEntry['targetType'],
    targetId: string,
    detail: string
  ) => {
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      organizationId: currentUser.organizationId,
      action,
      targetType,
      targetId,
      detail,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const switchRoleDemo = (role: UserRole) => {
    const targetUser = users.find((u) => u.role === role) || SEED_USERS[0];
    setCurrentUserId(targetUser.uid);
    setIsAuthenticated(true);
    addToast(
      'success',
      `Beralih Peran ke ${
        role === 'superadmin'
          ? 'Superadmin'
          : role === 'org_admin'
          ? 'Admin Organisasi'
          : role === 'instructor'
          ? 'Instruktur'
          : 'Peserta'
      }`,
      `Aktif sebagai ${targetUser.fullName} (${targetUser.organizationName})`
    );
  };

  const loginWithCredentials = (email: string, role?: UserRole) => {
    const matched =
      users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ||
      (role ? users.find((u) => u.role === role) : undefined) ||
      SEED_USERS[0];
    setCurrentUserId(matched.uid);
    setIsAuthenticated(true);
    recordAudit('USER_LOGIN', 'user', matched.uid, `Pengguna ${matched.fullName} berhasil masuk.`);
    addToast('success', 'Berhasil Masuk', `Selamat datang kembali, ${matched.fullName}.`);
  };

  const loginWithGoogle = async () => {
    try {
      const fbUser = await signInWithGooglePopup();
      addToast('success', 'Autentikasi Google Berhasil', `Masuk sebagai ${fbUser.displayName || fbUser.email}`);
    } catch (err: any) {
      addToast('warning', 'Mode Demo Aktif', 'Popup Google ditutup atau dibatasi di pratinjau; masuk menggunakan akun Instruktur Demo.');
      setIsAuthenticated(true);
    }
  };

  const logout = async () => {
    try {
      await signOutFirebase();
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    addToast('success', 'Sesi Berakhir', 'Anda telah keluar dari akun ASKIA.');
  };

  const updateCurrentUserProfile = (patch: Partial<UserProfile>) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === currentUser.uid
          ? { ...u, ...patch, updatedAt: new Date().toISOString() }
          : u
      )
    );
    const updated = { ...currentUser, ...patch, updatedAt: new Date().toISOString() };
    syncUserProfileToFirestore(updated, false).catch(() => {});
    recordAudit('PROFILE_UPDATED', 'user', currentUser.uid, 'Memperbarui profil dan preferensi akun.');
    addToast('success', 'Profil Diperbarui', 'Perubahan informasi akun berhasil disimpan.');
  };

  const saveAssessment = (incoming: Assessment, publish = false): Assessment => {
    const now = new Date().toISOString();
    const isExisting = assessments.some((a) => a.id === incoming.id);
    const snapshotQuestions = questions.filter((q) => incoming.questionIds.includes(q.id));

    const finalAssessment: Assessment = {
      ...incoming,
      status: publish ? 'ready' : incoming.status,
      version: isExisting ? incoming.version + (publish ? 1 : 0) : 1,
      questionSnapshots: publish ? snapshotQuestions : incoming.questionSnapshots,
      updatedAt: now,
    };

    setAssessments((prev) => {
      if (isExisting) {
        return prev.map((a) => (a.id === finalAssessment.id ? finalAssessment : a));
      }
      return [finalAssessment, ...prev];
    });

    if (finalAssessment.pairedAssessmentId) {
      const existingPair = assessmentPairs.find(
        (p) =>
          p.pretestAssessmentId === finalAssessment.id ||
          p.posttestAssessmentId === finalAssessment.id ||
          p.pretestAssessmentId === finalAssessment.pairedAssessmentId ||
          p.posttestAssessmentId === finalAssessment.pairedAssessmentId
      );
      if (!existingPair) {
        const preId =
          finalAssessment.assessmentType === 'posttest'
            ? finalAssessment.pairedAssessmentId
            : finalAssessment.id;
        const postId =
          finalAssessment.assessmentType === 'posttest'
            ? finalAssessment.id
            : finalAssessment.pairedAssessmentId;
        setAssessmentPairs((prev) => [
          {
            id: `pair-${Date.now()}`,
            title: `Pasangan Evaluasi: ${finalAssessment.title}`,
            organizationId: finalAssessment.organizationId,
            programName: finalAssessment.subject,
            pretestAssessmentId: preId,
            posttestAssessmentId: postId,
            createdAt: now,
          },
          ...prev,
        ]);
      }
    }

    syncAssessmentToFirestore(finalAssessment).catch(() => {});
    recordAudit(
      publish ? 'ASSESSMENT_PUBLISHED' : isExisting ? 'ASSESSMENT_UPDATED' : 'ASSESSMENT_CREATED',
      'assessment',
      finalAssessment.id,
      `${publish ? 'Menerbitkan' : 'Menyimpan'} kegiatan "${finalAssessment.title}" (Versi ${finalAssessment.version}).`
    );
    addToast(
      'success',
      publish ? 'Kegiatan Berhasil Diterbitkan' : 'Kegiatan Disimpan',
      `"${finalAssessment.title}" siap dikelola.`
    );
    return finalAssessment;
  };

  const duplicateAssessment = (assessmentId: string): Assessment | null => {
    const source = assessments.find((a) => a.id === assessmentId);
    if (!source) return null;
    const now = new Date().toISOString();
    const copy: Assessment = {
      ...source,
      id: `asm-copy-${Date.now()}`,
      title: `${source.title} (Salinan)`,
      status: 'draft',
      version: 1,
      accessCode: `${source.accessCode.slice(0, 6)}-${Math.floor(10 + Math.random() * 89)}`,
      createdAt: now,
      updatedAt: now,
    };
    setAssessments((prev) => [copy, ...prev]);
    recordAudit('ASSESSMENT_DUPLICATED', 'assessment', copy.id, `Menduplikasi kegiatan dari "${source.title}".`);
    addToast('success', 'Kegiatan Diduplikasi', `Salinan draf "${copy.title}" berhasil dibuat.`);
    return copy;
  };

  const archiveAssessment = (assessmentId: string) => {
    setAssessments((prev) =>
      prev.map((a) =>
        a.id === assessmentId ? { ...a, status: 'archived', updatedAt: new Date().toISOString() } : a
      )
    );
    recordAudit('ASSESSMENT_ARCHIVED', 'assessment', assessmentId, 'Mengarsipkan kegiatan asesmen.');
    addToast('warning', 'Kegiatan Diarsipkan', 'Kegiatan dipindahkan ke tab Diarsipkan.');
  };

  const restoreAssessment = (assessmentId: string) => {
    setAssessments((prev) =>
      prev.map((a) =>
        a.id === assessmentId ? { ...a, status: 'draft', updatedAt: new Date().toISOString() } : a
      )
    );
    recordAudit('ASSESSMENT_RESTORED', 'assessment', assessmentId, 'Memulihkan kegiatan dari arsip ke status Draf.');
    addToast('success', 'Kegiatan Dipulihkan', 'Kegiatan telah dikembalikan ke daftar aktif.');
  };

  const deleteAssessment = (assessmentId: string) => {
    const target = assessments.find((a) => a.id === assessmentId);
    setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
    recordAudit('ASSESSMENT_DELETED', 'assessment', assessmentId, `Menghapus kegiatan "${target?.title || assessmentId}".`);
    addToast('success', 'Kegiatan Dihapus', 'Data kegiatan telah dihapus secara permanen.');
  };

  const saveQuestion = (question: Question): Question => {
    const now = new Date().toISOString();
    const isExisting = questions.some((q) => q.id === question.id);
    const isDraftFlag = Boolean(question.isDraft || question.status === 'draft');
    const normalizedTags = getEffectiveQuestionTags(question);
    const updated: Question = {
      ...question,
      tags: normalizedTags,
      isDraft: isDraftFlag,
      status: isDraftFlag ? 'draft' : 'published',
      updatedAt: now,
    };
    setQuestions((prev) =>
      isExisting ? prev.map((q) => (q.id === updated.id ? updated : q)) : [updated, ...prev]
    );
    syncQuestionToFirestore(updated).catch(() => {});
    recordAudit(
      isExisting ? 'QUESTION_UPDATED' : 'QUESTION_CREATED',
      'question',
      updated.id,
      `${isExisting ? 'Memperbarui' : 'Menambahkan'} butir soal kategori ${updated.category} (${
        isDraftFlag ? 'Status: Draf' : 'Status: Dipublikasikan'
      }).`
    );
    if (isDraftFlag) {
      addToast(
        'warning',
        'Disimpan sebagai Draf (Save as Draft)',
        `Soal "${updated.prompt.slice(0, 48)}..." disimpan sebagai draf dan belum dipublikasikan ke Bank Soal aktif.`
      );
    } else {
      addToast(
        'success',
        'Butir Soal Dipublikasikan ke Bank Soal',
        `Soal "${updated.prompt.slice(0, 48)}..." telah aktif di Bank Soal.`
      );
    }
    return updated;
  };

  const toggleQuestionDraftStatus = (questionId: string) => {
    const target = questions.find((q) => q.id === questionId);
    if (!target) return;
    const currentlyDraft = Boolean(target.isDraft || target.status === 'draft');
    const nextDraft = !currentlyDraft;
    const now = new Date().toISOString();
    const updated: Question = {
      ...target,
      isDraft: nextDraft,
      status: nextDraft ? 'draft' : 'published',
      updatedAt: now,
    };
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
    syncQuestionToFirestore(updated).catch(() => {});
    addToast(
      nextDraft ? 'warning' : 'success',
      nextDraft ? 'Soal Diubah ke Status Draf' : 'Soal Dipublikasikan ke Bank Aktif',
      nextDraft
        ? 'Butir soal kini berstatus draf (work-in-progress).'
        : 'Butir soal kini aktif dan siap digunakan pada kegiatan asesmen.'
    );
  };

  const duplicateQuestion = (questionId: string): Question | null => {
    const source = questions.find((q) => q.id === questionId);
    if (!source) return null;
    const now = new Date().toISOString();
    const copy: Question = {
      ...source,
      id: `q-copy-${Date.now()}`,
      prompt: `${source.prompt} (Variasi)`,
      createdAt: now,
      updatedAt: now,
    };
    setQuestions((prev) => [copy, ...prev]);
    addToast('success', 'Soal Diduplikasi', 'Variasi butir soal baru berhasil ditambahkan.');
    return copy;
  };

  const archiveQuestion = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, isArchived: !q.isArchived } : q))
    );
    addToast('warning', 'Status Arsip Soal Diperbarui', 'Butir soal telah diperbarui.');
  };

  const importQuestionsBatch = (items: Partial<Question>[]) => {
    const errors: string[] = [];
    let imported = 0;
    let duplicates = 0;
    const newQuestions: Question[] = [];
    const now = new Date().toISOString();

    items.forEach((item, idx) => {
      if (!item.prompt || item.prompt.trim().length < 5) {
        errors.push(`Baris ${idx + 1}: Pertanyaan kosong atau terlalu pendek (< 5 karakter).`);
        return;
      }
      const isDup = questions.some(
        (q) => q.prompt.trim().toLowerCase() === item.prompt!.trim().toLowerCase()
      );
      if (isDup) {
        duplicates++;
      }
      const qType: QuestionType = item.questionType || 'single_choice';
      const defaultOptions =
        qType === 'true_false'
          ? [
              { id: `opt-${idx}-true`, label: 'Benar', text: 'Pernyataan Benar' },
              { id: `opt-${idx}-false`, label: 'Salah', text: 'Pernyataan Salah' },
            ]
          : [
              { id: `opt-${idx}-a`, label: 'A', text: 'Pilihan A' },
              { id: `opt-${idx}-b`, label: 'B', text: 'Pilihan B' },
              { id: `opt-${idx}-c`, label: 'C', text: 'Pilihan C' },
              { id: `opt-${idx}-d`, label: 'D', text: 'Pilihan D' },
            ];

      const qObj: Question = {
        id: `q-imp-${Date.now()}-${idx}`,
        ownerId: currentUser.uid,
        authorName: currentUser.fullName,
        organizationId: currentUser.organizationId,
        prompt: item.prompt.trim(),
        questionType: qType,
        complexScoringRule: item.complexScoringRule,
        options: item.options || defaultOptions,
        correctOptionIds:
          item.correctOptionIds ||
          (qType === 'true_false' ? [`opt-${idx}-true`] : [`opt-${idx}-a`]),
        correctShortAnswers: item.correctShortAnswers,
        caseSensitive: item.caseSensitive,
        correctNumericValue: item.correctNumericValue,
        numericTolerance: item.numericTolerance,
        matchingPairs: item.matchingPairs,
        correctOrder: item.correctOrder,
        rubric: item.rubric,
        stimulusText: item.stimulusText,
        stimulusTable: item.stimulusTable,
        svgDiagramType: item.svgDiagramType,
        points: item.points && item.points > 0 ? item.points : 10,
        explanation: item.explanation || 'Pembahasan standar butir soal.',
        category: item.category || 'Umum',
        topic: item.topic || 'Evaluasi',
        tags: getEffectiveQuestionTags({
          tags: item.tags,
          topic: item.topic || 'Evaluasi',
          category: item.category || 'Umum',
        }),
        difficulty: item.difficulty || 'sedang',
        educationLevel: item.educationLevel || 'SMA/SMK/MA',
        createdAt: now,
        updatedAt: now,
      };
      newQuestions.push(qObj);
      imported++;
    });

    if (newQuestions.length > 0) {
      setQuestions((prev) => [...newQuestions, ...prev]);
      newQuestions.forEach((q) => syncQuestionToFirestore(q).catch(() => {}));
      recordAudit('QUESTIONS_IMPORTED', 'question', 'batch-import', `Mengimpor ${imported} butir soal ke bank soal.`);
    }

    return {
      imported,
      errors,
      duplicates,
      importedIds: newQuestions.map((q) => q.id),
    };
  };

  const startOrResumeAttempt = (assessmentId: string): AssessmentAttempt => {
    const assessment = assessments.find((a) => a.id === assessmentId) || assessments[0];
    const existingInProgress = attempts.find(
      (att) =>
        att.assessmentId === assessment.id &&
        att.participantId === currentUser.uid &&
        att.status === 'in_progress'
    );
    if (existingInProgress) {
      return existingInProgress;
    }

    const previousCount = attempts.filter(
      (att) => att.assessmentId === assessment.id && att.participantId === currentUser.uid
    ).length;

    const now = new Date().toISOString();
    const userGroup =
      groups.find((g) => g.memberIds.includes(currentUser.uid))?.name ||
      'Kelompok Peserta Umum';

    const newAttempt: AssessmentAttempt = {
      id: `att-${Date.now()}`,
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      assessmentVersion: assessment.version,
      assessmentType: assessment.assessmentType,
      organizationId: assessment.organizationId,
      participantId: currentUser.uid,
      participantName: currentUser.fullName,
      participantCode: currentUser.participantCode || `PST-${currentUser.uid.slice(-4).toUpperCase()}`,
      groupName: userGroup,
      status: 'in_progress',
      startedAt: now,
      remainingSeconds: assessment.durationMinutes * 60,
      answers: {},
      manualGrades: {},
      objectiveScore: 0,
      essayScore: 0,
      maxPossiblePoints: 100,
      finalScore: 0,
      isProvisional: false,
      passed: false,
      attemptNumber: previousCount + 1,
      integrityEvents: [
        { timestamp: now, type: 'started', detail: 'Peserta memulai sesi pengerjaan ujian.' },
      ],
      createdAt: now,
      updatedAt: now,
    };

    setAttempts((prev) => [newAttempt, ...prev]);
    syncAttemptToFirestore(newAttempt, true).catch(() => {});
    recordAudit('EXAM_ATTEMPT_STARTED', 'attempt', newAttempt.id, `Memulai sesi ujian "${assessment.title}".`);
    return newAttempt;
  };

  const saveAttemptAnswer = (
    attemptId: string,
    answer: AttemptAnswer,
    remainingSeconds?: number
  ) => {
    const now = new Date().toISOString();
    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id !== attemptId || att.status !== 'in_progress') return att;
        return {
          ...att,
          remainingSeconds: remainingSeconds ?? att.remainingSeconds,
          answers: {
            ...att.answers,
            [answer.questionId]: {
              ...answer,
              savedAt: now,
            },
          },
          updatedAt: now,
        };
      })
    );
  };

  const logAttemptIntegrityEvent = (
    attemptId: string,
    type: 'tab_switch' | 'fullscreen_exit' | 'connection_restored',
    detail: string
  ) => {
    const now = new Date().toISOString();
    setAttempts((prev) =>
      prev.map((att) => {
        if (att.id !== attemptId) return att;
        return {
          ...att,
          integrityEvents: [...att.integrityEvents, { timestamp: now, type, detail }],
          updatedAt: now,
        };
      })
    );
  };

  const submitAttempt = (attemptId: string): AssessmentAttempt | null => {
    const target = attempts.find((a) => a.id === attemptId);
    if (!target) return null;
    if (target.status === 'submitted' || target.status === 'graded') {
      return target; // Prevent duplicate submission
    }

    const assessment = assessments.find((a) => a.id === target.assessmentId);
    const examQuestions =
      assessment?.questionSnapshots && assessment.questionSnapshots.length > 0
        ? assessment.questionSnapshots
        : questions.filter((q) => assessment?.questionIds.includes(q.id));

    const scoreSummary = calculateAttemptScore(
      examQuestions,
      target.answers,
      target.manualGrades
    );

    const now = new Date().toISOString();
    const updatedAttempt: AssessmentAttempt = {
      ...target,
      status: scoreSummary.isProvisional ? 'submitted' : 'graded',
      submittedAt: now,
      objectiveScore: scoreSummary.objectivePoints,
      essayScore: scoreSummary.essayPoints,
      maxPossiblePoints: scoreSummary.maxPossiblePoints,
      finalScore: scoreSummary.finalScoreNormalized,
      isProvisional: scoreSummary.isProvisional,
      passed: scoreSummary.finalScoreNormalized >= (assessment?.passingScore ?? 70),
      integrityEvents: [
        ...target.integrityEvents,
        { timestamp: now, type: 'submitted', detail: 'Peserta mengumpulkan seluruh jawaban ujian.' },
      ],
      updatedAt: now,
    };

    setAttempts((prev) => prev.map((a) => (a.id === attemptId ? updatedAttempt : a)));
    syncAttemptToFirestore(updatedAttempt, false).catch(() => {});
    recordAudit(
      'EXAM_ATTEMPT_SUBMITTED',
      'attempt',
      attemptId,
      `Mengumpulkan ujian "${target.assessmentTitle}" — Skor: ${updatedAttempt.finalScore}/100 (${
        updatedAttempt.isProvisional ? 'Nilai Sementara - Menunggu Esai' : 'Final'
      }).`
    );
    addToast(
      'success',
      'Ujian Berhasil Dikumpulkan',
      `Skor ${updatedAttempt.isProvisional ? 'sementara' : 'akhir'} Anda: ${updatedAttempt.finalScore}/100.`
    );
    return updatedAttempt;
  };

  const saveManualEssayGrade = (
    attemptId: string,
    questionId: string,
    awardedPoints: number,
    feedback: string
  ) => {
    const target = attempts.find((a) => a.id === attemptId);
    if (!target) return;
    const assessment = assessments.find((a) => a.id === target.assessmentId);
    const examQuestions =
      assessment?.questionSnapshots && assessment.questionSnapshots.length > 0
        ? assessment.questionSnapshots
        : questions.filter((q) => assessment?.questionIds.includes(q.id));

    const now = new Date().toISOString();
    const newManualGrades: Record<string, ManualGradeRecord> = {
      ...target.manualGrades,
      [questionId]: {
        questionId,
        awardedPoints,
        feedback,
        gradedBy: currentUser.fullName,
        gradedAt: now,
      },
    };

    const scoreSummary = calculateAttemptScore(
      examQuestions,
      target.answers,
      newManualGrades
    );

    const updatedAttempt: AssessmentAttempt = {
      ...target,
      manualGrades: newManualGrades,
      objectiveScore: scoreSummary.objectivePoints,
      essayScore: scoreSummary.essayPoints,
      maxPossiblePoints: scoreSummary.maxPossiblePoints,
      finalScore: scoreSummary.finalScoreNormalized,
      isProvisional: scoreSummary.isProvisional,
      status: scoreSummary.isProvisional ? 'submitted' : 'graded',
      passed: scoreSummary.finalScoreNormalized >= (assessment?.passingScore ?? 70),
      updatedAt: now,
    };

    setAttempts((prev) => prev.map((a) => (a.id === attemptId ? updatedAttempt : a)));
    recordAudit(
      'MANUAL_GRADE_SAVED',
      'attempt',
      attemptId,
      `Menilai esai peserta ${target.participantName} (Skor baru: ${updatedAttempt.finalScore}/100).`
    );
    addToast(
      'success',
      'Penilaian Esai Disimpan',
      `Nilai akhir ${target.participantName} diperbarui menjadi ${updatedAttempt.finalScore}/100.`
    );
  };

  const forceFinishAttemptByAdmin = (attemptId: string, reason: string) => {
    submitAttempt(attemptId);
    recordAudit(
      'COMMAND_CENTER_FORCE_SUBMIT',
      'attempt',
      attemptId,
      `Administrator menghentikan/mengumpulkan sesi peserta secara paksa. Alasan: ${reason}`
    );
  };

  const extendAttemptTimeByAdmin = (attemptId: string, extraMinutes: number) => {
    setAttempts((prev) =>
      prev.map((a) =>
        a.id === attemptId
          ? { ...a, remainingSeconds: a.remainingSeconds + extraMinutes * 60 }
          : a
      )
    );
    recordAudit(
      'COMMAND_CENTER_EXTEND_TIME',
      'attempt',
      attemptId,
      `Menambahkan waktu pengerjaan peserta sebanyak ${extraMinutes} menit.`
    );
    addToast('success', 'Waktu Ditambahkan', `Durasi peserta ditambah ${extraMinutes} menit.`);
  };

  const addParticipantUser = (data: {
    fullName: string;
    email: string;
    participantCode: string;
    groupId: string;
    organizationId: string;
  }): UserProfile => {
    const org = organizations.find((o) => o.id === data.organizationId) || organizations[0];
    const now = new Date().toISOString();
    const newUser: UserProfile = {
      uid: `user-part-${Date.now()}`,
      fullName: data.fullName,
      email: data.email,
      emailVerified: true,
      role: 'participant',
      organizationId: org.id,
      organizationName: org.name,
      jobTitle: 'Peserta Asesmen',
      participantCode: data.participantCode,
      groupIds: data.groupId ? [data.groupId] : [],
      status: 'active',
      notificationEmail: true,
      notificationInApp: true,
      privacyShowScoreToGroup: false,
      createdAt: now,
      updatedAt: now,
    };

    setUsers((prev) => [newUser, ...prev]);
    if (data.groupId) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === data.groupId ? { ...g, memberIds: [...g.memberIds, newUser.uid] } : g
        )
      );
    }
    recordAudit('PARTICIPANT_ADDED', 'user', newUser.uid, `Menambahkan peserta baru ${newUser.fullName} (${newUser.participantCode}).`);
    addToast('success', 'Peserta Ditambahkan', `${newUser.fullName} berhasil terdaftar.`);
    return newUser;
  };

  const createGroup = (data: {
    name: string;
    code: string;
    level: ParticipantGroup['level'];
    description: string;
    organizationId: string;
  }): ParticipantGroup => {
    const newGrp: ParticipantGroup = {
      id: `grp-${Date.now()}`,
      name: data.name,
      code: data.code,
      organizationId: data.organizationId,
      level: data.level,
      description: data.description,
      memberIds: [],
      instructorId: currentUser.uid,
      createdAt: new Date().toISOString(),
    };
    setGroups((prev) => [newGrp, ...prev]);
    recordAudit('GROUP_CREATED', 'organization', newGrp.id, `Membuat kelompok/kelas baru "${newGrp.name}".`);
    addToast('success', 'Kelompok Dibuat', `Kelompok "${newGrp.name}" siap digunakan.`);
    return newGrp;
  };

  const toggleUserStatus = (uid: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === uid
          ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' }
          : u
      )
    );
    recordAudit('USER_STATUS_TOGGLED', 'user', uid, `Mengubah status aktif akun pengguna ${uid}.`);
    addToast('success', 'Status Akun Diperbarui', 'Perubahan hak akses pengguna telah disimpan.');
  };

  const updateUserRoleByAdmin = (uid: string, role: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
    recordAudit('USER_ROLE_CHANGED', 'user', uid, `Mengubah peran pengguna ${uid} menjadi ${role}.`);
    addToast('success', 'Peran Pengguna Diubah', `Peran berhasil diperbarui menjadi ${role}.`);
  };

  const createOrganizationByAdmin = (data: {
    name: string;
    code: string;
    sector: Organization['sector'];
    address: string;
  }) => {
    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: data.name,
      code: data.code,
      sector: data.sector,
      address: data.address,
      memberCount: 1,
      activeAssessmentCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setOrganizations((prev) => [newOrg, ...prev]);
    recordAudit('ORGANIZATION_CREATED', 'organization', newOrg.id, `Menambahkan organisasi baru "${newOrg.name}".`);
    addToast('success', 'Organisasi Ditambahkan', `${newOrg.name} berhasil didaftarkan.`);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        authReady,
        organizations,
        users,
        groups,
        questions,
        assessments,
        assessmentPairs,
        attempts,
        auditLogs,
        notifications,
        toasts,
        globalSearch,
        setGlobalSearch,
        addToast,
        dismissToast,
        switchRoleDemo,
        loginWithCredentials,
        loginWithGoogle,
        logout,
        updateCurrentUserProfile,
        saveAssessment,
        duplicateAssessment,
        archiveAssessment,
        restoreAssessment,
        deleteAssessment,
        saveQuestion,
        toggleQuestionDraftStatus,
        duplicateQuestion,
        archiveQuestion,
        importQuestionsBatch,
        startOrResumeAttempt,
        saveAttemptAnswer,
        logAttemptIntegrityEvent,
        submitAttempt,
        saveManualEssayGrade,
        forceFinishAttemptByAdmin,
        extendAttemptTimeByAdmin,
        addParticipantUser,
        createGroup,
        toggleUserStatus,
        updateUserRoleByAdmin,
        createOrganizationByAdmin,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
