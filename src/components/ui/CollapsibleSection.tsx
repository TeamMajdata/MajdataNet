import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IoChevronDownOutline } from 'react-icons/io5';

interface CollapsibleSectionProps {
  /** Section title, also the label of the toggle button. */
  title: string;
  children: ReactNode;
  /** Whether the section starts expanded; defaults to true. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * A space-page section whose content can be folded away, with the section title and the divider kept visible.
 */
export default function CollapsibleSection({ title, children, defaultOpen = true, className }: CollapsibleSectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={className ?? 'mb-12'}>
      <h2 className="my-6 sm:my-8 font-semibold text-white text-2xl sm:text-3xl text-center [text-shadow:0_2px_4px_rgb(0_0_0/30%)]">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen(value => !value)}
          className="group inline-flex flex-wrap justify-center items-center gap-2 hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 rounded-lg transition-colors cursor-pointer"
        >
          <span>{title}</span>
          <IoChevronDownOutline
            aria-hidden="true"
            className={`opacity-70 group-hover:opacity-100 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
          />
          <span className="sr-only">{open ? t('space/SpacePage.Collapse') : t('space/SpacePage.Expand')}</span>
        </button>
      </h2>
      <div
        className="relative mx-auto my-8 border-0 w-[70%] h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 20%) 15%, rgb(255 255 255 / 40%) 30%, rgb(255 255 255 / 60%) 50%, rgb(255 255 255 / 40%) 70%, rgb(255 255 255 / 20%) 85%, transparent 100%)'
        }}
      />
      {open && <div id={contentId}>{children}</div>}
    </section>
  );
}