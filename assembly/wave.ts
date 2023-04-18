const FORCE_DAMPING = 4; // Bit shift
const STATE_START: u8 = 0, STATE_RUN: u8 = 1, STATE_STOP: u8 = 2;
const STATUS_WALL: u8 = 1, STATUS_SOURCE_POS: u8 = 2, STATUS_SOURCE_NEG: u8 = 3;
export let image: usize = heap.alloc(0);
export let force: usize = image;
export let status: usize = image;
export let u: usize = image;
export let v: usize = image;
let state: u8 = STATE_START;
let width: i32, height: i32, area: i32;

// Import functions
// @ts-expect-error
@external("env", "draw_image")
declare function draw_image(p: usize, s: usize): void

// Perform one tick
export function update(tick: i64, time: f64): void {
  if (state === STATE_START && tick >= 60) state = STATE_RUN;
  const amplitude: i32 = <i32>(0x3FFFFFFF * Math.sin(time * 10.0));
  const damping: i32 = state === STATE_RUN ? 0 : 5; // Bit shift

  // Sources only transmit in start state
  if (state === STATE_START) {
    for (let i = 0; i < area; ++i) {
      const s = get(status, i);
      if (s === STATUS_SOURCE_POS) {
        set(u, i, amplitude);
        set(v, i, 0);
        set(force, i, 0);
      }
      if (s === STATUS_SOURCE_NEG) {
        set(u, i, -amplitude);
        set(v, i, 0);
        set(force, i, 0);
      }
    }
  }

  for (let i = 0; i < area; ++i) {
    if (get(status, i) !== STATUS_WALL) {
      let uCen   = get(u, i);
      let uNorth = get(u, i - width);
      let uSouth = get(u, i + width);
      let uEast  = get(u, i + 1);
      let uWest  = get(u, i - 1);

      let uxx = (((uWest  + uEast)  >> 1) - uCen);
      let uyy = (((uNorth + uSouth) >> 1) - uCen);

      let vel = get(v, i) + (uxx >> 1) + (uyy >> 1);
      if (damping) vel -= vel >> damping;

      set(v, i, clamp(vel));
    }
  }

  for (let i = 0; i < area; ++i) {
    let stat = get(status, i);
    let val = get(u, i);
    if (stat !== STATUS_WALL) {
      let f = get(force, i);
      let capped = clamp(val + get(v, i));
      val = clamp(f + capped);
      set(u, i, val);
      set(force, i,  f - (f >> FORCE_DAMPING));
      set(image, i, rgb(val));
    } else {
      set(image, i, 0x00000000);
    }
  }

  draw_image(image, area << 2);
}

// User interaction
export function interact(x: f64, y: f64, v: f64): void {
  if (v <= 0.0) state = STATE_STOP;
  else perturb(x, y);
}

// Resize image
export function resize(w: i64, h: i64): void {
  state = STATE_START;
  width  = <i32>w;
  height = <i32>h;
  area = width * height;
  const bytes = (area << 2);
  image = heap.realloc(image, bytes * 5);
  force = image + bytes
  status = force + bytes
  u = status + bytes
  v = u + bytes

  memory.fill(image, 0, bytes * 5);
  walls_and_sources();
}

// Add walls and sources to status buffer
function walls_and_sources(): void {
  const centerX = width / 2.0 - 0.5;
  const centerY = height / 2.0 - 0.5;
  const radius = Math.min(centerX, centerY);
  let sources = 0;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const targetIndex = i * width + j;
      const dx = j - centerX;
      const dy = i - centerY;
      if (dx * dx + dy * dy > radius * radius) {
        set(status, targetIndex, STATUS_WALL);
      } else if (Math.random() < 0.001) {
        set(status, targetIndex, !(targetIndex & 1) ? STATUS_SOURCE_POS : STATUS_SOURCE_NEG);
        sources += 1;
      }
    }
  }
  while (sources < 3) { // Fix no sources for small resolutions
    const x = <usize>(Math.random() * width), y = <usize>(Math.random() * height);
    const dx = x - centerX;
    const dy = y - centerY;
    if (dx * dx + dy * dy < radius * radius) {
      const targetIndex = y * width + x;
      set(status, targetIndex, !(targetIndex & 1) ? STATUS_SOURCE_POS : STATUS_SOURCE_NEG);
      sources += 1;
    }
  }
}

// Apply a force at a point
function perturb(x: f64, y: f64): void {
  state = STATE_RUN;
  const px = <u32>(x * width);
  const py = <u32>(y * height);
  for (let i = -1; i < 2; i++) {
    for (let j = -1; j < 2; j++) {
      set(force, <usize>((py + i) * width + (px + j)), <i32>(0x3FFFFFFF));
    }
  }
}

// Use half of full int32 range (-0x80000000 to 0x7FFFFFFF)
// @ts-expect-error
@inline function clamp(x: i32): i32 {
  return x < -0x40000000 ? -0x40000000 : (x > 0x3FFFFFFF ? 0x3FFFFFFF : x);
}

// Get a single pixel's color
// @ts-expect-error
@inline function get(pointer: usize, offset: usize): i32 {
  return load<i32>(pointer + (offset << 2));
}

// Set a single pixel's color
// @ts-expect-error
@inline function set(pointer: usize, offset: usize, v: i32): void {
  store<i32>(pointer + (offset << 2), v);
}

// Convert negative, zero, and positive values to pink, black, and green, respectively
// @ts-expect-error
@inline function rgb(x: i32): i32 {
  const val = x >> 22;
  if (val < 0) return ((-(val + 1)) | (((-(val + 1)) & 0xFE) << 15) | 0xFF000000);
  return (((val << 8) | ((val & 0xFE) << 15)) | 0xFF000000);
}