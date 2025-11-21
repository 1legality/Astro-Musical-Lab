const DRUM_SAMPLE_URLS = {
  BD: new URL('../../content/drum-kit/kick.wav', import.meta.url).href,
  SN: new URL('../../content/drum-kit/snare-m.wav', import.meta.url).href,
  RS: new URL('../../content/drum-kit/stick-m.wav', import.meta.url).href,
  CL: new URL('../../content/drum-kit/clap.wav', import.meta.url).href,
  CH: new URL('../../content/drum-kit/hihat-closed-short.wav', import.meta.url).href,
  OH: new URL('../../content/drum-kit/hihat-open.wav', import.meta.url).href,
  CY: new URL('../../content/drum-kit/crash.wav', import.meta.url).href,
  CB: new URL('../../content/drum-kit/cowb.wav', import.meta.url).href,
  LT: new URL('../../content/drum-kit/tom-l.wav', import.meta.url).href,
  MT: new URL('../../content/drum-kit/tom-m.wav', import.meta.url).href,
  HT: new URL('../../content/drum-kit/tom-h.wav', import.meta.url).href,
  SH: new URL('../../content/drum-kit/cabasa.wav', import.meta.url).href,
  HC: new URL('../../content/drum-kit/conga-h.wav', import.meta.url).href,
  LC: new URL('../../content/drum-kit/conga-l.wav', import.meta.url).href,
  AC: new URL('../../content/drum-kit/crash.wav', import.meta.url).href,
  RIDE: new URL('../../content/drum-kit/ride.wav', import.meta.url).href,
} as const;

const INSTRUMENT_TO_SAMPLE: Record<string, keyof typeof DRUM_SAMPLE_URLS> = {
  BD: 'BD',
  SN: 'SN',
  RS: 'RS',
  CL: 'CL',
  CH: 'CH',
  OH: 'OH',
  CY: 'CY',
  CB: 'CB',
  LT: 'LT',
  MT: 'MT',
  HT: 'HT',
  SH: 'SH',
  HC: 'HC',
  LC: 'LC',
  AC: 'AC',
  RIDE: 'RIDE',
};

type SampleKey = keyof typeof DRUM_SAMPLE_URLS;

export class DrumSampler {
  private audioContext: AudioContext | null = null;
  private buffers = new Map<SampleKey, AudioBuffer>();
  private loading = new Map<SampleKey, Promise<AudioBuffer | null>>();

  private getContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext;
    if (typeof window === 'undefined') return null;
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) return null;
    this.audioContext = new Ctor();
    return this.audioContext;
  }

  public async ensureContextResumed(): Promise<void> {
    const context = this.getContext();
    if (!context) return;
    if (context.state === 'suspended') {
      await context.resume().catch(() => {});
    }
  }

  private async loadBuffer(sample: SampleKey): Promise<AudioBuffer | null> {
    if (this.buffers.has(sample)) {
      return this.buffers.get(sample) ?? null;
    }
    const context = this.getContext();
    if (!context) return null;
    const existing = this.loading.get(sample);
    if (existing) return existing;
    const promise = (async () => {
      try {
        const response = await fetch(DRUM_SAMPLE_URLS[sample]);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
        this.buffers.set(sample, decoded);
        return decoded;
      } catch (error) {
        console.warn('Unable to load drum sample', sample, error);
        return null;
      }
    })();
    this.loading.set(sample, promise);
    return promise;
  }

  public preload(instruments: string[]): void {
    instruments.forEach((instrument) => {
      const sampleKey = INSTRUMENT_TO_SAMPLE[instrument];
      if (sampleKey) {
        void this.loadBuffer(sampleKey);
      }
    });
  }

  public async play(instrument: string): Promise<void> {
    const sampleKey = INSTRUMENT_TO_SAMPLE[instrument];
    if (!sampleKey) return;
    const context = this.getContext();
    if (!context) return;
    const buffer = await this.loadBuffer(sampleKey);
    if (!buffer) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    const baseGain = instrument === 'CY' ? 0.5 : instrument === 'AC' ? 0.5 : 0.95;
    gain.gain.value = baseGain;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
  }

  public dispose(): void {
    this.buffers.clear();
    this.loading.clear();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

export { DRUM_SAMPLE_URLS };
