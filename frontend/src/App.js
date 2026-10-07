import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ContactsPage from './pages/ContactsPage';
import UnifiedInboxPage from './pages/UnifiedInboxPage';
import CallsPage from './pages/CallsPage';
import WhatsAppPage from './pages/WhatsAppPage';
import OmniChannelPage from './pages/OmniChannelPage';
import CampaignsPage from './pages/CampaignsPage';
import OffersPage from './pages/OffersPage';
import TemplatesPage from './pages/TemplatesPage';
import DealsPage from './pages/DealsPage';
import TasksPage from './pages/TasksPage';
import UsersPage from './pages/UsersPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ className: 'toast' }} />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="inbox" element={<UnifiedInboxPage />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="calls" element={<CallsPage />} />
            <Route path="whatsapp" element={<WhatsAppPage />} />
            <Route path="omnichannel" element={<OmniChannelPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
