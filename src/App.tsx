import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { I18nProvider } from './contexts/I18nContext';
import { UserProvider } from '@/contexts/UserContext';
import { LoadingSpinner, TooltipProvider, ProtectedRoute, ScrollToTopListener } from '@/components';
import HomePage from './pages/HomePage';
import Live2DMascot from './components/mascot/Live2DMascot';
import './App.css';

// 首页保持同步加载；其余页面按路由拆成独立 chunk，首次访问时再下载。
const ForginsterPage = lazy(() => import('./pages/ForginsterPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const RankingPage = lazy(() => import('./pages/RankingPage'));
const UserRankingPage = lazy(() => import('./pages/ranking/UserRankingPage'));
const MMFCRankingPage = lazy(() => import('./pages/ranking/MMFCRankingPage'));
const SongPage = lazy(() => import('./pages/SongPage'));
const SpacePage = lazy(() => import('./pages/SpacePage'));
const EventTagPage = lazy(() => import('./pages/EventTagPage'));
const SeasonPage = lazy(() => import('./pages/SeasonPage'));
const UserChartsPage = lazy(() => import('./pages/user/ChartsPage'));
const UserProfilePage = lazy(() => import('./pages/user/ProfilePage'));
const MiniGamePage = lazy(() => import('./pages/MiniGamePage'));
const PersonalScoresPage = lazy(() => import('./pages/user/ScoresPage'));
const UserCollectionPage = lazy(() => import('./pages/user/CollectionPage'));
const QRAuthPage = lazy(() => import('./pages/QRAuthPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const CollectionsHirobaPage = lazy(() => import('./pages/collection/HirobaPage'));
const CollectionPage = lazy(() => import('./pages/collection/CollectionPage'));

function RouteFallback() {
  return (
    <div className="flex justify-center items-center h-screen">
      <LoadingSpinner size="50px" />
    </div>
  );
}

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
        <meta property="og:image" content="https://majdata.net/salt.webp" />
        <meta name="twitter:title" content="Majdata Net" />
        <meta
          name="twitter:description"
          content="a Place to Share Maimai Fanmade Charts. maimai 饭制谱面分享平台，支持谱面上传、下载、排行榜和社区互动。"
        />
        <meta name="twitter:image" content="https://majdata.net/salt.webp" />
      </Helmet>
      <TooltipProvider delayDuration={200}>
        <I18nProvider>
          <UserProvider>
            <Router>
              <ScrollToTopListener />
              <Suspense fallback={<RouteFallback />}>
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
                    <Route path="/season" element={<SeasonPage />} />
                    <Route path="/user/charts" element={<UserChartsPage />} />
                    <Route path="/user/profile" element={<UserProfilePage />} />
                    <Route path="/user/scores" element={<PersonalScoresPage />} />
                    <Route path="/user/collections" element={<UserCollectionPage />} />
                    <Route path="/collection/hiroba" element={<CollectionsHirobaPage />} />
                    <Route path="/collection" element={<CollectionPage />} />
                    <Route path="/qrauth" element={<QRAuthPage />} />
                  </Route>
                </Routes>
              </Suspense>
              <Live2DMascot />
            </Router>
          </UserProvider>
        </I18nProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
}

export default App;
