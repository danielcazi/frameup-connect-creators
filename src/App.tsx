import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RecoverPassword from "./pages/RecoverPassword";
import CreatorDashboard from "./pages/creator/Dashboard";
import NewProject from "./pages/creator/NewProject";
import ProjectPreview from "./pages/creator/ProjectPreview";
import EditorDashboard from "./pages/editor/Dashboard";
import EditorPricing from "./pages/editor/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
              path="/creator/new-project"
              element={
                <ProtectedRoute requiredUserType="creator">
                  <NewProject />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/project/:id/payment"
              element={
                <ProtectedRoute requiredUserType="creator">
                  <ProjectPreview />
                </ProtectedRoute>
              }
            />
            
            {/* Editor Protected Routes */}
            <Route
              path="/editor/dashboard"
              element={
                <ProtectedRoute requiredUserType="editor">
                  <EditorDashboard />
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
            
            {/* 404 - Must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
