interface DocLayoutProps {
  sidebar: React.ReactNode;
  topbar?: React.ReactNode;
  content: React.ReactNode;
  toc: React.ReactNode;
}

export default function DocLayout({ sidebar, topbar, content, toc }: DocLayoutProps) {
  return (
    <section className="mt-(--content-top-spacing)">
      <div className="mb-4">{topbar}</div>
      <div className="gap-4 grid lg:grid-cols-[280px_minmax(0,1fr)_240px]">
        <div className="lg:top-[calc(var(--header-height)+1rem)] lg:sticky lg:self-start">{sidebar}</div>
        <div className="min-w-0">{content}</div>
        <div className="hidden lg:block">{toc}</div>
      </div>
    </section>
  );
}
