import 'i18next';
import type en from '@/locales/en.json';

// 以英文语言包为准生成 key 的类型：t() 传入不存在的 key 时会在编译期报错。
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
