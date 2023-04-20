export let offset: usize = heap.alloc(0);
let width: i32, height: i32;

// Import functions
// @ts-expect-error
@external("env", "draw_image")
declare function draw_image(p: usize, s: usize): void

// Sort a single pixel
export function update(tick: i64, time: f64): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pb = get(x + 1, y);
      const pa = get(x, y);
      const hb = rgb_to_hsl(pb) >> 16;
      const ha = rgb_to_hsl(pa) >> 16;

      if (hb > ha) {
        set(x, y, pb);
        set(x + 1, y, pa);
      }
    }
  }
  draw_image(offset, width * height << 2);
}

// User interaction
export function interact(x: f64, y: f64, v: f64): void {
  fill_random();
}

// Resize image
export function resize(w: i64, h: i64): void {
  let a = Math.random();
  width = <u32>w;
  height = <u32>h;
  offset = heap.realloc(offset, width * height << 2);

  fill_random();
}

// Get a pixel's RGBA value
// @ts-expect-error
@inline function get(x: i32, y: i32): u32 {
  return load<u32>(offset + ((y * width + x) << 2));
}

// Set a pixel's RGBA value
// @ts-expect-error
@inline function set(x: i32, y: i32, rgb: u32): void {
  store<u32>(offset + ((y * width + x) << 2), rgb)
}

// Fill the image with colors of random hue
function fill_random(): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      set(x, y, hsl_to_rgb(Math.random(), 0.8, 0.5));
    }
  }
}

// Convert RGB to HSL
function rgb_to_hsl(rgb: u32): u32 {
  const r = rgb & 0xFF;
  const g = (rgb >> 8) & 0xFF;
  const b = (rgb >> 16) & 0xFF;
  const rf = (<f32>r) * (1.0 / 255);
  const gf = (<f32>g) * (1.0 / 255);
  const bf = (<f32>b) * (1.0 / 255);
  const max = Mathf.max(Mathf.max(gf, bf), rf);
  const min = Mathf.min(Mathf.min(gf, bf), rf);
  let h: f32 = 0, s: f32 = 0, l: f32 = (max + min) * 0.5;
  if (max == min) return <u32>(l * 255); // Achromatic
  var d = max - min;
  s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  d = 1 / d;
  if (max === rf) {
    h = (gf - bf) * d + (gf < bf ? 6 : 0);
  } else {
    if (max === gf) {
      h = (bf - rf) * d + 2;
    } else if (max === bf) {
      h = (rf - gf) * d + 4;
    }
  }
  h *= 1.0 / 6.0;
  return (<u32>(h * 255) << 16) | (<u32>(s * 255) << 8) | <u32>(l * 255);
}

// Convert HSL to RGBA
function hsl_to_rgb(h: f64, s: f64, l: f64): u32 {
  if (s <= 0.0) return <u32>(l * 0xFFFFFF) | 0xFF000000; // Achromatic
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue_to_rgb(p, q, h + 1/3);
  const g = hue_to_rgb(p, q, h);
  const b = hue_to_rgb(p, q, h - 1/3);
  return (<u32>(r * 255) << 16) | (<u32>(g * 255) << 8) | <u32>(b * 255) | 0xFF000000;
}

// Convert hue to RGB
function hue_to_rgb(p: f64, q: f64, t: f64): f64 {
  if(t < 0) t += 1;
  if(t > 1) t -= 1;
  if(t < 1/6) return p + (q - p) * 6 * t;
  if(t < 1/2) return q;
  if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}


