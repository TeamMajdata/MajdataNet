import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './contexts/I18nContext';
import { TooltipProvider } from './components/Tooltip';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EditPage from './pages/EditPage';
import EventsPage from './pages/EventsPage';
import RankingPage from './pages/RankingPage';
import SongPage from './pages/SongPage';
import SpacePage from './pages/SpacePage';
import EventTagPage from './pages/EventTagPage';
import UserPage from './pages/UserPage';
import UserChartsPage from './pages/UserChartsPage';
import UserProfilePage from './pages/UserProfilePage';
import MiniGamePage from './pages/MiniGamePage';
import './App.css';

function App() {
  return (
    <TooltipProvider delayDuration={200}>
    <I18nProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/edit" element={<EditPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/song" element={<SongPage />} />
          <Route path="/space" element={<SpacePage />} />
          <Route path="/eventTag" element={<EventTagPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/user/charts" element={<UserChartsPage />} />
          <Route path="/user/profile" element={<UserProfilePage />} />
          <Route path="/minigame" element={<MiniGamePage />} />
        </Routes>
      </Router>
    </I18nProvider>
    </TooltipProvider>
  );
}

export default App;
