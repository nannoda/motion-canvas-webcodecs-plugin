import {makeProject} from '@motion-canvas/core';

import example from './scenes/example?scene';
import WebCodecPlugin from './exporter';

export default makeProject({
  scenes: [example],
  plugins: [
    WebCodecPlugin(),
  ],
});
