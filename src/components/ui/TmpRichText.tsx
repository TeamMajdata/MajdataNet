import { parseTmpRichText } from '@/utils/richTextUtils';

/**
 * React component that renders TMP rich text.
 * Falls back to a plain <span> with the stripped text if parsing fails.
 */
export default function TmpRichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const rendered = parseTmpRichText(text);
  if (rendered === text) {
    return <>{text}</>;
  }
  return <span className={className}>{rendered}</span>;
}
