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
    <div className="hidden xl:flex flex-col gap-1 w-full">
      <Link to="/" className={`${NAV_LINK} group`}>
        <span className="flex items-center gap-2 text-2xl font-black relative">
          <Birdhouse className="w-8 h-8" />
          <span className="absolute left-14 text-2xl font-black text-transparent group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.2)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            Home
          </span>
        </span>
      </Link>
      <div className="inline-block relative" ref={rankingsContainerRef}>
        <button
          className={`flex items-center gap-2 px-4 py-3 no-underline border-l-3 border-transparent w-full font-medium text-sm whitespace-nowrap relative bg-none cursor-pointer transition-all duration-400 ease-out hover:scale-105 active:scale-95 group ${
            isRankingsOpen
              ? "bg-linear-to-br from-[#5C8DC1]/8 to-[#5C8DC1]/4 text-[#5C8DC1] border-l-3 border-[#5C8DC1] shadow-[0_4px_12px_rgb(92_141_193/20%),0_1px_0_rgb(92_141_193/15%)_inset]"
              : "text-gray-600 bg-linear-to-r from-[#5C8DC1]/10 to-[#5C8DC1]/10 bg-no-repeat bg-[length:0%_100%] hover:bg-[length:100%_100%] hover:text-[#5C8DC1]"
          }`}
          onClick={() => setIsRankingsOpen(!isRankingsOpen)}
        >
          <span className="flex flex-col items-center gap-1 text-2xl font-black relative">
            <Podium className="w-8 h-8" />
            <ChevronDown className="w-5 h-5 absolute bottom-0 -right-5" />
            <span className="absolute left-14 text-2xl font-black text-transparent group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.2)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
              {loc("Rankings")}
            </span>
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
          className={`flex items-center gap-2 px-4 py-3 no-underline border-l-3 border-transparent w-full font-medium text-sm whitespace-nowrap relative bg-none cursor-pointer transition-all duration-400 ease-out hover:scale-105 active:scale-95 group ${
            isToolsOpen
              ? "bg-linear-to-br from-[#5C8DC1]/8 to-[#5C8DC1]/4 text-[#5C8DC1] border-l-3 border-[#5C8DC1] shadow-[0_4px_12px_rgb(92_141_193/20%),0_1px_0_rgb(92_141_193/15%)_inset]"
              : "text-gray-600 bg-linear-to-r from-[#5C8DC1]/10 to-[#5C8DC1]/10 bg-no-repeat bg-[length:0%_100%] hover:bg-[length:100%_100%] hover:text-[#5C8DC1]"
          }`}
          onClick={() => setIsToolsOpen(!isToolsOpen)}
        >
          <span className="flex flex-col items-center gap-1 text-2xl font-black relative">
            <Wrench className="w-8 h-8" />
            <ChevronDown className="w-5 h-5 absolute bottom-0 -right-5" />
            <span className="absolute left-14 text-2xl font-black text-transparent group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.2)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
              {loc("Tools")}
            </span>
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
        className={`${NAV_LINK} group`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="flex items-center gap-2 text-2xl font-black relative">
          <BookOpenText className="w-8 h-8" />
          <span className="absolute left-14 text-2xl font-black text-transparent group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.2)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            文档
          </span>
        </span>
      </Link>
      <Link to="/collection/hiroba" className={`${NAV_LINK} group`}>
        <span className="flex items-center gap-2 text-2xl font-black relative">
          <LandPlot className="w-8 h-8" />
          <span className="absolute left-14 text-2xl font-black text-transparent group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.2)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("CollectionHiroba")}
          </span>
        </span>
      </Link>
      <Link to="/chart-events" className={`${NAV_LINK} group`}>
        <span className="flex items-center gap-2 text-2xl font-black relative">
          <Fan className="w-8 h-8" />
          <span className="absolute left-14 text-2xl font-black text-transparent group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.2)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("Contest")}
          </span>
        </span>
      </Link>
      <Link to="/eventTag?id=Original" className={`${NAV_LINK} group`}>
        <span className="flex items-center gap-2 text-2xl font-black relative">
          <Music4 className="w-8 h-8" />
          <span className="absolute left-14 text-2xl font-black text-transparent group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.2)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("OriginalSongs")}
          </span>
        </span>
      </Link>
    </div>
  );
}
