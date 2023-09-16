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
  worker: WebCodecsWorker;
  pastFrames: ImageBitmap[] = [];

  fileHandle?: FileSystemFileHandle;

  constructor(project: Project, settings: WebCodecsRendererSettings) {
    this.project = project;
    this.settings = settings;
    this.worker = new RenderWorker();
  }

  async sendToWorker(message: MessageToWorker): Promise<MessageFromWorker> {
    return new Promise((resolve, reject) => {
      const worker = this.worker;
      this.worker.onmessage = (event) => {
        resolve(event.data);
      };
      switch (message.type) {
        case 'frame':
          worker.postMessage(message, [message.content]);
          break;
        default:
          worker.postMessage(message);
          break;
      }
    });
  }

  async getHandle(): Promise<FileSystemFileHandle> {
    if (this.fileHandle) {
      return this.fileHandle;
    }
    const options = {
      types: [
        {
          description: 'Output Video',
          accept: {'video/mp4': ['.mp4']},
        },
      ],
    };
    this.fileHandle = await window.showSaveFilePicker(options);
    return this.fileHandle;
  }

  async start(): Promise<void> {
    const settings = this.settings;
    const width = settings.size.width * settings.resolutionScale;
    const height = settings.size.height * settings.resolutionScale;
    this.pastFrames = [];

    // if (this.project.audio) {
    //   console.log('audio', this.project.audio);
    //   const audioSrc: string = this.project.audio;
    //   const audio = await fetch(audioSrc);
    //   const audioBuffer = await audio.arrayBuffer();
    //   const audioContext = new AudioContext();
    //   const audioBufferSource = audioContext.createBufferSource();
    //   const audioBufferSourcePromise = audioContext.decodeAudioData(audioBuffer);
    //   audioContext.
    //   const t = await audioBufferSourcePromise;
    //   audioBufferSource.buffer = t;
    //   audioBufferSource.connect(audioContext.destination);
    //   audioBufferSource.start();
    // }

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
    const configResult = await this.sendToWorker({
      type: 'configuration',
      width,
      height,
      fps: settings.fps,
      codec: videoCodec,
      codecVersion: versionStr,
      bitrate: settings.exporter.options.bitrate, // 5 Mbps
      keyframeInterval: settings.exporter.options.keyframeInterval,
      target: await this.getHandle(),
      audio: this.project.audio,
    });
    if (configResult.error) {
      this.error(configResult.error);
    }
    const startResult = await this.sendToWorker({type: 'start'});
    if (startResult.error) {
      this.error(startResult.error);
    }
  }

  shouldMixFrame(sceneName: string): boolean {
    return sceneName.endsWith('@mix');
  }

  async handleFrame(canvas: HTMLCanvasElement, frame: number, sceneFrame: number, sceneName: string, signal: AbortSignal): Promise<void> {
    if (this.pastFrames.length > this.settings.exporter.options.frameMixing) {
      this.pastFrames.shift();
    }

    if (!this.shouldMixFrame(sceneName)) {
      this.pastFrames = [];
    }

    const _canvas = new OffscreenCanvas(canvas.width, canvas.height);
    const _ctx = _canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    _ctx.globalAlpha = 1 / (this.pastFrames.length + 1);
    this.pastFrames.push(await createImageBitmap(canvas));

    for (const pastFrame of this.pastFrames) {
      _ctx.drawImage(pastFrame, 0, 0);
    }
    const content = await createImageBitmap(_canvas);

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