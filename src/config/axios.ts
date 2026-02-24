/**
 * Axios实例配置
 */
import axios from 'axios';
import { apiroot3 } from './api';

// 创建axios实例
export const axiosInstance = axios.create({
  baseURL: apiroot3,
  timeout: 10000,
  withCredentials: true, // 支持跨域请求携带cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

export default axiosInstance;
