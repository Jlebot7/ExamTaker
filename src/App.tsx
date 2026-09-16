import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LandingPage } from './pages/LandingPage';
import { TeacherAuth } from './pages/TeacherAuth';
import { StudentEntry } from './pages/StudentEntry';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { ExamEditor } from './pages/ExamEditor';
import { ExamAudit } from './pages/ExamAudit';
import { StudentExam } from './pages/StudentExam';
import { ExamFinished } from './pages/ExamFinished';

// Protected Route wrapper for Teacher Area
const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role !== 'teacher') {
    return <Navigate to="/teacher/login" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/teacher/login" element={<TeacherAuth />} />
              <Route path="/student" element={<StudentEntry />} />

              {/* Teacher Protected Routes */}
              <Route
                path="/teacher"
                element={
                  <TeacherRoute>
                    <TeacherDashboard />
                  </TeacherRoute>
                }
              />
              <Route
                path="/teacher/exam/new"
                element={
                  <TeacherRoute>
                    <ExamEditor />
                  </TeacherRoute>
                }
              />
              <Route
                path="/teacher/exam/:examId/edit"
                element={
                  <TeacherRoute>
                    <ExamEditor />
                  </TeacherRoute>
                }
              />
              <Route
                path="/teacher/exam/:examId/audit"
                element={
                  <TeacherRoute>
                    <ExamAudit />
                  </TeacherRoute>
                }
              />

              {/* Student Live Evaluation Routes */}
              <Route path="/exam/:examId" element={<StudentExam />} />
              <Route path="/exam-finished/:examId" element={<ExamFinished />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
