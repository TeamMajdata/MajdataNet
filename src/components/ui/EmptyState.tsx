import type { ReactNode } from 'react';

/** 列表或区块没有内容时的统一占位：虚线框里一行灰字 */
export default function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 px-4 py-14 border border-white/10 border-dashed rounded-2xl text-white/45! text-sm text-center">
      {children}
    </p>
  );
}
