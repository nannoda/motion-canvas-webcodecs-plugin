export type SupportedVideoCodec = 'h264' | 'h265' | 'vp9';

export interface WebCodecsExporterOptions {
  includeAudio: boolean;
  videoCodec: SupportedVideoCodec;
  bitrate: number;
  keyframeInterval: number;
  hardwarePreference: HardwarePreference;
}