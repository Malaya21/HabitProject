import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import HabitsPage from './pages/HabitsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import NotesPage from './pages/NotesPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/habits" element={<HabitsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
