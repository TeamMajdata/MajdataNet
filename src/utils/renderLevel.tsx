import React from 'react';

/**
 * 渲染等级数字，支持加号显示为上标
 * @param level - 等级字符串，如 "13+", "14"
 * @returns JSX.Element
 */
export function renderLevel(level: string): JSX.Element {
  if (level.endsWith('+')) {
    return (
      <>
        {level.substring(0, level.length - 1)}
        <sup>+</sup>
      </>
    );
  }
  return <>{level}</>;
}
