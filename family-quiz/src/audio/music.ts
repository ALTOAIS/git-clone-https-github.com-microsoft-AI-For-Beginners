/**
 * Фоновая музыка квиза, синтезируемая Web Audio API прямо в браузере:
 * никаких аудиофайлов — сборка остаётся одним автономным index.html.
 *
 * Стиль — спокойный луп в духе квиз-шоу: мягкие аккорды Am–F–C–G,
 * бас, редкие «плаки» пентатоники и тихий хай-хэт. На экране победителя
 * поверх лупа играют фанфары.
 */

function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const BPM = 92;
const STEP = 60 / BPM / 4; // шестнадцатая
const TOTAL_STEPS = 64; // 4 такта по 16 шагов
const MASTER_VOLUME = 0.18;

// Аккорды по тактам: Am — F — C — G
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const BASS = [45, 41, 48, 43];
// Редкая мелодия из пентатоники ля-минора (шаг лупа → нота MIDI)
const MELODY: Record<number, number> = {
  3: 69, 11: 72, 19: 74, 27: 76, 35: 72, 43: 69, 51: 76, 59: 79,
};

/** Одиночная нота с быстрой атакой и плавным затуханием. */
function tone(
  ctx: BaseAudioContext,
  dest: AudioNode,
  note: number,
  t: number,
  duration: number,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = midiToFreq(note);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(dest);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/** Мягкая аккордовая подложка: расстроенные пилообразные волны через фильтр. */
function pad(ctx: BaseAudioContext, dest: AudioNode, notes: number[], t: number): void {
  const duration = STEP * 14;
  for (const note of notes) {
    for (const detune of [-5, 5]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = midiToFreq(note);
      osc.detune.value = detune;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 750;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.028, t + 0.08);
      gain.gain.setValueAtTime(0.028, t + duration * 0.6);
      gain.gain.linearRampToValueAtTime(0, t + duration);
      osc.connect(filter).connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    }
  }
}

function createNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Тихий хай-хэт из фильтрованного шума. */
function hat(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, t: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.035, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  src.connect(filter).connect(gain).connect(dest);
  src.start(t);
}

/** Один шаг секвенсора (16-я нота) в момент времени t. */
function scheduleStep(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  step: number,
  t: number,
): void {
  const bar = Math.floor(step / 16);
  const pos = step % 16;
  if (pos === 0) {
    pad(ctx, dest, CHORDS[bar], t);
    tone(ctx, dest, BASS[bar], t, 0.5, 0.16);
  }
  if (pos === 8) tone(ctx, dest, BASS[bar], t, 0.35, 0.13);
  if (pos === 10) tone(ctx, dest, BASS[bar] + 7, t, 0.2, 0.09);
  if (pos % 4 === 2) hat(ctx, dest, noise, t);
  const melodyNote = MELODY[step];
  if (melodyNote !== undefined) tone(ctx, dest, melodyNote, t, 0.3, 0.07);
}

/** Фанфары победителя: восходящее арпеджио и финальный аккорд. */
function fanfare(ctx: BaseAudioContext, dest: AudioNode, t: number): void {
  const arpeggio = [72, 76, 79, 84];
  arpeggio.forEach((note, i) => tone(ctx, dest, note, t + i * 0.13, 0.3, 0.14));
  arpeggio.forEach((note) => tone(ctx, dest, note, t + 0.55, 1.4, 0.09));
}

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timerId: number | null = null;
  private nextNoteTime = 0;
  private step = 0;

  playing = false;

  get contextState(): string {
    return this.ctx?.state ?? 'none';
  }

  /** Создаёт/возобновляет AudioContext. Вызывается только из клика — иначе браузер заблокирует звук. */
  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  start(): void {
    const ctx = this.ensure();
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;
    // Планировщик с небольшим упреждением — ноты ставятся точно по сетке
    this.timerId = window.setInterval(() => {
      while (this.nextNoteTime < ctx.currentTime + 0.2) {
        scheduleStep(ctx, this.master!, this.noiseBuffer!, this.step, this.nextNoteTime);
        this.nextNoteTime += STEP;
        this.step = (this.step + 1) % TOTAL_STEPS;
      }
    }, 90);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.playing = false;
  }

  /** Фанфары победителя — играют только если музыка включена. */
  playFanfare(): void {
    if (!this.playing || !this.ctx || !this.master) return;
    fanfare(this.ctx, this.master, this.ctx.currentTime + 0.05);
  }
}

export const music = new MusicEngine();

/** Офлайн-рендер демо (луп + фанфары в конце) — для прослушивания и автотестов. */
export async function renderDemo(seconds = 14): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(44100 * seconds), 44100);
  const master = ctx.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(ctx.destination);
  const noise = createNoiseBuffer(ctx);
  const totalSteps = Math.floor((seconds - 2.5) / STEP);
  for (let i = 0; i < totalSteps; i++) {
    scheduleStep(ctx, master, noise, i % TOTAL_STEPS, 0.05 + i * STEP);
  }
  fanfare(ctx, master, seconds - 2.4);
  return ctx.startRendering();
}

// Для отладки и автоматической проверки
declare global {
  interface Window {
    __quizMusic?: MusicEngine;
    __quizMusicRender?: typeof renderDemo;
  }
}
if (typeof window !== 'undefined') {
  window.__quizMusic = music;
  window.__quizMusicRender = renderDemo;
}
