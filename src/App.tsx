import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { I18nProvider } from './contexts/I18nContext';
import { TooltipProvider } from './components/Tooltip';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EditPage from './pages/EditPage';
import PlayPage from './pages/PlayPage';
import EventsPage from './pages/EventsPage';
import RankingPage from './pages/RankingPage';
import UserRankingPage from './pages/UserRankingPage';
import MMFCRankingPage from './pages/MMFCRankingPage';
import SongPage from './pages/SongPage';
import SpacePage from './pages/SpacePage';
import EventTagPage from './pages/EventTagPage';
import UserChartsPage from './pages/UserChartsPage';
import UserProfilePage from './pages/UserProfilePage';
import MiniGamePage from './pages/MiniGamePage';
import './App.css';
import PersonalScoresPage from './pages/PersonalScoresPage';
import QRAuthPage from './pages/QRAuthPage';

function App() {
  return (
    <HelmetProvider>
    <TooltipProvider delayDuration={200}>
    <I18nProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/edit" element={<EditPage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="/chart-events" element={<EventsPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/user-ranking" element={<UserRankingPage />} />
          <Route path="/mmfc-ranking" element={<MMFCRankingPage />} />
          <Route path="/song" element={<SongPage />} />
          <Route path="/space" element={<SpacePage />} />
          <Route path="/eventTag" element={<EventTagPage />} />
          <Route path="/user/charts" element={<UserChartsPage />} />
          <Route path="/user/profile" element={<UserProfilePage />} />
          <Route path="/user/scores" element={<PersonalScoresPage />} />
          <Route path="/minigame" element={<MiniGamePage />} />
          <Route path="/qrauth" element={<QRAuthPage />} />
        </Routes>
      </Router>
    </I18nProvider>
    </TooltipProvider>
    </HelmetProvider>
  );
}

export default App;
