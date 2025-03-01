import { Suspense } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import SignIn from "./components/auth/SignIn";
import AuthGuard from "./components/auth/AuthGuard";
import TeamAccess from "./components/team/TeamAccess";
import ModelsPage from "./components/models/ModelsPage";
import GroupManagement from "./components/group/GroupManagement";
import GroupsPage from "./components/group/GroupsPage";
import DatabaseProvider from "@/contexts/DatabaseContext";
import { GroupProvider } from "@/contexts/GroupContext";
import ThemeProvider, { useTheme } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import SettingsPage from "./components/settings/SettingsPage";
import SharedLinksPage from "./components/settings/SharedLinksPage";
import SharedGroupView from "./components/shared/SharedGroupView";
import SharedModelView from "./components/shared/SharedModelView";
import ErrorBoundary from "./components/ErrorBoundary";

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
        <Suspense fallback={<p>Loading...</p>}>
          <div className={`min-h-screen bg-background text-foreground antialiased font-${font}`}>
           
            <Routes>
              <Route path="/signin" element={<SignIn />} />
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
                      <GroupsPage />
                    </DatabaseProvider>
                  </AuthGuard>
                }
              />
              <Route
                path="/group/:id"
                element={
                  <AuthGuard>
                    <DatabaseProvider>
                      <GroupManagement />
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
              <Route path="/share/:groupId" element={<SharedGroupView />} />
              <Route path="/share/model/:id" element={<SharedModelView />} />
              <Route
                path="/"
                element={<Navigate to="/dashboard" replace />}
              />
            </Routes>
          </div>
        </Suspense>
        </GroupProvider>
      </DatabaseProvider>
    </AuthProvider>
  );
}

export default App;
