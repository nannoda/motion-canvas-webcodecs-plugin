export type SupportedVideoCodec = 'h264' | 'h265';

export interface WebCodecsExporterOptions {
  includeAudio: boolean;
  videoCodec: SupportedVideoCodec;
  videoCodecProfile: string;
  videoCodecLevel: string;
  bitrate: number;
  keyframeInterval: number;
  hardwarePreference: HardwarePreference;
  frameMixing: number;
}