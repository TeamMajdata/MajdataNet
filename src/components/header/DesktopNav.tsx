import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLoc } from "@/hooks";
import Dropdown from "./Dropdown";
import { DROPDOWN_ITEM, NAV_LINK, DESKTOP_DROPDOWN_ITEM } from "./styles";
import {
  Birdhouse,
  Podium,
  ChevronDown,
  Wrench,
  BookOpenText,
  LandPlot,
  Fan,
  Music4,
  TrendingUp,
  Users,
  Trophy,
  PenLine,
  Gamepad2,
} from "lucide-react";
/**
 * 桌面端导航栏
 */
export default function DesktopNav() {
  const loc = useLoc();
  const { pathname } = useLocation();
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
  const rankingsContainerRef = useRef<HTMLDivElement>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsContainerRef = useRef<HTMLDivElement>(null);

  const isRankingsActive = pathname.startsWith("/ranking");
  const isToolsActive =
    pathname.startsWith("/edit") || pathname.startsWith("/play");

  return (
    <div className="hidden xl:flex flex-col gap-1 w-full">
      <Link
        to="/"
        className={`${NAV_LINK} group ${pathname === "/" ? "text-[#5C8DC1]" : ""}`}
      >
        <span className="flex items-center gap-2 text-2xl font-black relative">
          <Birdhouse className="w-8 h-8" />
          <span className="absolute left-14 text-2xl font-black text-[#5C8DC1]/50 group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            Home
          </span>
        </span>
      </Link>
      <div className="inline-block relative" ref={rankingsContainerRef}>
        <button
          className={`flex items-center gap-2 px-4 py-3 no-underline w-full font-medium text-sm whitespace-nowrap relative bg-none cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group ${
            isRankingsOpen || isRankingsActive
              ? "text-[#5C8DC1]"
              : "text-gray-600 hover:text-[#5C8DC1]"
          }`}
          onClick={() => setIsRankingsOpen(!isRankingsOpen)}
        >
          <span className="flex flex-col items-center gap-1 text-2xl font-black relative">
            <Podium className="w-8 h-8" />
            <ChevronDown className="w-5 h-5 absolute bottom-0 -right-5" />
            <span className="absolute left-14 text-2xl font-black text-[#5C8DC1]/50 group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
              {loc("Rankings")}
            </span>
          </span>
        </button>

        <Dropdown
          isOpen={isRankingsOpen}
          onClose={() => setIsRankingsOpen(false)}
          className="w-full"
          containerRef={rankingsContainerRef}
        >
          <Link
            to="/ranking"
            className={DESKTOP_DROPDOWN_ITEM}
            onClick={() => setIsRankingsOpen(false)}
          >
            <TrendingUp className="w-8 h-8 text-white" />
            <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
              {loc("Recommend")}
            </span>
          </Link>
          <Link
            to="/ranking/user"
            className={DESKTOP_DROPDOWN_ITEM}
            onClick={() => setIsRankingsOpen(false)}
          >
            <Users className="w-8 h-8 text-white" />
            <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
              {loc("UserRankingTitle")}
            </span>
          </Link>
          <Link
            to="/ranking/mmfc"
            className={DESKTOP_DROPDOWN_ITEM}
            onClick={() => setIsRankingsOpen(false)}
          >
            <Trophy className="w-8 h-8 text-white" />
            <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
              {loc("MMFCRanking")}
            </span>
          </Link>
        </Dropdown>
      </div>
      <div className="inline-block relative" ref={toolsContainerRef}>
        <button
          className={`flex items-center gap-2 px-4 py-3 no-underline w-full font-medium text-sm whitespace-nowrap relative bg-none cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group ${
            isToolsOpen || isToolsActive
              ? "text-[#5C8DC1]"
              : "text-gray-600 hover:text-[#5C8DC1]"
          }`}
          onClick={() => setIsToolsOpen(!isToolsOpen)}
        >
          <span className="flex flex-col items-center gap-1 text-2xl font-black relative">
            <Wrench className="w-8 h-8" />
            <ChevronDown className="w-5 h-5 absolute bottom-0 -right-5" />
            <span className="absolute left-14 text-2xl font-black text-[#5C8DC1]/50 group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
              {loc("Tools")}
            </span>
          </span>
        </button>

        <Dropdown
          isOpen={isToolsOpen}
          onClose={() => setIsToolsOpen(false)}
          className="w-full"
          containerRef={toolsContainerRef}
        >
          <Link
            to="/edit"
            className={DESKTOP_DROPDOWN_ITEM}
            onClick={() => setIsToolsOpen(false)}
          >
            <PenLine className="w-8 h-8 text-white" />
            <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
              {loc("ChartEditor")}
            </span>
          </Link>
          <Link
            to="/play"
            className={DESKTOP_DROPDOWN_ITEM}
            onClick={() => setIsToolsOpen(false)}
          >
            <Gamepad2 className="w-8 h-8 text-white" />
            <span className="text-2xl font-black text-white/50 group-hover:text-white [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
              MajdataPlay
            </span>
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
          <span className="absolute left-14 text-2xl font-black text-[#5C8DC1]/50 group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            文档
          </span>
        </span>
      </Link>
      <Link
        to="/collection/hiroba"
        className={`${NAV_LINK} group ${pathname.startsWith("/collection/hiroba") ? "text-[#5C8DC1]" : ""}`}
      >
        <span className="flex items-center gap-2 text-2xl font-black relative">
          <LandPlot className="w-8 h-8" />
          <span className="absolute left-14 text-2xl font-black text-[#5C8DC1]/50 group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("CollectionHiroba")}
          </span>
        </span>
      </Link>
      <Link
        to="/chart-events"
        className={`${NAV_LINK} group ${pathname.startsWith("/chart-events") ? "text-[#5C8DC1]" : ""}`}
      >
        <span className="flex items-center gap-2 text-2xl font-black relative">
          <Fan className="w-8 h-8" />
          <span className="absolute left-14 text-2xl font-black text-[#5C8DC1]/50 group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("Contest")}
          </span>
        </span>
      </Link>
      <Link
        to="/eventTag?id=Original"
        className={`${NAV_LINK} group ${pathname.startsWith("/eventTag") ? "text-[#5C8DC1]" : ""}`}
      >
        <span className="flex items-center gap-2 text-2xl font-black relative">
          <Music4 className="w-8 h-8" />
          <span className="absolute left-14 text-2xl font-black text-[#5C8DC1]/50 group-hover:text-[#5C8DC1] [-webkit-text-stroke:0.4px_rgba(92,141,193,0.5)] group-hover:[-webkit-text-stroke:0] transition-all duration-300">
            {loc("OriginalSongs")}
          </span>
        </span>
      </Link>
    </div>
  );
}
