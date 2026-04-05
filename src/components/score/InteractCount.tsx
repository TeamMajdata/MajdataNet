import useSWR from 'swr';
import { endpoints } from '@/config/api';
import type { InteractCountProps, InteractData } from '@/types';

const fetcher = async (...args: [RequestInfo, RequestInit?]) =>
  await fetch(...args).then(async (res) => res.json());

/**
 * 互动计数组件
 * 显示播放次数、点赞数、评论数
 */
export default function InteractCount({ songid }: InteractCountProps) {
  const { data, error, isLoading } = useSWR<InteractData>(
    endpoints.maichart.interactsum(songid),
    fetcher
  );

  if (error) return <div></div>;
  if (isLoading) return <div>..</div>;
  if (data === undefined) return <div>?</div>;

  const commentcount = data.comments;
  const likecount = data.likes;
  let playcount: number | string = data.plays;

  // 播放数大于1000时显示为 k
  if (playcount > 1000) {
    playcount = (playcount / 1000).toFixed(1) + 'k';
  }

  // 点赞或评论数 >= 5 时高亮显示
  const likeStyle = likecount >= 5
    ? { background: 'gold', borderRadius: '5px', fill: 'black' }
    : { background: 'transparent' };

  const commentStyle = commentcount >= 5
    ? { background: 'gold', borderRadius: '5px', fill: 'black' }
    : { background: 'transparent' };

  return (
    <div>
      {/* 播放次数 */}
      <div className="float-left mt-2 ml-0.5 w-[1.3rem] h-[1.3rem] text-[0.8rem] text-center">
        {playcount}
      </div>

      {/* 点赞图标 */}
      <div className="float-left mt-2 ml-0.5 w-[1.3rem] h-[1.3rem]">
        <svg
          className="fill-white stroke-white p-0.5 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          height="24"
          viewBox="0 -960 960 960"
          width="24"
          style={likeStyle}
        >
          <path d="M720-120H280v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h258q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14Zm-360-80h360l120-280v-80H480l54-220-174 174v406Zm0-406v406-406Zm-80-34v80H160v360h120v80H80v-520h200Z" />
        </svg>
      </div>

      {/* 点赞数 */}
      <div className="float-left mt-2 ml-0.5 w-[1.3rem] h-[1.3rem] text-[0.8rem] text-center">
        {likecount}
      </div>

      {/* 评论图标 */}
      <div className="float-left mt-2 ml-0.5 w-[1.3rem] h-[1.3rem]">
        <svg
          className="fill-white stroke-white p-0.5 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          height="24"
          viewBox="0 -960 960 960"
          width="24"
          style={commentStyle}
        >
          <path d="M80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z" />
        </svg>
      </div>

      {/* 评论数 */}
      <div className="float-left mt-2 ml-0.5 w-[1.3rem] h-[1.3rem] text-[0.8rem] text-center">
        {commentcount}
      </div>
    </div>
  );
}
