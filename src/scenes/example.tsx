import {makeScene2D, Rect} from '@motion-canvas/2d';
import {waitFor} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  // Create your animations here
  const rect = new Rect({
    width: 100,
    height: 100,
    fill: 'red',
    position: [0, 0],
  });

  // yield* view.add(rect);
  yield view.add(rect);
 yield* rect.position([100, 100], 1);
 yield* rect.fill('blue', 1);
 yield* rect.position([200, 200], 1);
 yield* rect.fill('green', 1);

  // yield* waitFor(5);
});
