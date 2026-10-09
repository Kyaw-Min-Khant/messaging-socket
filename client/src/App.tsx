import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { ServicePicker } from './pages/ServicePicker';

// Expense screens (and recharts) are code-split so the chat bundle stays small.
const ExpensesLayout = lazy(() => import('./pages/expenses/ExpensesLayout').then((m) => ({ default: m.ExpensesLayout })));
const HomeScreen = lazy(() => import('./pages/expenses/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const ActivityScreen = lazy(() => import('./pages/expenses/ActivityScreen').then((m) => ({ default: m.ActivityScreen })));
const BudgetsScreen = lazy(() => import('./pages/expenses/BudgetsScreen').then((m) => ({ default: m.BudgetsScreen })));
const InsightsScreen = lazy(() => import('./pages/expenses/InsightsScreen').then((m) => ({ default: m.InsightsScreen })));
const MoreScreen = lazy(() => import('./pages/expenses/MoreScreen').then((m) => ({ default: m.MoreScreen })));
const IncomeScreen = lazy(() => import('./pages/expenses/IncomeScreen').then((m) => ({ default: m.IncomeScreen })));
const RecurringScreen = lazy(() => import('./pages/expenses/RecurringScreen').then((m) => ({ default: m.RecurringScreen })));

function Loading() {
  return (
    <div className="h-full bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return !user ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ServicePicker />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chats/:friendId?"
        element={
          <ProtectedRoute>
            <SocketProvider>
              <Chat />
            </SocketProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ExpensesLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeScreen />} />
        <Route path="transactions" element={<ActivityScreen />} />
        <Route path="budgets" element={<BudgetsScreen />} />
        <Route path="insights" element={<InsightsScreen />} />
        <Route path="more" element={<MoreScreen />} />
        <Route path="income" element={<IncomeScreen />} />
        <Route path="recurring" element={<RecurringScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f3f4f6',
              border: '1px solid #374151',
              fontSize: '14px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
