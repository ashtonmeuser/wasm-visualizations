let width: i32, height: i32;
export let offset: usize = heap.alloc(0);

// Import functions
// @ts-expect-error
@external("env", "draw_image")
declare function draw_image(p: usize, s: usize): void
// @ts-expect-error
@external("env", "draw_pixel")
declare function draw_pixel(x: i32, y: i32, r: i32, g: i32, b: i32, a: i32): void

// Set a single pixel's color
function set(x: i32, y: i32, v: f32): void {
  const vi = <i32>v;
  store<i32>(offset + ((width * y + x) << 2), ~vi << 24 | vi << 8);
}

// Compute the distance between two pixels
function distance(x1: i32, y1: i32, x2: f32, y2: f32): f32 {
  const dx = <f32>x1 - x2;
  const dy = <f32>y1 - y2;
  return Mathf.sqrt(dx * dx + dy * dy);
}

// Perform one tick
export function update(t: f64): void {
  const tick = <f32>t;
  const w = <f32>width;
  const h = <f32>height;
  const hw = w * 0.5,
      hh = h * 0.5;
  const cx1 = (Mathf.sin(tick * 2) + Mathf.sin(tick      )) * hw * 0.3 + hw,
      cy1 = (Mathf.cos(tick)                            ) * hh * 0.3 + hh,
      cx2 = (Mathf.sin(tick * 4) + Mathf.sin(tick + 1.2)) * hw * 0.3 + hw,
      cy2 = (Mathf.sin(tick * 3) + Mathf.cos(tick + 0.1)) * hh * 0.3 + hh;
  const res = <f32>48 / Mathf.max(w, h);
  let y = 0;
  do {
    let x = 0;
    do {
      set(x, y, Mathf.abs(
        Mathf.sin(distance(x, y, cx1, cy1) * res) +
        Mathf.sin(distance(x, y, cx2, cy2) * res)
      ) * 120);
    } while (++x != width)
  } while (++y != height)

  draw_image(offset, width * height * 4);
}

// Resize image
export function resize(w: i64, h: i64): void {
  width = <i32>w;
  height = <i32>h;
  heap.realloc(offset, width * height * 4);
}
