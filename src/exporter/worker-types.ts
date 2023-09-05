import type {SupportedVideoCodec} from './meta-field';

export interface WebCodecsWorker {
  postMessage(message: MessageToWorker, transfer?: Transferable[]): void;

  onmessage: (event: MessageEvent<MessageFromWorker>) => void;

  terminate(): void;
}

export interface ConfigurationMessageToWorker {
  type: 'configuration';
  width: number;
  height: number;
  fps: number;
  codec: SupportedVideoCodec;
  codecVersion: string;
  bitrate: number;
  keyframeInterval: number;
  target: FileSystemFileHandle;
}


export type StopStatus = 'success' | 'aborted' | 'error';

export interface StopMessageToWorker {
  type: 'stop';
  status: StopStatus;
}

export interface StartMessageToWorker {
  type: 'start';
}

export interface FrameMessageToWorker {
  type: 'frame';
  frame: number;
  content: ImageBitmap;
}

export type MessageToWorker =
  ConfigurationMessageToWorker
  | StopMessageToWorker
  | StartMessageToWorker
  | FrameMessageToWorker;

export interface GenericMessageFromWorker {
  error?: string;
}

export type MessageFromWorker = GenericMessageFromWorker;