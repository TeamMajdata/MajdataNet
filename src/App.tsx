import { Suspense, lazy, useState } from 'react';
import { LazyMotion } from 'framer-motion';
import { loadMotionFeatures } from '@/utils/loadMotionFeatures';
import PageLoading from '@/components/ui/PageLoading';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { UserProvider } from '@/contexts/UserContext';
import { TooltipProvider, ProtectedRoute, ScrollToTopListener } from '@/components';
import HomePage from './pages/HomePage';
import { isAuthPath, type AuthLocationState } from './utils/authPaths';
import './App.css';

// 首页保持同步加载；其余页面按路由拆成独立 chunk，首次访问时再下载。
const AuthModal = lazy(() => import('./components/auth/AuthModal'));
// 吉祥物带着 Live2D 运行时（几百 KB），不该挡在首屏前
const Live2DMascot = lazy(() => import('./components/mascot/Live2DMascot'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const UserRankingPage = lazy(() => import('./pages/ranking/UserRankingPage'));
const SongPage = lazy(() => import('./pages/SongPage'));
const SpacePage = lazy(() => import('./pages/SpacePage'));
const EventTagPage = lazy(() => import('./pages/EventTagPage'));
const SeasonPage = lazy(() => import('./pages/SeasonPage'));
const UserChartsPage = lazy(() => import('./pages/user/ChartsPage'));
const UserProfilePage = lazy(() => import('./pages/user/ProfilePage'));
const MiniGamePage = lazy(() => import('./pages/MiniGamePage'));
const UserScoresPage = lazy(() => import('./pages/user/ScoresPage'));
const UserCollectionsPage = lazy(() => import('./pages/user/CollectionsPage'));
const QRAuthPage = lazy(() => import('./pages/QRAuthPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const CollectionsHirobaPage = lazy(() => import('./pages/collection/HirobaPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CollectionPage = lazy(() => import('./pages/collection/CollectionPage'));


function RouteFallback() {
  return (
    <PageLoading />
  );
}

/**
 * Auth routes (/login, /register, /forget) open as a modal over the page the visitor came from,
 * so existing links and email deep links keep working.
 */
function AppRoutes() {
  const location = useLocation();
  const showAuth = isAuthPath(location.pathname);
  const currentPath = location.pathname + location.search + location.hash;
  // Remember the last two regular pages: the modal normally shows the latest one, but a
  // protected page that redirected to login can't render, so it shows the one before it.
  const [pages, setPages] = useState<{ current: string | null; previous: string | null }>({ current: null, previous: null });
  if (!showAuth && pages.current !== currentPath) setPages({ current: currentPath, previous: pages.current });

  const authState = location.state as AuthLocationState;
  const backgroundLocation = showAuth
    ? authState?.authBackground ?? (authState?.fromProtectedRoute ? pages.previous : pages.current) ?? '/'
    : location;

  return (
    <>
      <Routes location={backgroundLocation}>
        <Route path="/" element={<HomePage />} />
        <Route path="/chart-events" element={<EventsPage />} />
        <Route path="/ranking/user" element={<UserRankingPage />} />
        <Route path="/song" element={<SongPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/space" element={<SpacePage />} />
        <Route path="/eventTag" element={<EventTagPage />} />
        <Route path="/minigame" element={<MiniGamePage />} />
        {/* 游客也能看；收藏、订阅等操作时再要求登录 */}
        <Route path="/season" element={<SeasonPage />} />
        <Route path="/collection/hiroba" element={<CollectionsHirobaPage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/user/charts" element={<UserChartsPage />} />
          <Route path="/user/profile" element={<UserProfilePage />} />
          <Route path="/user/scores" element={<UserScoresPage />} />
          <Route path="/user/collections" element={<UserCollectionsPage />} />
          <Route path="/qrauth" element={<QRAuthPage />} />
        </Route>
      </Routes>
      {showAuth && (
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      )}
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <title>Majdata.Net</title>
        <meta
          name="description"
          content="Majdata.Net - a Place to Share Maimai Fanmade Charts. maimai 饭制谱面分享平台，支持谱面上传、下载、排行榜和社区互动。"
        />
        <meta property="og:title" content="Majdata.Net" />
        <meta
          property="og:description"
          content="a Place to Share Maimai Fanmade Charts. maimai 饭制谱面分享平台，支持谱面上传、下载、排行榜和社区互动。"
        />
        <meta property="og:url" content="https://majdata.net" />
        <meta property="og:image" content="https://majdata.net/salt.webp" />
        <meta name="twitter:title" content="Majdata.Net" />
        <meta
          name="twitter:description"
          content="a Place to Share Maimai Fanmade Charts. maimai 饭制谱面分享平台，支持谱面上传、下载、排行榜和社区互动。"
        />
        <meta name="twitter:image" content="https://majdata.net/salt.webp" />
      </Helmet>
      {/* 动画功能单独一个 chunk 按需加载；strict：误用完整的 motion 组件会直接报错，免得又把整套功能带回首屏 */}
      <LazyMotion features={loadMotionFeatures} strict>
      <TooltipProvider delayDuration={200}>
        {/* 语言包按需加载：首次加载期间由 Suspense 显示 loading，而不是每个页面各自判断 */}
        <Suspense fallback={<RouteFallback />}>
          <UserProvider>
            <Router>
              <ScrollToTopListener />
              <Suspense fallback={<RouteFallback />}>
                <AppRoutes />
              </Suspense>
              <Suspense fallback={null}>
                <Live2DMascot />
              </Suspense>
            </Router>
          </UserProvider>
        </Suspense>
      </TooltipProvider>
      </LazyMotion>
    </HelmetProvider>
  );
}

export default App;
