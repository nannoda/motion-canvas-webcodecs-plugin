import {BoolMetaField, EnumMetaField, MetaField, NumberMetaField, ObjectMetaField} from '@motion-canvas/core/lib/meta';
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
          {text: 'H.265 ()', value: 'h265'},
          {text: 'VP9', value: 'vp9'},
        ],
      ) as EnumMetaField<SupportedVideoCodec>,
      bitrate: new NumberMetaField('bitrate', 1_000_000),
      keyframeInterval: new NumberMetaField('keyframe interval', 200),
    });
  }
};
