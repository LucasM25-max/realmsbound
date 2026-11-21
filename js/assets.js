// Asset loader: images and pixel fonts. (Elminster's lines are text-only for now — no voice-over.)

export const IMG = {};
export const VOICE_RAW = {};   // voice-over removed; kept empty so the audio engine needs no special case

const IMAGES = {};   // all pixel art is now drawn procedurally (js/art/*)

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

export async function loadAll(onProgress) {
  const jobs = [];
  let done = 0; const total = Object.keys(IMAGES).length + 2;
  const tick = () => onProgress && onProgress(++done / total);
  for (const [k, src] of Object.entries(IMAGES)) jobs.push(loadImage(src).then(i => { IMG[k] = i; tick(); }));
  jobs.push(document.fonts.load('48px "Jacquard 24"').then(tick));
  jobs.push(document.fonts.load('18px "Pixelify Sans"').then(() => document.fonts.load('bold 18px "Pixelify Sans"')).then(tick));
  await Promise.all(jobs);
}
