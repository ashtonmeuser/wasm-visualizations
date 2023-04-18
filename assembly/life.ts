const COLOR_ALIVE: u32 = 0xD392E6 | 1;
const COLOR_DEAD: u32  = 0xA61B85 & ~1;
const BIT_ROT: u32 = 10;
export let offset: usize = heap.alloc(0);
var width: i32, height: i32, area: i32;

// Import functions
// @ts-expect-error
@external("env", "draw_image")
declare function draw_image(p: usize, s: usize): void

// Perform one tick
export function update(tick: i64, time: f64): void {
  // Copy output to input
  memory.copy(offset, offset + (area << 2), area << 2);

  var w = width, h = height;
  var hm1 = h - 1, wm1 = w - 1;

  // Universe is an infinite 2D orthogonal grid of square cells, each dead or alive
  for (let y = 0; y < h; ++y) {
    let ym1 = y == 0 ? hm1 : y - 1,
        yp1 = y == hm1 ? 0 : y + 1;
    for (let x = 0; x < w; ++x) {
      let xm1 = x == 0 ? wm1 : x - 1,
          xp1 = x == wm1 ? 0 : x + 1;

      // Interact with neighbors; least significant bit indicates dead or alive
      let aliveNeighbors = (
        (get(xm1, ym1) & 1) + (get(x, ym1) & 1) + (get(xp1, ym1) & 1) +
        (get(xm1, y  ) & 1)                     + (get(xp1, y  ) & 1) +
        (get(xm1, yp1) & 1) + (get(x, yp1) & 1) + (get(xp1, yp1) & 1)
      );

      let self = get(x, y);
      if (self & 1) {
        // A live cell with 2 or 3 live neighbors rots on to the next generation
        if ((aliveNeighbors & 0b1110) == 0b0010) rot(x, y, self);
        // A live cell with fewer than 2 or more than 3 live neighbors dies
        else set(x, y, COLOR_DEAD | 0xff000000);
      } else {
        // A dead cell with exactly 3 live neighbors becomes a live cell
        if (aliveNeighbors == 3) set(x, y, COLOR_ALIVE | 0xff000000);
        // A dead cell with fewer or more than 3 live neighbors just rots
        else rot(x, y, self);
      }
    }
  }

  draw_image(offset + (area << 2), area << 2);
}

// User interaction
export function interact(x: f64, y: f64, v: f64): void {
  if (v <= 0.0) clear();
  else perturb(x, y);
}

// Resize image
export function resize(w: i64, h: i64): void {
  if (w == width && h == height) return;
  width  = <i32>w;
  height = <i32>h;
  area = width * height;
  offset = heap.realloc(offset, area << 3);

  fill_random();
}

// Fill output with random values
function fill_random(): void {
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      let c = Math.random() > 0.1
        ? COLOR_DEAD  & 0x00ffffff
        : COLOR_ALIVE | 0xff000000;
      set(x, y, c);
    }
  }
}

// Random row & column cells
function perturb(x: f64, y: f64): void {
  const p = 0.5;
  for (let ix = 0; ix < width; ++ix) {
    if (Math.random() < p) set(ix, <u32>(y * height), COLOR_ALIVE | 0xff000000);
  }
  for (let iy = 0; iy < height; ++iy) {
    if (Math.random() < p) set(<u32>(x * width), iy, COLOR_ALIVE | 0xff000000);
  }
}

// Clear input and output
function clear(): void {
  memory.fill(offset, 0, area << 3);
}

// Gets an input pixel
// @ts-expect-error
@inline function get(x: u32, y: u32): u32 {
  return load<u32>(offset + ((y * width + x) << 2));
}

// Sets an output pixel
// @ts-expect-error
@inline function set(x: u32, y: u32, v: u32): void {
  store<u32>(offset + ((area + y * width + x) << 2), v);
}

// Sets and fades output pixel
// @ts-expect-error
@inline function rot(x: u32, y: u32, v: u32): void {
  var alpha = max<i32>((v >> 24) - BIT_ROT, 0);
  set(x, y, (alpha << 24) | (v & 0x00ffffff));
}
