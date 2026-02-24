/**
 * API配置文件
 * 从legacy项目迁移
 */

// 开发环境使用代理（相对路径），生产环境使用完整URL
const isDev = import.meta.env.DEV;

export const apiroot1 = isDev ? '/api1/api' : 'https://majdata.net/api1/api';
export const apiroot2 = isDev ? '/api2/api' : 'https://majdata.net/api2/api';
export const apiroot3 = isDev ? '/api3/api' : 'https://majdata.net/api3/api';

// DEBUG模式 - 本地后端开发
// export const apiroot3 = 'http://localhost:5022/api';
