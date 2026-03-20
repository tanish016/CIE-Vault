import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import LandingPage from "./app_components/landing-page";
import { LoginForm } from "./app_components/login-form";
import { RegisterForm } from "./app_components/register-form";
import { StudentDashboard } from "./app_components/student/student-dashboard";
import { MentorDashboard } from "./app_components/mentor/mentor-dashboard";
import Profile from "./app_components/profile";
import PublicPage from "./app_components/public";
import { useAuth } from "./context/auth-context";

function GuestOnlyRoute({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <GuestOnlyRoute>
            <LoginForm />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnlyRoute>
            <RegisterForm />
          </GuestOnlyRoute>
        }
      />
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/mentor" element={<MentorDashboard />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/public" element={<PublicPage />} />
    </Routes>
  )
}

export default App
