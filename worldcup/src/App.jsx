import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Matches from './pages/Matches';
import Leaderboard from './pages/Leaderboard';
import Cards from './pages/Cards';
import Arena from './pages/Arena';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import AdminPanel from './pages/admin/AdminPanel';
import Login from './pages/Login';
import { AuthProvider } from './lib/AuthContext';
import WorldCupTable from './components/WorldCupTable';
import Rules from './pages/Rules'; // הייבוא החדש

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors dir="rtl" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="matches" element={<Matches />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="cards" element={<Cards />} />
            <Route path="arena" element={<Arena />} />
            <Route path="chat" element={<Chat />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="world-cup-table" element={<WorldCupTable />} />
            <Route path="rules" element={<Rules />} /> {/* הנתיב החדש */}
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}