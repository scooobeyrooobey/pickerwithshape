// Fullscreen quad vertex shader
export const vertexSrc = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

// Volumetric ray-marched torus with petal modulation. uMode is a continuous
// float in [0..1] with 5 anchor stops at 0/0.25/0.5/0.75/1. Petals morph
// sharp pointed spikes (Awful) → rounded near-oval lobes (Amazing). Tempo
// also slows as uMode rises.
export const fragmentSrc = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;   // wall-clock, drives palettes & accent masks
uniform float uPhase;  // tempo-integrated phase, drives shape & rotation
uniform float uMode;

// --- noise -----------------------------------------------------------------

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i),                  hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)),    hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)),    hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)),    hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

// --- distance field --------------------------------------------------------

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float map(vec3 p) {
  float t = uPhase;

  vec3 wp = p;
  wp.xy = rot(t * 0.35) * wp.xy;
  wp.yz = rot(t * 0.20) * wp.yz;

  // Oval silhouette: compress depth so the projection reads as a horizontal oval.
  wp.x *= 1.05;
  wp.z *= 0.78;

  // Gentle twist along the vertical axis — adds curvature complexity while
  // keeping the overall oval outline intact.
  float twist = sin(wp.y * 2.0 + t * 0.5) * 0.18;
  wp.xz = rot(twist) * wp.xz;

  // Multi-frequency bends: cross-axis waves + angular ribbing around the torus.
  // Adds richer twisting / undulating motion without inflating the tube.
  float ang = atan(wp.z, wp.x);
  float deform = 0.0;
  deform += sin(wp.x * 6.0 + wp.y * 3.0 + t * 1.4) * 0.022;
  deform += cos(wp.y * 5.5 - wp.z * 4.0 + t * 1.1) * 0.020;
  deform += sin(length(wp.xy) * 7.0 - t * 1.8) * 0.016;
  deform += cos(ang * 5.0 + wp.y * 2.5 + t * 0.9) * 0.022;
  deform += sin(ang * 3.0 - t * 1.3) * 0.018;

  // Subtle universal ridges — extra surface complexity.
  float ridge = sin(wp.x * 5.5 + t * 0.85) * cos(wp.y * 4.5 - t * 0.65) * 0.016;
  ridge += sin(length(wp.xz) * 6.5 - t * 1.0) * 0.012;

  // Cap negative deform so the tube can never inflate enough to swallow the hole.
  float deformLimited = max(deform + ridge, -0.05);

  float torus = sdTorus(wp, vec2(0.55, 0.18)) + deformLimited;

  // Carve a guaranteed inner hole: subtract a vertical cylinder whose radius
  // sits inside the torus core, so the donut hole is always visible.
  float innerHole = length(wp.xz) - 0.30;
  return max(torus, -innerHole);
}

// --- color -----------------------------------------------------------------

// Per-mood palettes. Shimmer rate (uTime multiplier) is tied to mood meaning,
// not hue — bad moods agitate fast, good moods drift slow.

vec3 paletteAwful(vec3 p, float i) {
  // Deep purple: heavy / melancholy.
  vec3 a = vec3(0.290, 0.102, 0.541);
  vec3 b = vec3(0.576, 0.314, 1.000);
  vec3 c = vec3(0.788, 0.612, 1.000);
  float k = 0.5 + 0.5 * sin(p.x * 4.0 + p.y * 4.5 + uTime * 2.6);
  return mix(a, mix(b, c, k), i);
}

vec3 paletteMeh(vec3 p, float i) {
  // Indigo: midpoint between purple Awful and blue Okay (50/50 lerp of stops).
  vec3 a = vec3(0.205, 0.196, 0.451);
  vec3 b = vec3(0.424, 0.449, 0.845);
  vec3 c = vec3(0.700, 0.702, 0.926);
  float k = 0.5 + 0.5 * sin(p.x * 3.6 + p.y * 4.0 + uTime * 2.0);
  return mix(a, mix(b, c, k), i);
}

vec3 paletteOkay(vec3 p, float i) {
  // Teal-blue: calm / neutral.
  vec3 a = vec3(0.122, 0.290, 0.361);
  vec3 b = vec3(0.271, 0.584, 0.690);
  vec3 c = vec3(0.612, 0.792, 0.851);
  float k = 0.5 + 0.5 * sin(p.x * 3.0 + p.y * 3.5 + uTime * 1.4);
  return mix(a, mix(b, c, k), i);
}

