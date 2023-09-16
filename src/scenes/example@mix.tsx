import {makeScene2D, Rect, Txt} from '@motion-canvas/2d';
import {all, easeInBounce, easeInOutBack, easeInOutBounce, easeInOutCirc, waitFor} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  view.add(<Txt text={'Mix'}
                position={[-view.width() / 2 + 200, -view.height() / 2 + 100]}
                fontSize={100}
  ></Txt>);
  const rect = new Rect({
    width: 100,
    height: 100,
    fill: 'red',
    position: [0, 1000],
  });
  yield view.add(rect);
  yield* rect.position([0, 0], 1);
  yield* all(
    rect.fill('blue', 0.5),
    rect.size([200, 200], 0.5, easeInOutBack),
  );
  yield* rect.position([1000, 0], 0.5, easeInOutCirc);
  yield* rect.position([-1000, 0], 0.5, easeInOutCirc);
  yield* rect.position([0, 0], 0.5, easeInOutCirc);
  // yield* waitFor(1);
});
