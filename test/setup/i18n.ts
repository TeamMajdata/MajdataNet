import i18n from '@/i18n';

// 组件测试使用真实的 i18next 实例和语言包，断言用户实际看到的文案，而不是 mock 掉翻译函数。
await i18n.changeLanguage('zh');
