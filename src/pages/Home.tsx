import { useI18n } from '../hooks/useI18n';
import { Link } from 'react-router-dom';
import UtilsDemo from '../components/UtilsDemo';
import I18nDemo from '../components/I18nDemo';
import LanguageSelector from '../components/LanguageSelector';

/**
 * 首页组件
 */
export default function Home() {
  const { isReady, t } = useI18n();

  if (!isReady) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 border-blue-600 border-b-2 rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-gray-600">{t('Loading', '加载中...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br from-blue-50 to-purple-50 py-12 min-h-screen">
      {/* 头部 */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 font-bold text-gray-900 text-5xl">
          Majdata Net
        </h1>
        <p className="mb-4 text-gray-600 text-xl">
          {t('ProductIntro', '项目重构进行中')} - 阶段6
        </p>
        
        {/* 语言选择器 */}
        <div className="flex justify-center mb-6">
          <LanguageSelector />
        </div>

        {/* 导航按钮 */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <Link
            to="/events-demo"
            className="bg-purple-600 hover:bg-purple-700 shadow-md px-6 py-3 rounded-lg font-semibold text-white transition-colors"
          >
            {t('EventsDemo', '活动数据演示')} →
          </Link>
          <Link
            to="/components-demo"
            className="bg-blue-600 hover:bg-blue-700 shadow-md px-6 py-3 rounded-lg font-semibold text-white transition-colors"
          >
            组件演示 →
          </Link>
          <Link
            to="/layout-demo"
            className="bg-green-600 hover:bg-green-700 shadow-md px-6 py-3 rounded-lg font-semibold text-white transition-colors"
          >
            布局演示 →
          </Link>
        </div>

        {/* 进度指示 */}
        <div className="inline-block bg-white shadow-md mt-4 px-6 py-4 rounded-lg text-sm text-left">
          <p className="mb-1 text-green-600">✓ {t('QuickStart', '阶段1')}: 基础框架搭建完成</p>
          <p className="mb-1 text-green-600">✓ 阶段2: API配置和基础工具迁移完成</p>
          <p className="mb-1 text-green-600">✓ 阶段3: 国际化系统迁移完成</p>
          <p className="mb-1 text-green-600">✓ 阶段4: 工具函数层迁移完成</p>
          <p className="mb-1 text-green-600">✓ 阶段5: 基础UI组件迁移完成</p>
          <p className="font-semibold text-blue-600">→ 阶段6: 布局组件迁移完成</p>
          <p className="mt-2 text-gray-400">{t('Loading', '待迁移')}: 页面组件</p>
        </div>
      </div>
      
      {/* 国际化演示 */}
      <I18nDemo />
      
      {/* 工具函数演示 */}
      <UtilsDemo />
    </div>
  );
}
