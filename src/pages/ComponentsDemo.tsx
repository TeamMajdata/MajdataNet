import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MajdataLogo from '@/components/MajdataLogo';
import Level from '@/components/Level';
import Levels from '@/components/Levels';
import CoverPic from '@/components/CoverPic';
import InteractCount from '@/components/InteractCount';
import ScoreCount from '@/components/ScoreCount';
import { useI18n } from '@/hooks/useI18n';

/**
 * UI组件演示页面
 * 展示所有已迁移的基础UI组件
 */
export default function ComponentsDemo() {
  const { t } = useI18n();
  const [songId, setSongId] = useState('1');
  const [uploader, setUploader] = useState('Vanilla');

  // 示例难度数据
  const exampleLevels = ['7', '9', '11', '13', '14+', '15', ''];

  return (
    <div className="bg-gray-900 p-8 min-h-screen text-white">
      <ToastContainer />
      
      <div className="space-y-12 mx-auto max-w-6xl">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="mb-2 font-bold text-4xl">UI组件演示</h1>
          <p className="text-gray-400">阶段5: 基础UI组件迁移测试</p>
        </div>

        {/* Logo 组件 */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="mb-4 font-semibold text-2xl">1. MajdataLogo 组件</h2>
          <div className="flex justify-center">
            <MajdataLogo />
          </div>
          <p className="mt-4 text-gray-400 text-sm text-center">
            提示：点击图片会有彩蛋提示
          </p>
        </section>

        {/* Level 组件 */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="mb-4 font-semibold text-2xl">2. Level 组件（单个难度）</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Level level="0" difficulty="Easy 7" songid="123" />
            <Level level="1" difficulty="Basic 9" songid="123" />
            <Level level="2" difficulty="Advanced 11" songid="123" />
            <Level level="3" difficulty="Expert 13" songid="123" />
            <Level level="4" difficulty="Master 14+" songid="123" />
            <Level level="5" difficulty="ReMaster 15" songid="123" />
          </div>
          <p className="mt-4 text-gray-400 text-sm">
            说明：点击会触发 Unity 交互回调（如果存在）
          </p>
        </section>

        {/* Levels 组件 */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="mb-4 font-semibold text-2xl">3. Levels 组件（多难度列表）</h2>
          <div className="flex justify-center">
            <Levels levels={exampleLevels} songid="456" />
          </div>
          <p className="mt-4 text-gray-400 text-sm">
            显示数据：{JSON.stringify(exampleLevels)}
          </p>
        </section>

        {/* CoverPic 组件 */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="mb-4 font-semibold text-2xl">4. CoverPic 组件（封面图片）</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">歌曲ID：</label>
              <input
                type="text"
                value={songId}
                onChange={(e) => setSongId(e.target.value)}
                className="bg-gray-700 px-4 py-2 rounded w-64"
                placeholder="输入歌曲ID"
              />
            </div>
            <div className="flex justify-center">
              <CoverPic id={songId} display={`ID: ${songId}`} />
            </div>
            <p className="text-gray-400 text-sm text-center">
              提示：点击图片可查看大图
            </p>
          </div>
        </section>

        {/* InteractCount 组件 */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="mb-4 font-semibold text-2xl">5. InteractCount 组件（互动计数）</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">歌曲ID：</label>
              <input
                type="text"
                value={songId}
                onChange={(e) => setSongId(e.target.value)}
                className="bg-gray-700 px-4 py-2 rounded w-64"
                placeholder="输入歌曲ID"
              />
            </div>
            <div className="flex justify-center">
              <InteractCount songid={songId} />
            </div>
            <p className="text-gray-400 text-sm">
              显示：播放次数、点赞数、评论数（≥5时高亮金色）
            </p>
          </div>
        </section>

        {/* ScoreCount 组件 */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="mb-4 font-semibold text-2xl">6. ScoreCount 组件（分数统计）</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">上传者用户名：</label>
              <input
                type="text"
                value={uploader}
                onChange={(e) => setUploader(e.target.value)}
                className="bg-gray-700 px-4 py-2 rounded w-64"
                placeholder="输入用户名"
              />
            </div>
            <div>
              <ScoreCount uploader={uploader} page={0} pageSize={5} />
            </div>
            <p className="text-gray-400 text-sm">
              显示：该上传者谱面的玩家评分排行榜（每30秒自动刷新）
            </p>
          </div>
        </section>

        {/* 组件列表总结 */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="mb-4 font-semibold text-2xl">✅ 已完成迁移的组件</h2>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold text-green-400">基础展示组件</h3>
              <ul className="space-y-1 mt-2 text-sm">
                <li>✓ MajdataLogo - Logo组件</li>
                <li>✓ Level - 单个难度等级</li>
                <li>✓ Levels - 多难度列表</li>
                <li>✓ CoverPic - 封面图片</li>
              </ul>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold text-green-400">功能组件</h3>
              <ul className="space-y-1 mt-2 text-sm">
                <li>✓ InteractCount - 互动计数</li>
                <li>✓ ScoreCount - 分数统计</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 技术栈说明 */}
        <section className="bg-gray-800 p-6 rounded-lg">
          <h2 className="mb-4 font-semibold text-2xl">📦 使用的技术栈</h2>
          <div className="gap-4 grid grid-cols-2 md:grid-cols-3 text-sm">
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-semibold text-blue-400">react-toastify</div>
              <div className="text-gray-400">通知提示</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-semibold text-blue-400">react-photo-view</div>
              <div className="text-gray-400">图片查看器</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-semibold text-blue-400">SWR</div>
              <div className="text-gray-400">数据获取</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-semibold text-blue-400">TypeScript</div>
              <div className="text-gray-400">类型安全</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-semibold text-blue-400">Tailwind CSS</div>
              <div className="text-gray-400">样式框架</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-semibold text-blue-400">Vite</div>
              <div className="text-gray-400">构建工具</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
