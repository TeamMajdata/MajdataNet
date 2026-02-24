import { useState } from 'react';
import { PageLayout } from '@/components';

/**
 * 布局组件演示页面
 * 展示 PageLayout、UnifiedHeader、FloatingButtons 等布局组件的功能
 */
export default function LayoutDemo() {
  const [showAds, setShowAds] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showBackToHome, setShowBackToHome] = useState(true);
  const [useAmbientBackground, setUseAmbientBackground] = useState(true);
  const [pageTitle, setPageTitle] = useState('布局组件演示');

  return (
    <PageLayout
      title={pageTitle}
      showAds={showAds}
      showFooter={showFooter}
      showBackToHome={showBackToHome}
      useAmbientBackground={useAmbientBackground}
      className="layout-demo"
    >
      <div className="demo-container">
        {/* 页面说明 */}
        <section className="demo-section intro-section">
          <h2 className="section-title">🎨 布局组件演示</h2>
          <p className="section-description">
            这个页面展示了新迁移的布局组件系统。你可以通过控制面板调整各种布局选项。
          </p>
        </section>

        {/* 控制面板 */}
        <section className="demo-section controls-section">
          <h3 className="subsection-title">⚙️ 布局控制面板</h3>
          <div className="controls-grid">
            <label className="control-item">
              <input
                type="checkbox"
                checked={showAds}
                onChange={(e) => setShowAds(e.target.checked)}
              />
              <span>显示广告</span>
            </label>

            <label className="control-item">
              <input
                type="checkbox"
                checked={showFooter}
                onChange={(e) => setShowFooter(e.target.checked)}
              />
              <span>显示页脚</span>
            </label>

            <label className="control-item">
              <input
                type="checkbox"
                checked={showBackToHome}
                onChange={(e) => setShowBackToHome(e.target.checked)}
              />
              <span>显示返回首页按钮</span>
            </label>

            <label className="control-item">
              <input
                type="checkbox"
                checked={useAmbientBackground}
                onChange={(e) => setUseAmbientBackground(e.target.checked)}
              />
              <span>使用粒子背景</span>
            </label>

            <div className="control-item full-width">
              <label>
                <span>页面标题：</span>
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="title-input"
                  placeholder="输入页面标题"
                />
              </label>
            </div>
          </div>
        </section>

        {/* 组件列表 */}
        <section className="demo-section components-section">
          <h3 className="subsection-title">📦 已迁移的布局组件</h3>
          <div className="components-grid">
            <div className="component-card">
              <div className="component-icon">🎯</div>
              <h4 className="component-name">PageLayout</h4>
              <p className="component-description">
                页面布局容器，提供统一的页面结构、背景、头部、内容区和页脚
              </p>
              <div className="component-tags">
                <span className="tag">容器组件</span>
                <span className="tag">核心</span>
              </div>
            </div>

            <div className="component-card">
              <div className="component-icon">🧭</div>
              <h4 className="component-name">UnifiedHeader</h4>
              <p className="component-description">
                统一顶部导航栏，包含Logo、导航菜单、用户下拉菜单、移动端适配
              </p>
              <div className="component-tags">
                <span className="tag">导航</span>
                <span className="tag">响应式</span>
              </div>
            </div>

            <div className="component-card">
              <div className="component-icon">🎈</div>
              <h4 className="component-name">FloatingButtons</h4>
              <p className="component-description">
                浮动按钮组，包含返回顶部和语言设置按钮
              </p>
              <div className="component-tags">
                <span className="tag">交互</span>
                <span className="tag">固定定位</span>
              </div>
            </div>

            <div className="component-card">
              <div className="component-icon">✨</div>
              <h4 className="component-name">AmbientBackground</h4>
              <p className="component-description">
                环境粒子背景动画，使用 EaselJS 和 GSAP 创建视觉效果
              </p>
              <div className="component-tags">
                <span className="tag">动画</span>
                <span className="tag">Canvas</span>
              </div>
            </div>

            <div className="component-card">
              <div className="component-icon">📢</div>
              <h4 className="component-name">AdComponent</h4>
              <p className="component-description">
                广告组件，用于显示 Google AdSense 广告
              </p>
              <div className="component-tags">
                <span className="tag">广告</span>
              </div>
            </div>

            <div className="component-card">
              <div className="component-icon">👤</div>
              <h4 className="component-name">UserInfo</h4>
              <p className="component-description">
                用户信息组件，显示用户头像和用户名，或显示登录链接
              </p>
              <div className="component-tags">
                <span className="tag">用户</span>
                <span className="tag">认证</span>
              </div>
            </div>

            <div className="component-card">
              <div className="component-icon">🚪</div>
              <h4 className="component-name">Logout</h4>
              <p className="component-description">
                登出组件，处理用户登出逻辑
              </p>
              <div className="component-tags">
                <span className="tag">认证</span>
              </div>
            </div>
          </div>
        </section>

        {/* 技术特性 */}
        <section className="demo-section features-section">
          <h3 className="subsection-title">💡 技术特性</h3>
          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <div className="feature-content">
                <strong>TypeScript完整类型定义</strong>
                <p>所有组件都有完整的 Props 接口和类型注解</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <div className="feature-content">
                <strong>React Router v7集成</strong>
                <p>使用 Link 组件替代 Next.js 的 Link，保持一致的导航体验</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <div className="feature-content">
                <strong>响应式设计</strong>
                <p>移动端和桌面端完全适配，包含汉堡菜单和下拉菜单</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <div className="feature-content">
                <strong>毛玻璃效果</strong>
                <p>backdrop-filter 和渐变背景，提供现代化视觉体验</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <div className="feature-content">
                <strong>国际化支持</strong>
                <p>所有文本使用 loc() 函数，支持多语言切换</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <div className="feature-content">
                <strong>用户认证集成</strong>
                <p>使用 useUser Hook 获取用户信息，统一的登出处理</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <div className="feature-content">
                <strong>Toast通知系统</strong>
                <p>集成 react-toastify，提供友好的用户反馈</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <div className="feature-content">
                <strong>样式文件迁移</strong>
                <p>完整复制了 CSS 样式文件，保持与 legacy 版本一致的外观</p>
              </div>
            </div>
          </div>
        </section>

        {/* 使用示例 */}
        <section className="demo-section usage-section">
          <h3 className="subsection-title">📝 使用示例</h3>
          <div className="code-example">
            <pre><code>{`import { PageLayout } from '@/components';

export default function MyPage() {
  return (
    <PageLayout
      title="我的页面"
      showAds={true}
      showFooter={true}
      showBackToHome={true}
      useAmbientBackground={true}
    >
      <div className="my-content">
        {/* 页面内容 */}
      </div>
    </PageLayout>
  );
}`}</code></pre>
          </div>
        </section>

        {/* 测试区域 */}
        <section className="demo-section test-section">
          <h3 className="subsection-title">🧪 功能测试</h3>
          <div className="test-instructions">
            <p>请测试以下功能：</p>
            <ul>
              <li>✅ 点击右下角的"↑"按钮返回顶部</li>
              <li>✅ 点击右下角的"🌐"按钮切换语言</li>
              <li>✅ 点击顶部导航栏的菜单项进行导航</li>
              <li>✅ 如果已登录，点击用户头像查看下拉菜单</li>
              <li>✅ 调整浏览器窗口大小，测试响应式布局</li>
              <li>✅ 观察粒子背景动画效果</li>
            </ul>
          </div>
        </section>

        {/* 占位内容 - 用于测试滚动 */}
        <section className="demo-section placeholder-section">
          <h3 className="subsection-title">📄 占位内容（测试滚动）</h3>
          <div className="placeholder-content">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="placeholder-block">
                <h4>占位区块 {i + 1}</h4>
                <p>
                  这是一些占位内容，用于测试页面滚动功能。
                  向下滚动页面，然后点击右下角的返回顶部按钮。
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .layout-demo {
          padding-bottom: 2rem;
        }

        .demo-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .demo-section {
          background: rgb(30 30 30 / 90%);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid rgb(255 255 255 / 12%);
          box-shadow: 0 8px 25px rgb(0 0 0 / 30%);
        }

        .section-title {
          font-size: 2rem;
          font-weight: 700;
          color: #e5e5e5;
          margin: 0 0 1rem 0;
        }

        .section-description {
          color: #a0a0a0;
          font-size: 1rem;
          line-height: 1.6;
          margin: 0;
        }

        .subsection-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #e5e5e5;
          margin: 0 0 1.5rem 0;
        }

        .controls-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .control-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgb(255 255 255 / 5%);
          border-radius: 8px;
          border: 1px solid rgb(255 255 255 / 10%);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .control-item:hover {
          background: rgb(255 255 255 / 10%);
          border-color: rgb(255 255 255 / 20%);
        }

        .control-item.full-width {
          grid-column: 1 / -1;
          flex-direction: column;
          align-items: flex-start;
        }

        .control-item input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .control-item span {
          color: #e5e5e5;
          font-size: 0.95rem;
        }

        .title-input {
          width: 100%;
          padding: 0.75rem;
          background: rgb(255 255 255 / 5%);
          border: 1px solid rgb(255 255 255 / 10%);
          border-radius: 8px;
          color: #e5e5e5;
          font-size: 0.95rem;
          margin-top: 0.5rem;
        }

        .title-input:focus {
          outline: none;
          border-color: rgb(59 130 246 / 50%);
          box-shadow: 0 0 0 2px rgb(59 130 246 / 20%);
        }

        .components-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .component-card {
          background: rgb(255 255 255 / 5%);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgb(255 255 255 / 10%);
          transition: all 0.3s ease;
        }

        .component-card:hover {
          background: rgb(255 255 255 / 8%);
          border-color: rgb(59 130 246 / 30%);
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgb(59 130 246 / 20%);
        }

        .component-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .component-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e5e5e5;
          margin: 0 0 0.5rem 0;
        }

        .component-description {
          color: #a0a0a0;
          font-size: 0.9rem;
          line-height: 1.5;
          margin: 0 0 1rem 0;
        }

        .component-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .tag {
          background: rgb(59 130 246 / 20%);
          color: rgb(59 130 246 / 90%);
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: rgb(255 255 255 / 5%);
          border-radius: 8px;
          border: 1px solid rgb(255 255 255 / 10%);
        }

        .feature-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .feature-content strong {
          color: #e5e5e5;
          display: block;
          margin-bottom: 0.25rem;
        }

        .feature-content p {
          color: #a0a0a0;
          font-size: 0.9rem;
          margin: 0;
        }

        .code-example {
          background: rgb(0 0 0 / 40%);
          border-radius: 8px;
          padding: 1.5rem;
          overflow-x: auto;
        }

        .code-example pre {
          margin: 0;
          color: #e5e5e5;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .test-instructions p {
          color: #e5e5e5;
          margin: 0 0 1rem 0;
        }

        .test-instructions ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .test-instructions li {
          color: #a0a0a0;
          font-size: 0.95rem;
          padding-left: 1.5rem;
          position: relative;
        }

        .placeholder-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .placeholder-block {
          background: rgb(255 255 255 / 5%);
          border-radius: 8px;
          padding: 1.5rem;
          border: 1px solid rgb(255 255 255 / 10%);
        }

        .placeholder-block h4 {
          color: #e5e5e5;
          margin: 0 0 0.5rem 0;
        }

        .placeholder-block p {
          color: #a0a0a0;
          margin: 0;
        }

        @media (width <= 768px) {
          .components-grid {
            grid-template-columns: 1fr;
          }

          .controls-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </PageLayout>
  );
}
