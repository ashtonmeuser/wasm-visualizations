import { GRADIENT } from "./gradient"

const ITERATION_LIMIT: u32 = 40;
export let offset: usize = heap.alloc(0);
let width: u32, height: u32;

// Import functions
// @ts-expect-error
@external("env", "draw_image")
declare function draw_image(p: usize, s: usize): void

// Draw mandelbrot
export function update(tick: i64, time: f64): void {
  var translateX = width  * (1.0 / 1.6);
  var translateY = height * (1.0 / 2.0);
  var scale      = 10.0 / min(3 * width, 4 * height);
  var realOffset = translateX * scale;
  var invLimit   = 1.0 / ITERATION_LIMIT;

  var minIterations = min(8, ITERATION_LIMIT);

  for (let y: u32 = 0; y < height; ++y) {
    let imaginary = (y - translateY) * scale;

    for (let x: u32 = 0; x < width; ++x) {
      let real = x * scale - realOffset;

      // Iterate until either the escape radius or iteration limit is exceeded
      let ix = 0.0, iy = 0.0, ixSq: f64, iySq: f64;
      let iteration: u32 = 0;
      while ((ixSq = ix * ix) + (iySq = iy * iy) <= 4.0) {
        iy = 2.0 * ix * iy + imaginary;
        ix = ixSq - iySq + real;
        if (iteration >= ITERATION_LIMIT) break;
        ++iteration;
      }

      // Do a few extra iterations for quick escapes to reduce error margin
      while (iteration < minIterations) {
        let ixNew = ix * ix - iy * iy + real;
        iy = 2.0 * ix * iy + imaginary;
        ix = ixNew;
        ++iteration;
      }

      // Map to color gradient
      let index: u8 = 0xFF;
      let distanceSq = ix * ix + iy * iy;
      if (distanceSq > 1.0) {
        let fraction = Math.log2(0.5 * Math.log(distanceSq));
        index = <u8>(0xFF * clamp<f64>((iteration + 1 - fraction) * invLimit, 0.0, 1.0));
      }

      store<u32>(offset + ((width * y + x) << 2), GRADIENT[index + <u8>(time * 20.0)]);
    }
  }

  draw_image(offset, width * height * 4);
}

// Clamp a value between the given minimum and maximum
function clamp<T extends number>(value: T, minValue: T, maxValue: T): T {
  return min(max(value, minValue), maxValue);
}

// Resize image
export function resize(w: i64, h: i64): void {
  width = <u32>w;
  height = <u32>h;
  offset = heap.realloc(offset, (width * height) << 2);
}
