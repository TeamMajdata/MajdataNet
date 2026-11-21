import paths from './generated/paths.json' with { type: 'json' };

const eighth = Math.PI / 4;
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const laneAngle = (lane) => (lane - 0.5) * eighth;
export function lanePoint(lane, radius = 480) {
  const angle = laneAngle(lane);
  return { x: Math.sin(angle) * radius, y: -Math.cos(angle) * radius };
}
export function sensorPoint(area, lane) {
  const radii = { A: 410, B: 230, C: 0, D: 410, E: 300 };
  return lanePoint(area === 'D' || area === 'E' ? lane - 0.5 : lane, radii[area]);
}

const cache = new Map();
export function slideShape(start, mark, end, via) {
  const key = [start, mark, end, via].join(':');
  if (cache.has(key)) return cache.get(key);
  const relative = ((end - start + 8) % 8) + 1;
  const upper = [7, 8, 1, 2].includes(start);
  let family,
    mirrored = false;
  switch (mark) {
    case '-':
      family = 'Star_Line';
      break;
    case 'v':
      family = 'Star_V';
      break;
    case 'p':
    case 'q':
      family = 'Star_pq';
      mirrored = mark === 'q';
      break;
    case 'pp':
    case 'qq':
      family = 'Star_ppqq';
      mirrored = mark === 'qq';
      break;
    case '<':
    case '>':
    case '^':
      if (mark === '^' && relative === 5) throw Error('Ambiguous semicircle ^');
      family = 'Star_Circle';
      mirrored = mark === '^' ? relative > 5 : (mark === '>') !== upper;
      break;
    case 'V': {
      const turn = (via - start + 8) % 8;
      if (turn !== 2 && turn !== 6) throw Error('Invalid V turn');
      mirrored = turn === 2;
      family = 'Star_L';
      break;
    }
    case 's':
    case 'z':
    case 'w':
      if (relative !== 5) throw Error('Invalid end lane for ' + mark);
      family = mark === 'w' ? 'Slide_Wifi' : 'Star_S';
      mirrored = mark === 'z';
      break;
    default:
      throw Error('Unknown slide ' + mark);
  }
  const index = mirrored ? ((9 - relative) % 8) + 1 : relative;
  const data = paths[family] ?? paths[family + '_' + index];
  if (!data) throw Error('Invalid slide ' + start + mark + (via ?? '') + end);
  const rotation = (start - 1 + (mirrored ? 1 : 0)) * eighth;
  const cos = Math.cos(rotation),
    sin = Math.sin(rotation);
  function transform([x, y, angle, sx = 1, sy = 1]) {
    if (mirrored) x = -x;
    return {
      x: cos * x - sin * y,
      y: sin * x + cos * y,
      angle: rotation + (mirrored ? -angle : angle),
      sx: mirrored ? -sx : sx,
      sy,
    };
  }
  const bars = data.bars.map(transform);
  const justRight =
    mark === '>'
      ? upper
      : mark === '<'
        ? !upper
        : mark === '^'
          ? relative < 5
          : mark === 'w'
            ? [7, 8, 1, 2].includes(end)
            : end <= 4;
  const just = transform(data.just);
  if (mark === 'w' && !justRight) just.angle += Math.PI;
  else if (!['<', '>', '^', 'w'].includes(mark) && justRight === mirrored) {
    just.angle += Math.PI;
    just.x -= Math.sin(just.angle) * 27;
    just.y += Math.cos(just.angle) * 27;
  }
  const shape = {
    bars,
    start: lanePoint(start),
    end: lanePoint(end),
    just,
    justRight,
    wifi: mark === 'w',
    ends: [end - 1, end, end + 1].map((l) => lanePoint(l)),
    mirrored,
  };
  cache.set(key, shape);
  return shape;
}
