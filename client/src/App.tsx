import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.js";
import { LoginPage } from "./auth/LoginPage.js";
import { RegisterPage } from "./auth/RegisterPage.js";
import { RoomListPage } from "./rooms/RoomListPage.js";
import { RoomPage } from "./rooms/RoomPage.js";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <RoomListPage />
          </RequireAuth>
        }
      />
      {/* Room pages are reachable by anyone with the link — guests join without an account,
          per docs/02-requirements.md FR-3. Authorization for mutating the room happens
          server-side regardless of whether the visitor is logged in. */}
      <Route path="/room/:joinCode" element={<RoomPage />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
