import { Spin } from 'antd';
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './authStore';

export function ProtectedRoute() {
  const { status, loadCurrentUser } = useAuthStore();

  useEffect(() => {
    if (status === 'idle') {
      loadCurrentUser();
    }
  }, [status, loadCurrentUser]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
