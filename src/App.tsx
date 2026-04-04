import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { I18nProvider } from './contexts/I18nContext';
import { TooltipProvider } from '@/components';
import HomePage from './pages/HomePage';
import ForginsterPage from './pages/ForginsterPage';
import EditPage from './pages/EditPage';
import PlayPage from './pages/PlayPage';
import EventsPage from './pages/EventsPage';
import RankingPage from './pages/RankingPage';
import UserRankingPage from './pages/ranking/UserRankingPage';
import MMFCRankingPage from './pages/ranking/MMFCRankingPage';
import SongPage from './pages/SongPage';
import SpacePage from './pages/SpacePage';
import EventTagPage from './pages/EventTagPage';
import UserChartsPage from './pages/user/ChartsPage';
import UserProfilePage from './pages/user/ProfilePage';
import MiniGamePage from './pages/MiniGamePage';
import './App.css';
import PersonalScoresPage from './pages/user/ScoresPage';
import QRAuthPage from './pages/QRAuthPage';
import NotFoundPage from './pages/NotFoundPage';
import CollectionsHirobaPage from './pages/collection/HirobaPage';

function App() {
  return (
    <HelmetProvider>
      <TooltipProvider delayDuration={200}>
        <I18nProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<ForginsterPage />} />
              <Route path="/register" element={<ForginsterPage />} />
              <Route path="/forget" element={<ForginsterPage />} />
              <Route path="/edit" element={<EditPage />} />
              <Route path="/play" element={<PlayPage />} />
              <Route path="/chart-events" element={<EventsPage />} />
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/ranking/user" element={<UserRankingPage />} />
              <Route path="/ranking/mmfc" element={<MMFCRankingPage />} />
              <Route path="/song" element={<SongPage />} />
              <Route path="/space" element={<SpacePage />} />
              <Route path="/eventTag" element={<EventTagPage />} />
              <Route path="/user/charts" element={<UserChartsPage />} />
              <Route path="/user/profile" element={<UserProfilePage />} />
              <Route path="/user/scores" element={<PersonalScoresPage />} />
              <Route path="/minigame" element={<MiniGamePage />} />
              <Route path="/qrauth" element={<QRAuthPage />} />
              <Route path="/collection/hiroba" element={<CollectionsHirobaPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </I18nProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
}

export default App;
