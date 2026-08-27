import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { I18nProvider } from './contexts/I18nContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { TooltipProvider, ProtectedRoute, ScrollToTopListener } from '@/components';
import HomePage from './pages/HomePage';
import ForginsterPage from './pages/ForginsterPage';
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
import UserCollectionPage from './pages/user/CollectionPage';
import QRAuthPage from './pages/QRAuthPage';
import NotFoundPage from './pages/NotFoundPage';
import CollectionsHirobaPage from './pages/collection/HirobaPage';
import CollectionPage from './pages/collection/CollectionPage';

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <title>Majdata Net</title>
        <meta
          name="description"
          content="Majdata Net - a Place to Share Maimai Fanmade Charts. maimai 饭制谱面分享平台，支持谱面上传、下载、排行榜和社区互动。"
        />
        <meta property="og:title" content="Majdata Net" />
        <meta
          property="og:description"
          content="a Place to Share Maimai Fanmade Charts. maimai 饭制谱面分享平台，支持谱面上传、下载、排行榜和社区互动。"
        />
        <meta property="og:url" content="https://majdata.net" />
        <meta property="og:image" content="/salt.webp" />
        <meta name="twitter:title" content="Majdata Net" />
        <meta
          name="twitter:description"
          content="a Place to Share Maimai Fanmade Charts. maimai 饭制谱面分享平台，支持谱面上传、下载、排行榜和社区互动。"
        />
        <meta name="twitter:image" content="/salt.webp" />
      </Helmet>
      <TooltipProvider delayDuration={200}>
        <ThemeProvider>
          <I18nProvider>
            <UserProvider>
            <Router>
              <ScrollToTopListener />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<ForginsterPage />} />
                <Route path="/register" element={<ForginsterPage />} />
                <Route path="/forget" element={<ForginsterPage />} />
                <Route path="/edit" element={<ExternalRedirect to="https://docs.majdata.net/majdatax/" />} />
                <Route path="/play" element={<ExternalRedirect to="https://docs.majdata.net/majdataplay/" />} />
                <Route path="/chart-events" element={<EventsPage />} />
                <Route path="/ranking" element={<RankingPage />} />
                <Route path="/ranking/user" element={<UserRankingPage />} />
                <Route path="/ranking/mmfc" element={<MMFCRankingPage />} />
                <Route path="/song" element={<SongPage />} />
                <Route path="/space" element={<SpacePage />} />
                <Route path="/eventTag" element={<EventTagPage />} />
                <Route path="/minigame" element={<MiniGamePage />} />
                <Route path="*" element={<NotFoundPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/user/charts" element={<UserChartsPage />} />
                  <Route path="/user/profile" element={<UserProfilePage />} />
                  <Route path="/user/scores" element={<PersonalScoresPage />} />
                  <Route path="/user/collections" element={<UserCollectionPage />} />
                  <Route path="/collection/hiroba" element={<CollectionsHirobaPage />} />
                  <Route path="/collection" element={<CollectionPage />} />
                  <Route path="/qrauth" element={<QRAuthPage />} />
                </Route>
              </Routes>
            </Router>
          </UserProvider>
        </I18nProvider>
        </ThemeProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
}

export default App;
