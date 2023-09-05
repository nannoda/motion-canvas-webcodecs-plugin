import {makePlugin} from '@motion-canvas/core/lib/plugin/makePlugin';
import type {ExporterClass} from '@motion-canvas/core/lib/app/Exporter';
import {WebCodecExporterFactory} from './exporter-factory';
import type {Plugin} from '@motion-canvas/core/lib/plugin/Plugin';

export function WebCodecPlugin(): Plugin {
  return makePlugin(
    {
      name: 'webcodec-plugin',
      exporters(): ExporterClass[] {
        return [WebCodecExporterFactory];
      }
    }
  )();
}

export default WebCodecPlugin;