vec3 paletteGood(vec3 p, float i) {
  // Foliage green: alive / positive.
  vec3 a = vec3(0.180, 0.310, 0.120);
  vec3 b = vec3(0.388, 0.596, 0.278);
  vec3 c = vec3(0.710, 0.840, 0.600);
  float k = 0.5 + 0.5 * sin(p.x * 2.0 + p.y * 2.5 + uTime * 0.9);
  return mix(a, mix(b, c, k), i);
}

vec3 paletteAmazing(vec3 p, float i) {
  // Peach skin-tone: rosy shadow → warm peach mid → cream highlight. Soft, glowing.
  vec3 a = vec3(0.640, 0.420, 0.360);
  vec3 b = vec3(0.940, 0.680, 0.560);
  vec3 c = vec3(0.995, 0.870, 0.760);
  float k = 0.5 + 0.5 * sin(p.x * 3.8 + p.y * 4.3 + uTime * 0.5);
  return mix(a, mix(b, c, k), i);
}

vec3 palette(vec3 p, float i) {
  vec3 base;
  if (uMode < 0.25) {
    base = mix(paletteAwful(p, i), paletteMeh(p, i),     uMode * 4.0);
  } else if (uMode < 0.5) {
    base = mix(paletteMeh(p, i),   paletteOkay(p, i),    (uMode - 0.25) * 4.0);
  } else if (uMode < 0.75) {
    base = mix(paletteOkay(p, i),  paletteGood(p, i),    (uMode - 0.5)  * 4.0);
  } else {
    base = mix(paletteGood(p, i),  paletteAmazing(p, i), (uMode - 0.75) * 4.0);
  }

  vec3 white = vec3(1.0);
  vec3 warm  = vec3(1.0, 0.741, 0.463);

  float wMask = smoothstep(0.78, 1.0,
    sin(p.x * 4.0 + p.y * 3.0 + uTime * 0.8) * 0.5 + 0.5);
  float aMask = smoothstep(0.7, 1.0,
    sin(p.y * 3.5 - p.x * 2.0 - uTime * 0.6) * 0.5 + 0.5);

  base = mix(base, white, wMask * 0.10);
  base = mix(base, warm,  aMask * 0.16);

  return base;
}

// --- main ------------------------------------------------------------------

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);

  vec3 ro = vec3(0.0, 0.0, 2.0);
  vec3 rd = normalize(vec3(uv, -1.5));

  vec3 col = vec3(0.0);
  float t = 0.0;

  for (int i = 0; i < 124; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);

    // Aggressive falloff (14.0) keeps glow tightly bound to the surface →
    // crisp, contrasty edges instead of fog. Step factor 0.30 + min 0.010
    // gives many samples right at the surface for clean detail.
    float glow = exp(-abs(d) * 14.0) * 0.048;
    col += palette(p, glow * 5.0) * glow;

    t += max(abs(d) * 0.30, 0.010);
    if (t > 4.0) break;
  }

  col = col / (col + vec3(1.0));
  col = pow(col, vec3(0.95));

  // Per-mood saturation: Awful = 0.95, Meh = 1.00, Okay = 1.12 (peak),
  // Good = 1.04, Amazing = 0.96. Linear ramps between stops.
  float satBoost;
  if (uMode < 0.25) {
    satBoost = mix(0.95, 1.00, uMode * 4.0);
  } else if (uMode < 0.5) {
    satBoost = mix(1.00, 1.12, (uMode - 0.25) * 4.0);
  } else if (uMode < 0.75) {
    satBoost = mix(1.12, 1.04, (uMode - 0.5) * 4.0);
  } else {
    satBoost = mix(1.04, 0.96, (uMode - 0.75) * 4.0);
  }

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = clamp(mix(vec3(lum), col, 1.4 * satBoost), 0.0, 1.0);

  // Global contrast lift — pushes shadows down and highlights up so the form
  // reads crisp instead of milky.
  col = clamp((col - 0.5) * 1.20 + 0.5, 0.0, 1.0);

  float brightness = max(col.r, max(col.g, col.b));
  float alpha = clamp(brightness * 3.0, 0.0, 1.0);
  fragColor = vec4(col, alpha);
}
`
