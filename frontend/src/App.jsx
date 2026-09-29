import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import AvailableExams from './pages/student/AvailableExams';
import TakeExam from './pages/student/TakeExam';
import ResultPage from './pages/student/ResultPage';
import MyResults from './pages/student/MyResults';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ExamList from './pages/admin/ExamList';
import CreateEditExam from './pages/admin/CreateEditExam';
import ManageQuestions from './pages/admin/ManageQuestions';
import StudentList from './pages/admin/StudentList';
import TeacherList from './pages/admin/TeacherList';
import AcademicStructure from './pages/admin/AcademicStructure';
import ResultsList from './pages/admin/ResultsList';
import Analytics from './pages/admin/Analytics';
import LiveProctorDashboard from './pages/admin/LiveProctorDashboard';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
            <Route element={<Layout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/exams" element={<AvailableExams />} />
              <Route path="/student/result/:id" element={<ResultPage />} />
              <Route path="/student/results" element={<MyResults />} />
            </Route>
            {/* TakeExam rendered without sidebar layout for focused exam environment */}
            <Route path="/student/take-exam/:examId" element={<TakeExam />} />
          </Route>

          {/* Protected Admin Only Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route element={<Layout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/students" element={<StudentList />} />
              <Route path="/admin/teachers" element={<TeacherList />} />
              <Route path="/admin/academics" element={<AcademicStructure />} />
              <Route path="/admin/analytics" element={<Analytics />} />
            </Route>
          </Route>

          {/* Protected Instructor Routes (Admin & Teacher) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
            <Route element={<Layout />}>
              <Route path="/admin/exams" element={<ExamList />} />
              <Route path="/admin/create-exam" element={<CreateEditExam />} />
              <Route path="/admin/edit-exam/:id" element={<CreateEditExam />} />
              <Route path="/admin/exams/:examId/questions" element={<ManageQuestions />} />
              <Route path="/admin/results" element={<ResultsList />} />
              <Route path="/admin/proctor" element={<LiveProctorDashboard />} />
            </Route>
          </Route>

          {/* Protected Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']} />}>
            <Route element={<Layout />}>
              <Route path="/teacher/dashboard" element={<AdminDashboard />} />
              <Route path="/teacher/proctor" element={<LiveProctorDashboard />} />
            </Route>
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
