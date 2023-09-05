import {FileSystemWritableFileStreamTarget, Muxer} from 'mp4-muxer';

import type {
  ConfigurationMessageToWorker,
  FrameMessageToWorker,
  MessageFromWorker,
  MessageToWorker,
  StartMessageToWorker,
  StopMessageToWorker
} from './worker-types';

function respond(message: MessageFromWorker) {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<MessageToWorker>) => {
  const messageToWorker: MessageToWorker = event.data;
  let r = {} as MessageFromWorker;
  try {
    switch (messageToWorker.type) {
      case 'configuration':
        await configuration(messageToWorker);
        break;
      case 'stop':
        await stop(messageToWorker);
        break;
      case 'frame':
        await frame(messageToWorker);
        break;
      case 'start':
        await start(messageToWorker);
        break;
    }
  } catch (e) {
    r.error = e.message;
  }
  respond(r);
};

function getVideoConfig(message: ConfigurationMessageToWorker): VideoEncoderConfig {
  return {
    codec: message.codecVersion,
    width: message.width,
    height: message.height,
    bitrate: message.bitrate,
    framerate: message.fps,
  };
}

class OffScreenVideoExporter {
  encoder: VideoEncoder;
  muxer: Muxer<FileSystemWritableFileStreamTarget>;
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  config: ConfigurationMessageToWorker;
  currentFrame: number;
  stream: FileSystemWritableFileStream;

  public constructor(config: ConfigurationMessageToWorker, stream: FileSystemWritableFileStream) {
    this.config = config;
    console.log(config);
    const videoEncoderConfig: VideoEncoderConfig = getVideoConfig(config);
    this.currentFrame = 0;
    const target: FileSystemWritableFileStreamTarget = new FileSystemWritableFileStreamTarget(stream);
    this.stream = stream;

    let codecForMuxer: 'avc' | 'hevc' = 'avc';

    switch (config.codec) {
      case 'h264':
        codecForMuxer = 'avc';
        break;
      case 'h265':
        codecForMuxer = 'hevc';
        break;
    }

    console.log('creating muxer', config);

    this.muxer = new Muxer<FileSystemWritableFileStreamTarget>({
      target: target,
      video: {
        codec: codecForMuxer,
        width: config.width,
        height: config.height,
      },
      firstTimestampBehavior: 'strict',
    });

    const init: VideoEncoderInit = {
      output: this.handleChunk.bind(this),
      error: (error) => {
        console.log('error in encoder');
        console.log(error);
      }
    };
    this.encoder = new VideoEncoder(init);
    this.encoder.configure(videoEncoderConfig);
    this.canvas = new OffscreenCanvas(config.width, config.height);
    this.ctx = this.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  }

  protected handleChunk(chunk: EncodedVideoChunk, metadata: EncodedVideoChunkMetadata) {
    if (!metadata) {
      return;
    }
    this.muxer.addVideoChunk(chunk, metadata);
  }

  public async encodeFrame(frame: ImageBitmap) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(frame, 0, 0);

    const fps = this.config.fps as number;

    const videoFrame: VideoFrame = new VideoFrame(this.canvas, {
      timestamp: Math.floor(this.currentFrame * (1_000_000 / fps)),
      duration: 1_000_000 / fps,
    });
    const isKeyFrame = this.currentFrame % this.config.keyframeInterval === 0;
    this.encoder.encode(videoFrame, {keyFrame: isKeyFrame});
    frame.close();
    this.currentFrame++;
  }

  async stop() {
    await this.encoder.flush();
    this.muxer.finalize();
    await this.stream.close();
  }
}

let exporter: OffScreenVideoExporter | null = null;

async function configuration(message: ConfigurationMessageToWorker) {
  const support = await VideoEncoder.isConfigSupported(getVideoConfig(message));
  if (!support.supported) {
    throw new Error('Unsupported configuration');
  }
  const writableStream = await message.target.createWritable();
  exporter = new OffScreenVideoExporter(message, writableStream);
}

async function start(message: StartMessageToWorker) {
  if (!exporter) {
    throw new Error('Exporter failed to initialize, please check the configuration.');
  }
}


async function frame(message: FrameMessageToWorker) {
  if (!exporter) {
    // throw new Error('No exporter [frame]');
    return;
  }
  await exporter.encodeFrame(message.content);
}

async function stop(message: StopMessageToWorker) {
  if (!exporter) {
    // throw new Error('No exporter [stop]');
    return;
  }
  await exporter.stop();
}
