import { getLevelName, getComboState, formatLevel } from '../utils';

/**
 * 工具函数测试组件
 */
export default function UtilsDemo() {
  return (
    <div className="bg-white shadow-md mx-auto mt-8 p-8 rounded-lg max-w-4xl">
      <h2 className="mb-6 font-bold text-gray-800 text-2xl">工具函数测试</h2>
      
      {/* 难度等级测试 */}
      <div className="mb-6">
        <h3 className="mb-3 font-semibold text-gray-700 text-lg">难度等级工具</h3>
        <div className="gap-3 grid grid-cols-2">
          {[0, 1, 2, 3, 4, 5, 6].map((level) => (
            <div key={level} className="flex justify-between items-center bg-gray-50 p-3 rounded">
              <span className="text-gray-600">Level {level}:</span>
              <span className="font-medium text-blue-600">{getLevelName(level)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Combo状态测试 */}
      <div className="mb-6">
        <h3 className="mb-3 font-semibold text-gray-700 text-lg">Combo状态工具</h3>
        <div className="gap-3 grid grid-cols-2">
          {[0, 1, 2, 3, 4].map((state) => (
            <div key={state} className="flex justify-between items-center bg-gray-50 p-3 rounded">
              <span className="text-gray-600">State {state}:</span>
              <span className="font-medium text-green-600">
                {getComboState(state) || '(无)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 等级格式化测试 */}
      <div className="mb-6">
        <h3 className="mb-3 font-semibold text-gray-700 text-lg">等级格式化工具</h3>
        <div className="gap-3 grid grid-cols-3">
          {['13', '13+', '14', '14+', '15'].map((level) => {
            const formatted = formatLevel(level);
            return (
              <div key={level} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                <span className="text-gray-600">{level}:</span>
                <span className="font-medium text-purple-600">
                  {formatted.base}
                  {formatted.plus && <sup>+</sup>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* API配置信息 */}
      <div className="bg-blue-50 mt-6 p-4 border border-blue-200 rounded">
        <h3 className="mb-2 font-semibold text-blue-800 text-lg">API配置</h3>
        <p className="text-blue-700 text-sm">
          ✓ axios实例配置完成<br />
          ✓ 支持跨域cookie<br />
          ✓ 请求/响应拦截器已配置
        </p>
      </div>
    </div>
  );
}
