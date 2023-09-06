import {
  BoolMetaField,
  EnumMetaField,
  MetaField,
  NumberMetaField,
  ObjectMetaField,
  StringMetaField
} from '@motion-canvas/core/lib/meta';
import type {SupportedVideoCodec, WebCodecsExporterOptions} from './meta-field';
import type {Exporter, ExporterClass} from '@motion-canvas/core/lib/app/Exporter';
import type {RendererSettings} from '@motion-canvas/core/lib/app/Renderer';
import type {Project} from '@motion-canvas/core/lib/app/Project';
import {WebCodecsExporterClass, WebCodecsRendererSettings} from './webcodecs-exporter-class';

export const WebCodecExporterFactory: ExporterClass = {
  displayName: 'Video (WebCodecs)',
  id: '@webcodecs',
  async create(project: Project, settings: RendererSettings): Promise<Exporter> {
    console.log('create', project, settings);
    return new WebCodecsExporterClass(project, settings as WebCodecsRendererSettings);
  },
  meta(project: Project): MetaField<WebCodecsExporterOptions> {
    return new ObjectMetaField(this.displayName, {
      includeAudio: new BoolMetaField('include audio', true).disable(!project.audio),
      videoCodec: new EnumMetaField(
        'format',
        [
          {text: 'H.264 (AVC)', value: 'h264'},
          {text: 'H.265 (HEVC)', value: 'h265'},
        ],
      ) as EnumMetaField<SupportedVideoCodec>,
      videoCodecProfile: new StringMetaField<string>('profile', 'Main'),
      videoCodecLevel: new StringMetaField<string>('level', '5.1'),
      bitrate: new NumberMetaField('bitrate', 1_000_000),
      keyframeInterval: new NumberMetaField('keyframe interval', 200),
      hardwarePreference: new EnumMetaField(
        'hardware preference',
        [
          {text: 'Default', value: 'no-preference'},
          {text: 'Prefer hardware', value: 'prefer-hardware'},
          {text: 'Prefer software', value: 'prefer-software'},
        ],
      ) as EnumMetaField<HardwarePreference>,
      frameMixing: new NumberMetaField('frame mixing', 0),
    });
  }
};

