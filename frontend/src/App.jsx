import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './components/dashboard/DashboardHome';
import Visitors from './components/visitors/Visitors';
import ProtectedRoute from './components/common/ProtectedRoute';
import NewVisitor from './components/visitors/NewVisitor';
import CheckIn from './components/visitors/CheckIn';
import PendingVisitors from './components/visitors/Pending';
import CheckOutPage from './components/visitors/CheckOut';
import MeetingRequest from './components/meet/RequestMeet';
import IncomingMeetings from './components/meet/IncomingMeet';
import MeetingStatus from './components/meet/MeetingStatus';
import ChatBot from './components/common/ChatBot';

import './index.css';


const App = () => {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="/dashboard/visitors" element={<Visitors />} />
            <Route path="/dashboard/visitors/new" element={<NewVisitor />} />
            <Route path="/dashboard/visitors/check-in" element={<CheckIn />} />
            <Route path="/dashboard/visitors/pending" element={<PendingVisitors />} />
            <Route path="/dashboard/visitors/check-out" element={<CheckOutPage />} />
            <Route path="/dashboard/meetings/request" element={<MeetingRequest />} />
            <Route path="/dashboard/meetings/respond" element={<IncomingMeetings />} />
            <Route path="/dashboard/meetings/status" element={<MeetingStatus />} />

            {/* Add other dashboard routes here */}
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>

      <ChatBot />
    </Router>
  );
};

export default App;