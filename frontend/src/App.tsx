import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/layout/Layout';
import { authService } from './services/authService';
 

const Login     = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Buses     = lazy(() => import('./pages/Buses'));
const Drivers   = lazy(() => import('./pages/Drivers'));
const RouteMap  = lazy(() => import('./pages/Routes'));
const Schedules = lazy(() => import('./pages/Schedules'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-14 bg-gray-100 rounded-xl mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="h-3 bg-gray-200 rounded w-24 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-16 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  if (authService.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login — public */}
        <Route path="/login" element={
          <PublicRoute>
            <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
              <Login />
            </Suspense>
          </PublicRoute>
        } />

        {/* All protected pages */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={
            <Suspense fallback={<PageSkeleton />}>
              <Dashboard />
            </Suspense>
          } />
          <Route path="buses" element={
            <Suspense fallback={<PageSkeleton />}>
              <Buses />
            </Suspense>
          } />
          <Route path="drivers" element={
            <Suspense fallback={<PageSkeleton />}>
              <Drivers />
            </Suspense>
          } />
          <Route path="routes" element={
            <Suspense fallback={<PageSkeleton />}>
              <RouteMap />
            </Suspense>
          } />
          <Route path="schedules" element={
            <Suspense fallback={<PageSkeleton />}>
              <Schedules />
            </Suspense>
          } />
        </Route>

        {/* Catch all */}
       <Route path="*" element={
  <Suspense fallback={<div />}>
    <NotFound />
  </Suspense>
} />

      </Routes>
    </BrowserRouter>
  );
}