import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useLoc } from "@/hooks";
import {
  MOBILE_DROPDOWN_ITEM,
  HAMBURGER_BUTTON_BASE,
  HAMBURGER_BUTTON_ACTIVE,
  HAMBURGER_BUTTON_HOVER,
} from "./styles";
import Dropdown from "./Dropdown";

/**
 * 移动端汉堡菜单导航
 */
export default function MobileNav() {
  const loc = useLoc();
  const [isMainNavOpen, setIsMainNavOpen] = useState(false);
  const [isMobileRankingsOpen, setIsMobileRankingsOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  return (
    <nav className="xl:hidden block relative" ref={containerRef}>
      <button
        className={`${HAMBURGER_BUTTON_BASE} ${isMainNavOpen ? HAMBURGER_BUTTON_ACTIVE : HAMBURGER_BUTTON_HOVER}`}
        onClick={() => setIsMainNavOpen(!isMainNavOpen)}
      >
        {isMainNavOpen ? (
          <X className="w-5 h-5 text-gray-600" />
        ) : (
          <Menu className="w-5 h-5 text-gray-600" />
        )}
      </button>

      <Dropdown
        isOpen={isMainNavOpen}
        onClose={() => {
          setIsMainNavOpen(false);
          setIsMobileRankingsOpen(false);
          setIsMobileToolsOpen(false);
        }}
        
        containerRef={containerRef}
      >
        {/* 榜单项 - 可展开 */}
        <div className="relative">
          <button
            className={`flex items-center justify-between gap-3 px-5 py-4 no-underline text-sm font-medium text-center bg-none border-none cursor-pointer w-full ${
              isMobileRankingsOpen
                ? "bg-linear-to-br from-[#5C8DC1]/15 to-[#5C8DC1]/8 text-[#5C8DC1]"
                : "text-gray-500 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:text-[#5C8DC1] hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset]"
            }`}
            onClick={() => setIsMobileRankingsOpen(!isMobileRankingsOpen)}
          >
            <span className="w-full text-sm text-center">
              {loc("Rankings")}
            </span>
            <span
              className={`text-2xl font-light ${isMobileRankingsOpen ? "text-[#5C8DC1]" : "text-gray-400"}`}
            >
              ›
            </span>
          </button>

          {isMobileRankingsOpen && (
            <div className="flex flex-col items-center bg-gray-100 overflow-hidden">
              <Link
                to="/ranking"
                className="flex justify-start items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 ml-2 px-4 py-3.5 border-[#5C8DC1]/20 border-l-2 font-medium text-gray-500 text-[0.85rem] hover:text-[#5C8DC1] no-underline"
              >
                <span className="text-sm text-left">{loc("Recommend")}</span>
              </Link>
              <Link
                to="/ranking/user"
                className="flex justify-start items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 ml-2 px-4 py-3.5 border-[#5C8DC1]/20 border-l-2 font-medium text-gray-500 text-[0.85rem] hover:text-[#5C8DC1] no-underline"
              >
                <span className="text-sm text-left">
                  {loc("UserRankingTitle")}
                </span>
              </Link>
              <Link
                to="/ranking/mmfc"
                className="flex justify-start items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 ml-2 px-4 py-3.5 border-[#5C8DC1]/20 border-l-2 font-medium text-gray-500 text-[0.85rem] hover:text-[#5C8DC1] no-underline"
              >
                <span className="text-sm text-left">{loc("MMFCRanking")}</span>
              </Link>
            </div>
          )}
        </div>

        {/* 工具项 - 可展开 */}
        <div className="relative">
          <button
            className={`flex items-center justify-between gap-3 px-5 py-4 no-underline text-sm font-medium text-center bg-none border-none cursor-pointer w-full ${
              isMobileToolsOpen
                ? "bg-linear-to-br from-[#5C8DC1]/15 to-[#5C8DC1]/8 text-[#5C8DC1]"
                : "text-gray-500 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 hover:text-[#5C8DC1] hover:shadow-[0_2px_8px_rgb(92_141_193/15%),0_1px_0_rgb(92_141_193/10%)_inset]"
            }`}
            onClick={() => setIsMobileToolsOpen(!isMobileToolsOpen)}
          >
            <span className="w-full text-sm text-center">工具</span>
            <span
              className={`text-2xl font-light ${isMobileToolsOpen ? "text-[#5C8DC1]" : "text-gray-400"}`}
            >
              ›
            </span>
          </button>

          {isMobileToolsOpen && (
            <div className="flex flex-col items-center bg-gray-100 overflow-hidden">
              <Link
                to="/edit"
                className="flex justify-start items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 ml-2 px-4 py-3.5 border-[#5C8DC1]/20 border-l-2 font-medium text-gray-500 text-[0.85rem] hover:text-[#5C8DC1] no-underline"
              >
                <span className="text-sm text-left">{loc("ChartEditor")}</span>
              </Link>
              <Link
                to="/play"
                className="flex justify-start items-center gap-3 hover:bg-linear-to-br hover:from-[#5C8DC1]/10 hover:to-[#5C8DC1]/5 ml-2 px-4 py-3.5 border-[#5C8DC1]/20 border-l-2 font-medium text-gray-500 text-[0.85rem] hover:text-[#5C8DC1] no-underline"
              >
                <span className="text-sm text-left">MajdataPlay</span>
              </Link>
            </div>
          )}
        </div>

        <Link
          to="https://docs.majdata.net"
          className={MOBILE_DROPDOWN_ITEM}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="w-full text-sm text-center">文档</span>
        </Link>
        <Link to="/collection/hiroba" className={MOBILE_DROPDOWN_ITEM}>
          <span className="w-full text-sm text-center">
            {loc("CollectionHiroba")}
          </span>
        </Link>
        <Link to="/chart-events" className={MOBILE_DROPDOWN_ITEM}>
          <span className="w-full text-sm text-center">{loc("Contest")}</span>
        </Link>
        <Link to="/eventTag?id=Original" className={MOBILE_DROPDOWN_ITEM}>
          <span className="w-full text-sm text-center">
            {loc("OriginalSongs")}
          </span>
        </Link>
      </Dropdown>
    </nav>
  );
}
