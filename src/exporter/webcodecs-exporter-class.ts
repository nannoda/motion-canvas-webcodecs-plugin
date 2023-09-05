import {Exporter} from '@motion-canvas/core/lib/app/Exporter';
import type {Project} from '@motion-canvas/core/lib/app/Project';
import type {RendererSettings} from '@motion-canvas/core/lib/app/Renderer';
import {RendererResult} from '@motion-canvas/core/lib/app/Renderer';
import RenderWorker from './render-worker?worker';
import {MessageFromWorker, MessageToWorker, StopStatus, WebCodecsWorker} from './worker-types';
import {AVC, HEVC, VP} from 'media-codecs';
import {WebCodecsExporterOptions} from './meta-field';

export interface WebCodecsRendererSettings extends RendererSettings {
  exporter: {
    name: '@webcodecs';
    options: WebCodecsExporterOptions;
  };
}

export class WebCodecsExporterClass implements Exporter {
  project: Project;
  settings: WebCodecsRendererSettings;
  worker: WebCodecsWorker | null = null;

  constructor(project: Project, settings: WebCodecsRendererSettings) {
    this.project = project;
    this.settings = settings;
  }

  async sendToWorker(message: MessageToWorker): Promise<MessageFromWorker> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject('worker not started');
        return;
      }
      const worker = this.worker;
      this.worker.onmessage = (event) => {
        resolve(event.data);
      };
      switch (message.type) {
        case 'configuration':
          worker.postMessage(message);
          break;
        case 'frame':
          worker.postMessage(message, [message.content]);
          break;
        default:
          worker.postMessage(message);
      }
    });
  }

  async configuration(): Promise<RendererSettings | void> {
    return this.settings;
  }

  async getHandle(): Promise<FileSystemFileHandle> {
    const options = {
      types: [
        {
          description: 'Output Video',
          accept: {'video/mp4': ['.mp4']},
        },
      ],
    };
    return await window.showSaveFilePicker(options);
  }


  async start(): Promise<void> {
    this.worker = new RenderWorker();
    const settings = this.settings;

    const width = settings.size.width * settings.resolutionScale;
    const height = settings.size.height * settings.resolutionScale;


    let versionStr = '';
    const videoCodec = settings.exporter.options.videoCodec;
    const videoCodecProfile = settings.exporter.options.videoCodecProfile;
    const videoCodecLevel = settings.exporter.options.videoCodecLevel;

    switch (settings.exporter.options.videoCodec) {
      case 'h264':
        versionStr = AVC.getCodec({profile: videoCodecProfile, level: videoCodecLevel});
        break;
      case 'h265':
        versionStr = HEVC.getCodec({
          profile: videoCodecProfile,
          level: videoCodecLevel,
          compatibility: 0,
          tier: 'Main',
          constraint: '',
        });
        break;
    }


    await this.sendToWorker({
      type: 'configuration',
      width,
      height,
      fps: settings.fps,
      codec: this.settings.exporter.options.videoCodec,
      codecVersion: versionStr,
      bitrate: settings.exporter.options.bitrate || 5_000_000_000, // 5 Mbps
      keyframeInterval: settings.exporter.options.keyframeInterval,
      target: await this.getHandle(),
    });

    const result = await this.sendToWorker({type: 'start'});
    if (result.error) {
      this.error(result.error);
    }
  }

  async handleFrame(canvas: HTMLCanvasElement, frame: number, sceneFrame: number, sceneName: string, signal: AbortSignal): Promise<void> {
    const content = await createImageBitmap(canvas);
    const result = await this.sendToWorker({type: 'frame', frame, content});
    if (result.error) {
      this.project.logger.error(result.error);
    }
  }

  async stop(result: RendererResult): Promise<void> {
    if (!this.worker) {
      return;
    }
    let status: StopStatus = 'error';

    switch (result) {
      case RendererResult.Success:
        status = 'success';
        break;
      case RendererResult.Aborted:
        status = 'aborted';
        break;
      case RendererResult.Error:
        status = 'error';
        break;
    }


    await this.sendToWorker(
      {
        type: 'stop',
        status: status,
      }
    );
  }

  error(message: string): void {
    this.project.logger.error(message);
  }
}