import { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./components/home";

// Auth components
import SignIn from "./components/auth/SignIn";
import ForgotPassword from "./components/auth/ForgotPassword";
import AuthGuard from "./components/auth/AuthGuard";
import AuthCallback from "./components/auth/AuthCallback";
import AuthLinkWrapper from "./components/auth/AuthLinkWrapper";

// Other components
import TeamAccess from "./components/team/TeamAccess";
import ModelsPage from "./components/models/ModelsPage";
import GroupManagement from "./components/group/GroupManagement";
import GroupsPage from "./components/group/GroupsPage";
import { DatabaseProvider } from "./contexts/DatabaseContext";
import { GroupProvider } from "./contexts/GroupContext";
import ThemeProvider, { useTheme } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import SettingsPage from "./components/settings/SettingsPage";
import SharedLinksPage from "./components/settings/SharedLinksPage";
import SharedGroupView from "./components/shared/SharedGroupView";
import SharedModelView from "./components/shared/SharedModelView";
import TestEmailPage from "./components/testing/TestEmailPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import LoadingScreen from "./components/LoadingScreen";

function RootRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const type = params.get('type');
  const token = params.get('token') || params.get('token_hash');
  const code = params.get('code');
  
  // Log the redirect parameters
  console.log('RootRedirect:', {
    type,
    hasToken: !!token,
    hasCode: !!code,
    currentPath: location.pathname,
    searchParams: Object.fromEntries(params.entries())
  });

  // Handle recovery flow with code
  if (code) {
    console.log('Detected auth code, redirecting to callback...');
    return <Navigate to={`/auth/callback${location.search}`} replace />;
  }

  // Handle different token types
  if (type === 'recovery' && token) {
    console.log('Redirecting to password reset...');
    return <Navigate to={`/auth/callback${location.search}`} replace />;
  }

  if (type === 'email' && token) {
    console.log('Redirecting to email verification...');
    return <Navigate to={`/auth/callback${location.search}`} replace />;
  }

  // Default to dashboard only if no auth parameters are present
  if (!type && !token && !code) {
    console.log('No auth params, redirecting to dashboard...');
    return <Navigate to="/dashboard" replace />;
  }

  // If we reach here, redirect to auth callback to handle any other auth scenarios
  console.log('Handling other auth scenario...');
  return <Navigate to={`/auth/callback${location.search}`} replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { font } = useTheme();
  return (
    <AuthProvider>
      <DatabaseProvider>
        <GroupProvider>
        <Suspense fallback={<LoadingScreen />}>
          <div className={`min-h-screen pb-16 md:pb-0 bg-background text-foreground antialiased font-${font}`}>
           
            <Routes>
              {/* Auth routes - must be before protected routes */}
              <Route path="/signin" element={<SignIn />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/v1/verify" element={<AuthLinkWrapper />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/reset" element={<AuthLinkWrapper />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <AuthGuard>
                    <DatabaseProvider>
                      <Home />
                    </DatabaseProvider>
                  </AuthGuard>
                }
              />
              <Route
                path="/team"
                element={
                  <AuthGuard>
                    <TeamAccess
                      currentRole={
                        localStorage.getItem("userRole") as
                          | "Admin"
                          | "Manager"
                          | "User"
                      }
                    />
                  </AuthGuard>
                }
              />
              <Route
                path="/groups"
                element={
                  <AuthGuard>
                    <DatabaseProvider>
                      <GroupProvider>
                        <GroupsPage />
                      </GroupProvider>
                    </DatabaseProvider>
                  </AuthGuard>
                }
              />
              <Route
                path="/group/:id"
                element={
                  <AuthGuard>
                    <DatabaseProvider>
                      <GroupProvider>
                        <GroupManagement />
                      </GroupProvider>
                    </DatabaseProvider>
                  </AuthGuard>
                }
              />
              <Route
                path="/models"
                element={
                  <AuthGuard>
                    <ModelsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <AuthGuard>
                    <SettingsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/shared-links"
                element={
                  <AuthGuard>
                    <SharedLinksPage />
                  </AuthGuard>
                }
              />
              <Route path="/share/group/:groupId" element={<SharedGroupView />} />
              <Route path="/share/model/:id" element={<SharedModelView />} />
              <Route path="/test-email" element={<TestEmailPage />} />

              {/* Root route handler */}
              <Route path="/" element={<RootRedirect />} />
            </Routes>
          </div>
          <Toaster />
        </Suspense>
        </GroupProvider>
      </DatabaseProvider>
    </AuthProvider>
  );
}

export default App;
