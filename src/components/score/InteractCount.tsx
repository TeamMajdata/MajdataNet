import useSWR from "swr";
import { endpoints } from "@/config/api";
import { Play, ThumbsUp, MessageCircle } from "lucide-react";
import type { InteractCountProps, InteractData } from "@/types";

const fetcher = async (...args: [RequestInfo, RequestInit?]) =>
  await fetch(...args).then(async (res) => res.json());

/**
 * 互动计数组件
 * 显示播放次数、点赞数、评论数
 */
export default function InteractCount({ songid }: InteractCountProps) {
  const { data, error, isLoading } = useSWR<InteractData>(
    endpoints.maichart.interactsum(songid),
    fetcher,
  );

  if (error) return <div></div>;
  if (isLoading) return <div>..</div>;
  if (data === undefined) return <div>?</div>;

  const commentcount = data.comments;
  const likecount = data.likes;
  let playcount: number | string = data.plays;

  // 播放数大于1000时显示为 k
  if (playcount > 1000) {
    playcount = (playcount / 1000).toFixed(1) + "k";
  }

  // 点赞或评论数 >= 5 时高亮显示
  const likeHighlight = likecount >= 5;
  const commentHighlight = commentcount >= 5;

  return (
    <div className="flex items-center gap-2.5">
      {/* 播放次数 */}
      <div className="flex items-center gap-0.5 text-primary">
        <Play size={12} />
        <span className="text-[0.75rem] text-ink-3 font-medium">
          {playcount}
        </span>
      </div>

      {/* 点赞 */}
      <div className="flex items-center gap-0.5">
        <ThumbsUp
          size={12}
          className={likeHighlight ? "text-warn" : "text-primary"}
        />
        <span
          className={`text-[0.75rem] font-medium ${likeHighlight ? "text-warn" : "text-ink-3"}`}
        >
          {likecount}
        </span>
      </div>

      {/* 评论 */}
      <div className="flex items-center gap-0.5">
        <MessageCircle
          size={12}
          className={commentHighlight ? "text-warn" : "text-primary"}
        />
        <span
          className={`text-[0.75rem] font-medium ${commentHighlight ? "text-warn" : "text-ink-3"}`}
        >
          {commentcount}
        </span>
      </div>
    </div>
  );
}
