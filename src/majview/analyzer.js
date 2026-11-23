// Note-density analysis for the player progress bar, a port of MajdataPlay's ChartAnalyzer
// (Assets/Scripts/Utils/ChartAnalyzer.cs): the chart is cut into 64 equally long bars, every
// note adds to the bar of its time, and the bars are normalized to the busiest one.
//
// A tap and a hold count as one tap, a slide path counts as two (it was one slide note before
// MajSimai 3.0 split the star head out), a touch and a touch hold as one touch. The star head
// of a slide counts for it, so it adds nothing of its own.
export const ANALYZER_BAR_COUNT = 64;

export const ANALYZER_COLORS = {
  tap: '#e5518f',
  slide: '#3e8ead',
  touch: '#f1a739',
};

/**
 * @param {readonly { time: number, kind: string }[]} notes the notes of `compileChart()`
 * @param {number} length the time the graph spans, in seconds (the seek bar's length)
 * @param {number} [start] the time of the left edge, in seconds (the chart start)
 * @param {number} [barCount] how many bars to cut the chart into
 * @returns {{ bars: { tap: number, slide: number, touch: number }[], max: number }} one bar per
 *   slot, normalized so the busiest bar is 1 high
 */
export function analyzeChart(notes, length, start = 0, barCount = ANALYZER_BAR_COUNT) {
  const bars = Array.from({ length: barCount }, () => ({ tap: 0, slide: 0, touch: 0 }));
  if (!(length > 0)) return { bars, max: 0 };

  for (const note of notes) {
    const slot = Math.floor(((note.time - start) / length) * barCount);
    const bar = bars[Math.min(barCount - 1, Math.max(0, slot))];
    switch (note.kind) {
      case 'tap':
      case 'hold':
        bar.tap += 1;
        break;
      case 'slide':
        bar.slide += 2;
        break;
      case 'touch':
      case 'touchHold':
        bar.touch += 1;
        break;
      // 'star' is a slide head: the slide it belongs to is what counts.
    }
  }

  let max = 0;
  for (const bar of bars) max = Math.max(max, bar.tap + bar.slide + bar.touch);
  if (max > 0) {
    for (const bar of bars) {
      bar.tap /= max;
      bar.slide /= max;
      bar.touch /= max;
    }
  }
  return { bars, max };
}
