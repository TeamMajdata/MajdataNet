import { describe, expect, it } from 'vitest';
import {
  buildChartUploadFormData,
  getChartUploadAccept,
  getChartUploadFileExtension,
  getChartUploadFormatHint,
  isChartUploadFileFormatAccepted,
  toStandardChartUploadFile,
} from '@/utils/chartUploadValidation';

function fileOf(name: string, type = ''): File {
  return new File(['content'], name, { type });
}

describe('chart upload file format validation', () => {
  it.each([
    [0, 'maidata.txt'], [0, 'my-chart.TXT'],
    [1, 'bg.png'], [1, 'COVER.PNG'], [1, 'IMG_0001.JPG'], [1, 'photo.jpeg'],
    [2, 'track.mp3'], [2, 'My Song.mp3'],
    [3, 'pv.mp4'], [3, 'whatever.MP4'],
  ])('accepts field %i by extension regardless of the rest of the name: %s', (index, fileName) => {
    expect(isChartUploadFileFormatAccepted(index, fileName)).toBe(true);
  });

  it.each([
    [0, 'maidata'], [0, 'maidata.json'], [0, 'maidata.txt.bak'],
    [1, 'bg.gif'], [1, 'bg.png.bak'], [1, 'cover.webp'], [1, 'bg'],
    [2, 'track.wav'], [2, 'track.ogg'], [2, 'track.mp3.bak'],
    [3, 'pv.mov'], [3, 'pv.mp4.bak'],
    [9, 'bg.png'],
  ])('rejects field %i for unsupported formats: %s', (index, fileName) => {
    expect(isChartUploadFileFormatAccepted(index, fileName)).toBe(false);
  });

  it('reads the last extension case-insensitively', () => {
    expect(getChartUploadFileExtension('IMG_0001.JPG')).toBe('.jpg');
    expect(getChartUploadFileExtension('archive.tar.gz')).toBe('.gz');
    expect(getChartUploadFileExtension('maidata')).toBe('');
  });

  it('uses extension-only accept values so mobile browsers open the file picker', () => {
    for (let index = 0; index < 4; index += 1) {
      expect(getChartUploadAccept(index)).not.toMatch(/[a-z]+\//);
    }
    expect(getChartUploadAccept(0)).toBe('.txt');
    expect(getChartUploadAccept(1)).toBe('.png,.jpg,.jpeg');
    expect(getChartUploadAccept(2)).toBe('.mp3');
    expect(getChartUploadAccept(3)).toBe('.mp4');
  });

  it('formats the accepted extensions for the error message', () => {
    expect(getChartUploadFormatHint(1)).toBe('.png / .jpg / .jpeg');
    expect(getChartUploadFormatHint(3)).toBe('.mp4');
  });
});

describe('standard upload file names', () => {
  it.each([
    [0, 'my chart.txt', 'maidata.txt'],
    [1, 'cover.png', 'bg.png'],
    [1, 'IMG_0001.JPG', 'bg.jpg'],
    [1, 'photo.jpeg', 'bg.jpg'],
    [2, 'My Song.mp3', 'track.mp3'],
    [3, 'whatever.MP4', 'pv.mp4'],
  ])('renames field %i file %s to %s', (index, source, expected) => {
    const standard = toStandardChartUploadFile(index, fileOf(source));
    expect(standard).not.toBeNull();
    expect(standard!.name).toBe(expected);
  });

  it('sets the MIME type from the standard extension', () => {
    const standard = toStandardChartUploadFile(1, fileOf('photo.jpeg', 'application/octet-stream'));
    expect(standard?.type).toBe('image/jpeg');
  });

  it('returns an already standard file untouched', () => {
    const original = fileOf('bg.png', 'image/png');
    expect(toStandardChartUploadFile(1, original)).toBe(original);
  });

  it('rejects unsupported formats and unknown slots', () => {
    expect(toStandardChartUploadFile(1, fileOf('bg.gif'))).toBeNull();
    expect(toStandardChartUploadFile(9, fileOf('bg.png'))).toBeNull();
  });
});

describe('upload form data', () => {
  it('appends standard names in slot order and skips empty slots', () => {
    const formData = buildChartUploadFormData([
      fileOf('my chart.txt', 'text/plain'),
      fileOf('IMG_0001.JPG', 'image/jpeg'),
      fileOf('My Song.mp3', 'audio/mpeg'),
      null,
    ]);

    const files = formData.getAll('formfiles') as File[];
    expect(files.map((file) => file.name)).toEqual(['maidata.txt', 'bg.jpg', 'track.mp3']);
    expect(files.map((file) => file.type)).toEqual(['text/plain', 'image/jpeg', 'audio/mpeg']);
  });

  it('keeps the optional video when it is chosen', () => {
    const formData = buildChartUploadFormData([
      fileOf('maidata.txt'),
      fileOf('bg.png'),
      fileOf('track.mp3'),
      fileOf('clip.mp4'),
    ]);

    expect((formData.getAll('formfiles') as File[]).map((file) => file.name))
      .toEqual(['maidata.txt', 'bg.png', 'track.mp3', 'pv.mp4']);
  });
});
