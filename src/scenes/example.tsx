import {makeScene2D, Rect, Txt, Video} from '@motion-canvas/2d';
import {
  all,
  easeInBounce,
  easeInCubic,
  easeInOutBack,
  easeInOutBounce,
  easeInOutCirc, usePlayback,
  waitFor
} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  view.add(<Txt text={'No Mix'}
                position={[-view.width() / 2 + 200, -view.height() / 2 + 100]}
                fontSize={100}
  ></Txt>);
  const rect = new Rect({
    width: 200,
    height: 200,
    fill: 'blue'
  });
  yield view.add(rect);
  yield* rect.position([1000, 0], 0.5, easeInOutCirc);
  yield* rect.position([-1000, 0], 0.5, easeInOutCirc);
  yield* rect.position([0, 0], 0.5, easeInOutCirc);
  yield* rect.position([0, 1000], 0.5, easeInCubic);
  yield* waitFor(1);
});
