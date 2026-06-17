import { toast } from "react-toastify";
import { useLoc } from "@/hooks";

/**
 * Majdata.Net Logo 组件
 * 点击会显示彩蛋提示
 */
export default function MajdataLogo() {
  const loc = useLoc();

  const handleClick = () => {
    toast.error(loc("FUCKYOU", "FUCK YOU"), {
      position: "top-center",
      autoClose: 500,
    });
  };

  return (
    <div className="relative flex flex-row items-center gap-3 cursor-pointer">
      <img
        className="inline m-2.5 rounded h-12.5 transition-transform hover:scale-105 active:scale-95"
        src="../../../icons/now_loading.png"
        onClick={handleClick}
        alt="xxlb"
      />
    </div>
  );
}
