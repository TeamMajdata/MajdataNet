/**
 * 增强的描述组件 - 自动识别并美化描述中的链接
 * 迁移自 legacy/src/app/widgets/EnhancedDescription.jsx
 */

import type { EnhancedDescriptionProps } from '@/types';
import React from 'react';

const EnhancedDescription: React.FC<EnhancedDescriptionProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // 简单的URL正则表达式
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // 检查文本中是否包含链接
  if (!urlRegex.test(text)) {
    // 没有链接，直接返回原文本
    return <span className={className}>{text}</span>;
  }

  // 分割文本并处理链接
  const parts = text.split(urlRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // 检查这部分是否是URL
        if (urlRegex.test(part)) {
          // 提取域名用于显示
          const domain = part.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          const displayText = domain.length > 20 ? domain.substring(0, 20) + '...' : domain;
          
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline transition-colors"
              title={part}
              onClick={(e) => e.stopPropagation()}
            >
              <span>🔗</span>
              <span>{displayText}</span>
              <span>→</span>
            </a>
          );
        }
        // 普通文本
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default EnhancedDescription;
