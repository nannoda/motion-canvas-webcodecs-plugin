import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import exampleMix from './scenes/example@mix?scene';
import WebCodecPlugin from './exporter';
import Kalimba from './scenes/Kalimba.mp3';

export default makeProject({
  scenes: [exampleMix, example],
  plugins: [
    WebCodecPlugin(),
  ],
  audio: Kalimba,
});
