import { Link } from "react-router-dom";
import { useLoc } from "@/hooks";

/**
 * 登录/注册入口（未登录状态，顶栏文字链接）
 */
export default function AuthSection() {
  const loc = useLoc();

  return (
    <Link
      to="/login"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-ink-2 hover:text-primary hover:bg-primary-soft text-sm no-underline transition-colors duration-150"
    >
      {loc("Login")} / {loc("Register")}
    </Link>
  );
}
