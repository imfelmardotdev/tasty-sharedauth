import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import SignIn from "./components/auth/SignIn";
import ForgotPassword from "./components/auth/ForgotPassword";
import AuthGuard from "./components/auth/AuthGuard";
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
import AuthCallback from "./components/auth/AuthCallback";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import LoadingScreen from "./components/LoadingScreen";

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
              <Route path="/signin" element={<SignIn />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
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
              <Route path="/auth/v1/verify" element={<AuthCallback />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/"
                element={<Navigate to="/dashboard" replace />}
              />
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
