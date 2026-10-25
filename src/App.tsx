import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import {
  ActivitiesListPage,
  ActivityDetailPage,
  ActivityWizardPage,
} from './pages/ActivitiesPages';
import {
  QuestionBankListPage,
  QuestionEditorPage,
} from './pages/QuestionBankPages';
import { CommandCenterPage } from './pages/CommandCenterPage';
import {
  ExamResultPage,
  ExamRunnerPage,
  JoinExamPage,
} from './pages/ExamPages';
import {
  ReportsExportPage,
  ResultsAnalyticsPage,
} from './pages/AnalyticsAndReportsPages';
import {
  AdminAuditLogsPage,
  AdminOrganizationsPage,
  AdminUsersPage,
  GroupsPage,
  ParticipantsPage,
  ProfileAndSettingsPage,
} from './pages/ManagementAndAdminPages';
import { parseParticipantJoinParams } from './utils/shareAssessmentLink';

const WithShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell>{children}</AppShell>
);

const RootOrParticipantJoinGate: React.FC = () => {
  const location = useLocation();
  const parsed = parseParticipantJoinParams(
    location.search,
    location.pathname,
    typeof window !== 'undefined' ? window.location.hash : ''
  );

  if (parsed.accessCode) {
    return (
      <WithShell>
        <JoinExamPage />
      </WithShell>
    );
  }

  return (
    <WithShell>
      <DashboardPage />
    </WithShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Distraction-free Exam Runner Route */}
          <Route path="/exam/:attemptId" element={<ExamRunnerPage />} />

          {/* Main Application Routes with AppShell */}
          <Route path="/" element={<RootOrParticipantJoinGate />} />
          <Route path="/dashboard" element={<RootOrParticipantJoinGate />} />
          <Route
            path="/activities"
            element={
              <WithShell>
                <ActivitiesListPage />
              </WithShell>
            }
          />
          <Route
            path="/activities/new"
            element={
              <WithShell>
                <ActivityWizardPage />
              </WithShell>
            }
          />
          <Route
            path="/activities/:id"
            element={
              <WithShell>
                <ActivityDetailPage />
              </WithShell>
            }
          />
          <Route
            path="/activities/:id/edit"
            element={
              <WithShell>
                <ActivityWizardPage />
              </WithShell>
            }
          />
          <Route
            path="/activities/:id/command-center"
            element={
              <WithShell>
                <CommandCenterPage />
              </WithShell>
            }
          />

          <Route
            path="/question-bank"
            element={
              <WithShell>
                <QuestionBankListPage />
              </WithShell>
            }
          />
          <Route
            path="/question-bank/new"
            element={
              <WithShell>
                <QuestionEditorPage />
              </WithShell>
            }
          />
          <Route
            path="/question-bank/:id/edit"
            element={
              <WithShell>
                <QuestionEditorPage />
              </WithShell>
            }
          />

          <Route
            path="/participants"
            element={
              <WithShell>
                <ParticipantsPage />
              </WithShell>
            }
          />
          <Route
            path="/groups"
            element={
              <WithShell>
                <GroupsPage />
              </WithShell>
            }
          />

          <Route
            path="/results"
            element={
              <WithShell>
                <ResultsAnalyticsPage />
              </WithShell>
            }
          />
          <Route
            path="/results/:id"
            element={
              <WithShell>
                <ResultsAnalyticsPage />
              </WithShell>
            }
          />
          <Route
            path="/reports"
            element={
              <WithShell>
                <ReportsExportPage />
              </WithShell>
            }
          />

          <Route
            path="/profile"
            element={
              <WithShell>
                <ProfileAndSettingsPage />
              </WithShell>
            }
          />
          <Route
            path="/settings"
            element={
              <WithShell>
                <ProfileAndSettingsPage />
              </WithShell>
            }
          />

          <Route
            path="/admin/users"
            element={
              <WithShell>
                <AdminUsersPage />
              </WithShell>
            }
          />
          <Route
            path="/admin/organizations"
            element={
              <WithShell>
                <AdminOrganizationsPage />
              </WithShell>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <WithShell>
                <AdminAuditLogsPage />
              </WithShell>
            }
          />

          <Route
            path="/join"
            element={
              <WithShell>
                <JoinExamPage />
              </WithShell>
            }
          />
          <Route
            path="/join/:code"
            element={
              <WithShell>
                <JoinExamPage />
              </WithShell>
            }
          />
          <Route
            path="/exam/:attemptId/result"
            element={
              <WithShell>
                <ExamResultPage />
              </WithShell>
            }
          />

          <Route path="*" element={<RootOrParticipantJoinGate />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
