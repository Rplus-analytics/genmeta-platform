import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import Website from './site/Website.jsx';
import Login from './site/Login.jsx';
import AppShell from './app/AppShell.jsx';

/* /          public website (SaaS landing page)
   /login     sign-in
   /app/*     the signed-in GenMeta platform */
export default function App() {
  return (
    <AuthProvider>
      <div className="room">
        <div className="frame">
          <Routes>
            <Route path="/" element={<Website />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app/*" element={<AppShell />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}
