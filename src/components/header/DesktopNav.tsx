import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLoc } from "@/hooks";
import Dropdown from "./Dropdown";
import { DROPDOWN_ITEM, NAV_LINK } from "./styles";
import {
  Birdhouse,
  Podium,
  ChevronDown,
  Wrench,
  BookOpenText,
  LandPlot,
  Fan,
  Music4,
} from "lucide-react";
/**
 * 桌面端导航栏
 */
export default function DesktopNav() {
  const loc = useLoc();
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
  const rankingsContainerRef = useRef<HTMLDivElement>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="hidden xl:flex items-center gap-2 p-2">
      <Link to="/" className={NAV_LINK}>
        <span className="flex items-center gap-2 text-sm">
          <Birdhouse className="w-4 h-4" />
          Home
        </span>
      </Link>
      <div className="inline-block relative" ref={rankingsContainerRef}>
        <button
          className={`flex items-center gap-2 px-5 py-3 no-underline rounded-full font-medium text-sm whitespace-nowrap relative bg-none border-none cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
            isRankingsOpen
              ? "bg-linear-to-br from-[#5C8DC1]/12 to-[#5C8DC1]/6 text-[#5C8DC1] shadow-[0_4px_12px_rgb(92_141_193/20%),0_1px_0_rgb(92_141_193/15%)_inset]"
              : "text-gray-600 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:text-[#5C8DC1] hover:shadow-[0_4px_12px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset]"
          }`}
          onClick={() => setIsRankingsOpen(!isRankingsOpen)}
        >
          <span className="flex flex-row gap-2 items-center text-sm">
            <Podium className="w-4 h-4" />
            {loc("Rankings")}
            <ChevronDown className="w-4 h-4" />
          </span>
        </button>

        <Dropdown
          isOpen={isRankingsOpen}
          onClose={() => setIsRankingsOpen(false)}
          position="left"
          className="w-full"
          containerRef={rankingsContainerRef}
        >
          <Link
            to="/ranking"
            className={DROPDOWN_ITEM}
            onClick={() => setIsRankingsOpen(false)}
          >
            <span className="text-sm">{loc("Recommend")}</span>
          </Link>
          <Link
            to="/ranking/user"
            className={DROPDOWN_ITEM}
            onClick={() => setIsRankingsOpen(false)}
          >
            <span className="text-sm">{loc("UserRankingTitle")}</span>
          </Link>
          <Link
            to="/ranking/mmfc"
            className={DROPDOWN_ITEM}
            onClick={() => setIsRankingsOpen(false)}
          >
            <span className="text-sm">{loc("MMFCRanking")}</span>
          </Link>
        </Dropdown>
      </div>
      <div className="inline-block relative" ref={toolsContainerRef}>
        <button
          className={`flex items-center gap-2 px-5 py-3 no-underline rounded-full font-medium text-sm whitespace-nowrap relative bg-none border-none cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
            isToolsOpen
              ? "bg-linear-to-br from-[#5C8DC1]/12 to-[#5C8DC1]/6 text-[#5C8DC1] shadow-[0_4px_12px_rgb(92_141_193/20%),0_1px_0_rgb(92_141_193/15%)_inset]"
              : "text-gray-600 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:text-[#5C8DC1] hover:shadow-[0_4px_12px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset]"
          }`}
          onClick={() => setIsToolsOpen(!isToolsOpen)}
        >
          <span className="flex flex-row gap-2 items-center text-sm">
            <Wrench className="w-4 h-4" />
            {loc("Tools")}
            <ChevronDown className="w-4 h-4" />
          </span>
        </button>

        <Dropdown
          isOpen={isToolsOpen}
          onClose={() => setIsToolsOpen(false)}
          position="left"
          className="w-full"
          containerRef={toolsContainerRef}
        >
          <Link
            to="/edit"
            className={DROPDOWN_ITEM}
            onClick={() => setIsToolsOpen(false)}
          >
            <span className="text-sm">{loc("ChartEditor")}</span>
          </Link>
          <Link
            to="/play"
            className={DROPDOWN_ITEM}
            onClick={() => setIsToolsOpen(false)}
          >
            <span className="text-sm">MajdataPlay</span>
          </Link>
        </Dropdown>
      </div>
      <Link
        to="https://docs.majdata.net"
        className={NAV_LINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="flex items-center gap-2 text-sm">
          <BookOpenText className="w-4 h-4" />
          文档
        </span>
      </Link>
      <Link to="/collection/hiroba" className={NAV_LINK}>
        <span className="flex items-center gap-2 text-sm">
          <LandPlot className="w-4 h-4" />
          {loc("CollectionHiroba")}
        </span>
      </Link>
      <Link to="/chart-events" className={NAV_LINK}>
        <span className="flex items-center gap-2 text-sm">
          <Fan className="w-4 h-4" />
          {loc("Contest")}
        </span>
      </Link>
      <Link to="/eventTag?id=Original" className={NAV_LINK}>
        <span className="flex items-center gap-2 text-sm">
          <Music4 className="w-4 h-4" />
          {loc("OriginalSongs")}
        </span>
      </Link>
    </div>
  );
}
