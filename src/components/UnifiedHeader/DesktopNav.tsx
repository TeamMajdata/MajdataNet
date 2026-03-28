import { Link } from 'react-router-dom';
import { useLoc } from '@/hooks';
import RankingsMenu from './RankingsMenu';
import { NAV_LINK } from './styles';

/**
 * 桌面端导航栏
 */
export default function DesktopNav() {
  const loc = useLoc();

  return (
    <div className="hidden xl:flex items-center gap-2 bg-white/5 p-2 border border-white/8 rounded-xl">
      <RankingsMenu />
      <Link to="/edit" className={NAV_LINK}>
        <span className="text-sm">{loc('ChartEditor')}</span>
      </Link>
      <Link to="/play" className={NAV_LINK}>
        <span className="text-sm">MajdataPlay</span>
      </Link>
      <Link to="/chart-events" className={NAV_LINK}>
        <span className="text-sm">{loc('Contest')}</span>
      </Link>
      <Link to="/eventTag?id=Original" className={NAV_LINK}>
        <span className="text-sm">{loc('OriginalSongs')}</span>
      </Link>
      <Link to="/docs" className={NAV_LINK}>
        <span className="text-sm">{loc('DocsTitle', 'Docs')}</span>
      </Link>
    </div>
  );
}
