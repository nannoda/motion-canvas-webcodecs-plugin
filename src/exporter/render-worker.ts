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
    }
  } catch (e) {
    r.error = e.message;
  }
  respond(r);
};

function getVideoConfig(message: ConfigurationMessageToWorker): VideoEncoderConfig {
  return {
    codec: message.codec,
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
    const videoEncoderConfig: VideoEncoderConfig = getVideoConfig(config);
    this.currentFrame = 0;
    const target: FileSystemWritableFileStreamTarget = new FileSystemWritableFileStreamTarget(stream);
    this.stream = stream;

    const muxer = new Muxer<FileSystemWritableFileStreamTarget>({
      target: target,
      video: {
        codec: 'avc',
        width: config.width,
        height: config.height,
      },
      firstTimestampBehavior: 'strict',
    });

    this.muxer = muxer;

    const init: VideoEncoderInit = {
      output: (chunk: EncodedVideoChunk, metadata: EncodedVideoChunkMetadata) => {
        if (!metadata) {
          return;
        }
        muxer.addVideoChunk(chunk, metadata);
      },
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

  public encodeFrame(frame: ImageBitmap) {
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
    console.log('stop');
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
    throw new Error('No exporter [start]');
  }
}


async function frame(message: FrameMessageToWorker) {
  if (!exporter) {
    throw new Error('No exporter [frame]');
  }
  exporter.encodeFrame(message.content);
}

async function stop(message: StopMessageToWorker) {
  if (!exporter) {
    throw new Error('No exporter [stop]');
  }

  await exporter.stop();
}
