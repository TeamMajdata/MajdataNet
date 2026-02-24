/**
 * 国际化演示组件
 */
import { useI18n } from '../hooks/useI18n';

export default function I18nDemo() {
  const { t, language } = useI18n();

  const commonKeys = [
    'HomePage',
    'Login',
    'Logout',
    'Register',
    'Upload',
    'Download',
    'Like',
    'Comment',
    'Share',
    'Search',
    'Loading',
    'Back',
  ];

  const actionKeys = [
    'UploadChart',
    'ChartsManagement',
    'AccountSetting',
    'LanguageSettings',
    'UserCenter',
  ];

  return (
    <div className="bg-white shadow-md mx-auto mt-8 p-8 rounded-lg max-w-4xl">
      <h2 className="mb-2 font-bold text-gray-800 text-2xl">
        {t('LanguageSettings', '语言设置')}
      </h2>
      <p className="mb-6 text-gray-500 text-sm">
        当前语言: <span className="font-semibold text-blue-600">{language}</span>
      </p>

      {/* 常用词汇 */}
      <div className="mb-8">
        <h3 className="mb-4 pb-2 border-b font-semibold text-gray-700 text-lg">
          {t('CommonTags', '常用标签')}
        </h3>
        <div className="gap-3 grid grid-cols-2 md:grid-cols-3">
          {commonKeys.map((key) => (
            <div
              key={key}
              className="flex justify-between items-center bg-linear-to-r from-blue-50 to-purple-50 p-3 border border-blue-100 rounded-lg"
            >
              <span className="font-mono text-gray-500 text-xs">{key}</span>
              <span className="font-medium text-blue-700">{t(key, key)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 功能操作 */}
      <div className="mb-8">
        <h3 className="mb-4 pb-2 border-b font-semibold text-gray-700 text-lg">
          {t('ProductIntro', '功能介绍')}
        </h3>
        <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
          {actionKeys.map((key) => (
            <div
              key={key}
              className="bg-linear-to-r from-green-50 to-teal-50 hover:shadow-md p-4 border border-green-100 rounded-lg transition-shadow"
            >
              <div className="mb-1 text-gray-500 text-sm">{key}</div>
              <div className="font-semibold text-green-700">{t(key, key)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 示例句子 */}
      <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
        <h3 className="mb-3 font-semibold text-yellow-800 text-lg">
          {t('Test', '测试')}
        </h3>
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">
            <span className="font-medium">{t('MajdataPunchline', '')}</span>
          </p>
          <p className="text-gray-700">
            <span className="font-medium">{t('RecommendedChartsHint', '')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
