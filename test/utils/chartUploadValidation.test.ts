import { describe, expect, it } from 'vitest';
import { getExpectedChartUploadFileNames, isValidChartUploadFileName } from '@/utils/chartUploadValidation';

describe('chart upload file name validation', () => {
  it.each([
    [0, 'maidata.txt'], [1, 'bg.png'], [1, 'bg.jpg'], [2, 'track.mp3'], [3, 'bg.mp4'], [3, 'pv.mp4'],
  ])('accepts the exact allowed name for field %i: %s', (index, fileName) => {
    expect(isValidChartUploadFileName(index, fileName)).toBe(true);
  });

  it.each([
    [0, 'MAIDATA.TXT'], [0, 'maidata.txt.bak'], [0, ' maidata.txt'],
    [1, 'BG.png'], [1, 'bg.jpeg'], [2, 'Track.mp3'], [2, 'track.mp3 '],
    [3, 'PV.MP4'], [3, 'video.mp4'],
  ])('rejects case differences and partial or extra text for field %i: %s', (index, fileName) => {
    expect(isValidChartUploadFileName(index, fileName)).toBe(false);
  });

  it('formats every allowed alternative for the error message', () => {
    expect(getExpectedChartUploadFileNames(1)).toBe('bg.png/bg.jpg');
    expect(getExpectedChartUploadFileNames(3)).toBe('bg.mp4/pv.mp4');
  });
});
