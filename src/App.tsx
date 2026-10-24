/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StudentInfo, StudentSubmission, QuizScheduleConfig } from './types/quiz';
import { getStoredConfig } from './utils/storage';
import { StudentRegister } from './components/StudentRegister';
import { ExamRoom } from './components/ExamRoom';
import { ExamScorecard } from './components/ExamScorecard';
import { BlockedScreen } from './components/BlockedScreen';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';

type AppView = 'register' | 'exam' | 'scorecard' | 'blocked' | 'admin_login' | 'admin_dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('register');
  const [config, setConfig] = useState<QuizScheduleConfig>(getStoredConfig());
  const [activeStudent, setActiveStudent] = useState<StudentInfo | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<StudentSubmission | null>(null);
  const [previousView, setPreviousView] = useState<AppView>('register');

  const handleStartExam = (student: StudentInfo, stream: MediaStream | null) => {
    setActiveStudent(student);
    setMediaStream(stream);
    setCurrentView('exam');
  };

  const handleSubmitExam = (submission: StudentSubmission) => {
    setLatestSubmission(submission);
    setCurrentView('scorecard');
  };

  const handleBlockExam = (submission: StudentSubmission) => {
    setLatestSubmission(submission);
    setCurrentView('blocked');
  };

  const handleOpenAdmin = () => {
    setPreviousView(currentView);
    setCurrentView('admin_login');
  };

  const handleAdminLoginSuccess = () => {
    setCurrentView('admin_dashboard');
  };

  const handleAdminLogout = () => {
    setCurrentView('register');
  };

  const handleResetSession = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    setMediaStream(null);
    setActiveStudent(null);
    setLatestSubmission(null);
    setCurrentView('register');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-200">
      {currentView === 'register' && (
        <StudentRegister
          config={config}
          onStartExam={handleStartExam}
          onOpenAdmin={handleOpenAdmin}
        />
      )}

      {currentView === 'exam' && activeStudent && (
        <ExamRoom
          student={activeStudent}
          mediaStream={mediaStream}
          config={config}
          onSubmitExam={handleSubmitExam}
          onBlockExam={handleBlockExam}
        />
      )}

      {currentView === 'scorecard' && latestSubmission && (
        <ExamScorecard
          submission={latestSubmission}
          config={config}
          onRetake={handleResetSession}
          onOpenAdmin={handleOpenAdmin}
        />
      )}

      {currentView === 'blocked' && latestSubmission && (
        <BlockedScreen
          submission={latestSubmission}
          onOpenAdmin={handleOpenAdmin}
          onResetSession={handleResetSession}
        />
      )}

      {currentView === 'admin_login' && (
        <AdminLogin
          onLoginSuccess={handleAdminLoginSuccess}
          onBackToStudent={() => setCurrentView(previousView)}
        />
      )}

      {currentView === 'admin_dashboard' && (
        <AdminDashboard
          onLogout={handleAdminLogout}
          onGoToExam={() => setCurrentView('register')}
        />
      )}
    </div>
  );
}
