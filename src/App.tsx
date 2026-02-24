import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EditPage from './pages/EditPage';
import EventsPage from './pages/EventsPage';
import RankingPage from './pages/RankingPage';
import SongPage from './pages/SongPage';
import SpacePage from './pages/SpacePage';
import EventsDemo from './pages/EventsDemo';
import ComponentsDemo from './pages/ComponentsDemo';
import LayoutDemo from './pages/LayoutDemo';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* 演示页面 (保留用于开发测试) */}
        <Route path="/demo" element={<Home />} />
        <Route path="/events-demo" element={<EventsDemo />} />
        <Route path="/components-demo" element={<ComponentsDemo />} />
        <Route path="/layout-demo" element={<LayoutDemo />} />
        
        {/* 实际应用页面 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/edit" element={<EditPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/song" element={<SongPage />} />
        <Route path="/space" element={<SpacePage />} />
      </Routes>
    </Router>
  );
}

export default App;
