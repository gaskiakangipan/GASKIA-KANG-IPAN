export type UserRole = 'superadmin' | 'org_admin' | 'instructor' | 'participant';

export type EducationLevel =
  | 'PAUD/TK'
  | 'SD/MI'
  | 'SMP/MTs'
  | 'SMA/SMK/MA'
  | 'Perguruan Tinggi'
  | 'Kursus & Pelatihan'
  | 'Instansi Pemerintah'
  | 'Perusahaan & Korporasi'
  | 'Organisasi & Umum';

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'numeric'
  | 'matching'
  | 'ordering'
  | 'essay'
  | 'image_question'
  | 'stimulus_case';

export type DifficultyLevel = 'mudah' | 'sedang' | 'sulit';

export type AssessmentType =
  | 'pretest'
  | 'posttest'
  | 'paired'
  | 'single'
  | 'quiz'
  | 'periodic';

export type AssessmentStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'ongoing'
  | 'completed'
  | 'archived';

export interface Organization {
  id: string;
  name: string;
  code: string;
  sector: EducationLevel;
  address: string;
  memberCount: number;
  activeAssessmentCount: number;
  status: 'active' | 'suspended';
  isDemo?: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  jobTitle: string;
  participantCode?: string;
  groupIds: string[];
  avatarUrl?: string;
  status: 'active' | 'suspended';
  notificationEmail: boolean;
  notificationInApp: boolean;
  privacyShowScoreToGroup: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantGroup {
  id: string;
  name: string;
  code: string;
  organizationId: string;
  level: EducationLevel;
  description: string;
  memberIds: string[];
  instructorId: string;
  createdAt: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
}

export interface MatchingPair {
  id: string;
  leftText: string;
  rightText: string;
}

export interface GradingRubricCriterion {
  id: string;
  criterion: string;
  maxPoints: number;
  description: string;
}

export interface Question {
  id: string;
  ownerId: string;
  authorName: string;
  organizationId: string;
  prompt: string;
  stimulusText?: string;
  stimulusTable?: {
    headers: string[];
    rows: string[][];
  };
  svgDiagramType?: 'cell_biology' | 'network_topology' | 'physics_circuit' | 'data_chart';
  questionType: QuestionType;
  options?: QuestionOption[];
  correctOptionIds?: string[]; // For single_choice, multiple_choice, true_false, image_question, stimulus_case
  complexScoringRule?: 'all_or_nothing' | 'partial_credit';
  correctShortAnswers?: string[]; // Normalized acceptable strings
  caseSensitive?: boolean;
  correctNumericValue?: number;
  numericTolerance?: number;
  matchingPairs?: MatchingPair[];
  correctOrder?: string[]; // Ordered item strings
  rubric?: GradingRubricCriterion[];
  points: number;
  explanation: string;
  category: string;
  topic: string;
  tags?: string[];
  difficulty: DifficultyLevel;
  educationLevel: EducationLevel;
  reference?: string;
  status?: 'draft' | 'published';
  isDraft?: boolean;
  isArchived?: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  ownerId: string;
  authorName: string;
  organizationId: string;
  organizationName: string;
  title: string;
  description: string;
  objective: string;
  organizer: string;
  educationLevel: EducationLevel;
  subject: string;
  category: string;
  language: string;
  difficulty: DifficultyLevel;
  assessmentType: AssessmentType;
  pairedAssessmentId?: string;
  pairGroupId?: string;
  status: AssessmentStatus;
  version: number;
  questionIds: string[];
  questionSnapshots?: Question[]; // Immutable snapshot of questions when published
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  requireAllQuestions: boolean;
  assignedGroupIds: string[];
  assignedParticipantIds: string[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  maxAttempts: number;
  accessCode: string;
  examToken?: string;
  latePolicy: 'strict' | 'allow_with_deduction' | 'flexible';
  autoPublishResult: boolean;
  showExplanation: boolean;
  showCorrectAnswer: boolean;
  passingScore: number;
  requireCameraProctoring?: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentPair {
  id: string;
  title: string;
  organizationId: string;
  programName: string;
  pretestAssessmentId: string;
  posttestAssessmentId: string;
  createdAt: string;
}

export interface AttemptAnswer {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
  numericAnswer?: number;
  matchingAnswers?: Record<string, string>; // leftId -> rightText
  orderedItems?: string[];
  flaggedForReview?: boolean;
  savedAt: string;
}

export interface ManualGradeRecord {
  questionId: string;
  awardedPoints: number;
  feedback: string;
  gradedBy: string;
  gradedAt: string;
}

export interface IntegrityEvent {
  timestamp: string;
  type: 'tab_switch' | 'fullscreen_exit' | 'connection_restored' | 'started' | 'submitted';
  detail: string;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentVersion: number;
  assessmentType: AssessmentType;
  organizationId: string;
  participantId: string;
  participantName: string;
  participantCode: string;
  groupName: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'late';
  startedAt: string;
  submittedAt?: string;
  remainingSeconds: number;
  answers: Record<string, AttemptAnswer>;
  manualGrades: Record<string, ManualGradeRecord>;
  objectiveScore: number;
  essayScore: number;
  maxPossiblePoints: number;
  finalScore: number; // Normalized 0-100
  isProvisional: boolean; // True if essay questions are not yet graded
  passed: boolean;
  attemptNumber: number;
  integrityEvents: IntegrityEvent[];
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  organizationId: string;
  action: string;
  targetType: 'assessment' | 'question' | 'attempt' | 'user' | 'organization' | 'system';
  targetId: string;
  detail: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'exam' | 'grading' | 'system';
  read: boolean;
  createdAt: string;
  linkTo?: string;
}
