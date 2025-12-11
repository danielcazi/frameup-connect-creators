import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProvider } from "@/hooks/useAdmin";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RecoverPassword from "./pages/RecoverPassword";
import CreatorDashboard from "./pages/creator/Dashboard";
import ProjectApplications from "./pages/creator/ProjectApplications";
import NewProject from "./pages/creator/NewProject";
import CreatorProjectDetails from "./pages/creator/ProjectDetails";
import EditProject from "./pages/creator/EditProject";

import Payment from "./pages/creator/Payment";
import PaymentSuccess from "./pages/creator/PaymentSuccess";
import EditorDashboard from "./pages/editor/Dashboard";
import EditorProjects from "./pages/editor/Projects";
import EditorMyProjects from "./pages/editor/MyProjects";
import SubscriptionPlans from "./pages/editor/SubscriptionPlans";
import SubscriptionSuccess from "./pages/editor/SubscriptionSuccess";
import ManageSubscription from "./pages/editor/ManageSubscription";
import ProjectDetails from "./pages/editor/ProjectDetails";
import EditorPricing from "./pages/editor/Pricing";

import MyProfile from "./pages/editor/MyProfile";
import EditProfile from "./pages/editor/EditProfile";
import EditorPublicProfile from "./pages/public/EditorPublicProfile";
import CreateReview from "./pages/shared/CreateReview";
import Chat from "./pages/shared/Chat";
import Messages from "./pages/shared/Messages";
import NotFound from "./pages/NotFound";
import SubscriptionGuard from "./components/guards/SubscriptionGuard";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminLogin from "./pages/admin/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import EditorApprovals from "./pages/admin/EditorApprovals";
import EditorApprovalDetail from "./pages/admin/EditorApprovalDetail";
import Disputes from "./pages/admin/Disputes";
import DisputeDetail from "./pages/admin/DisputeDetail";
import Financial from "./pages/admin/Financial";
import Discounts from "./pages/admin/Discounts";
import SuspiciousUsers from "./pages/admin/SuspiciousUsers";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminProjectDetails from "./pages/admin/AdminProjectDetails";
import UserDetails from "./pages/admin/UserDetails";
import Analytics from "./pages/admin/Analytics";
import Notifications from "./pages/shared/Notifications";
import Favorites from "./pages/creator/Favorites";
import CreatorProjects from "./pages/creator/Projects";
import CreatorEditors from "./pages/creator/Editors";
import CreatorProfile from "./pages/creator/Profile";
import EditorProposals from "./pages/editor/Proposals";
import DeliverVideo from "./pages/editor/DeliverVideo";
import ReviewDelivery from "./pages/creator/ReviewDelivery";
import RevisionView from "./pages/shared/RevisionView";
import AdminRevisionView from "./pages/admin/AdminRevisionView";
import NotificationPreferences from '@/pages/shared/NotificationPreferences';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AdminProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Signup />} />
              <Route path="/recuperar-senha" element={<RecoverPassword />} />

              {/* Creator Protected Routes */}
              <Route
                path="/creator/dashboard"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <CreatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/project/new"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <NewProject />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/project/:id"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <CreatorProjectDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/project/:id/edit"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <EditProject />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/project/:id/payment"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <Payment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/project/:id/payment-success"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <PaymentSuccess />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/project/:id/applications"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <ProjectApplications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/project/:id/chat"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <Chat />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/creator/project/:id/rate"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <CreateReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/messages"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <Messages />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/notifications"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/favorites"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <Favorites />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/projects"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <CreatorProjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/editors"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <CreatorEditors />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/project/:id/review"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <ReviewDelivery />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creator/profile"
                element={
                  <ProtectedRoute requiredUserType="creator">
                    <CreatorProfile />
                  </ProtectedRoute>
                }
              />

              {/* Editor Protected Routes */}
              <Route
                path="/editor/dashboard"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <SubscriptionGuard requireActive={false}>
                      <ErrorBoundary>
                        <EditorDashboard />
                      </ErrorBoundary>
                    </SubscriptionGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/projects"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <EditorProjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/my-projects"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <EditorMyProjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/subscription/plans"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <SubscriptionPlans />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/subscription/success"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <SubscriptionSuccess />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/subscription/manage"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <ManageSubscription />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/project/:id"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <ProjectDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/project/:id/chat"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/project/:id/deliver"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <DeliverVideo />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/editor/profile/edit"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <EditProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/project/:id/rate"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <CreateReview />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/editor/profile/:username"
                element={
                  <ProtectedRoute>
                    <EditorPublicProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/profile"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <MyProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/messages"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <Messages />
                  </ProtectedRoute>
                }
              />

              {/* Shared Routes */}
              <Route
                path="/project/:id/revision/:version"
                element={
                  <ProtectedRoute>
                    <RevisionView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/pricing"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <EditorPricing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/notifications"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/proposals"
                element={
                  <ProtectedRoute requiredUserType="editor">
                    <EditorProposals />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="approvals" element={<EditorApprovals />} />
                <Route path="approvals/:editorId" element={<EditorApprovalDetail />} />
                <Route path="disputes" element={<Disputes />} />
                <Route path="disputes/:disputeId" element={<DisputeDetail />} />
                <Route path="financial" element={<Financial />} />
                <Route path="discounts" element={<Discounts />} />
                <Route path="suspicious-users" element={<SuspiciousUsers />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:userId" element={<UserDetails />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="projects/:id" element={<AdminProjectDetails />} />
                <Route path="projects/:projectId/revision/:version" element={<AdminRevisionView />} />
                <Route path="analytics" element={<Analytics />} />
              </Route>

              {/* 404 - Must be last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
