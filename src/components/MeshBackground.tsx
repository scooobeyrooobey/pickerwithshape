import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { MeshGradient } from '@paper-design/shaders-react';
import styles from './MeshBackground.module.css';

interface MeshBackgroundProps {
  /** Continuous picker value in [0..1]. Drives the mesh tint via the sphere palette. */
  value: number;
}

/**
 * Dark mesh gradient. Base near-black (#0C0B0B) plus three derivatives
 * (deep / mid / accent) computed from the active sphere mood. Pools, glow
 * and shader stops all read those derivatives via CSS vars, so the whole
 * mesh shifts hue with the picker.
 */
export function MeshBackground({ value }: MeshBackgroundProps) {
  const tints = useMemo(() => meshTints(value), [value]);

  const accentCss = `rgb(${rgbStr(tints.accent)})`;
  const midCss = `rgb(${rgbStr(tints.mid)})`;
  const deepCss = `rgb(${rgbStr(tints.deep)})`;

  const cssVars: CSSProperties = {
    '--mesh-accent': rgbStr(tints.accent),
    '--mesh-mid': rgbStr(tints.mid),
    '--mesh-deep': rgbStr(tints.deep),
  } as CSSProperties;

  return (
    <div className={styles.root} style={cssVars} aria-hidden>
      <MeshGradient
        className={styles.shader}
        colors={[BASE_HEX, deepCss, BASE_HEX, midCss, BASE_HEX, accentCss]}
        distortion={0.45}
        swirl={0.7}
        speed={0.8}
        originX={0.5}
        originY={0.5}
      />
      <MeshGradient
        className={styles.shaderTop}
        colors={[BASE_HEX, midCss, BASE_HEX, accentCss]}
        distortion={0.4}
        swirl={0.65}
        speed={1.0}
        originX={0.5}
        originY={0.5}
      />
      <div className={styles.centerGlow} />
      <div className={styles.topVeil} />
    </div>
  );
}

type Rgb = [number, number, number];

const BASE: Rgb = [12, 11, 11]; // #0C0B0B
const BASE_HEX = '#0C0B0B';

// Mood accents at picker stops. Each tuned to match the sphere's dominant
// hue and kept dark enough to read as a tint, not a flood.
const MOOD_ACCENTS: Array<[number, Rgb]> = [
  [0,    [32, 20, 48]],   // awful — deep purple (matches purple sphere)
  [0.25, [25, 26, 44]],   // meh — dark indigo (between purple and teal)
  [0.5,  [18, 32, 40]],   // okay — deep teal-blue (matches blue sphere)
  [0.75, [22, 38, 22]],   // good — deep green (matches green sphere)
  [1,    [58, 42, 34]],   // amazing — warm flesh peach (matches peach sphere)
];

function meshTints(v: number) {
  const accent = moodAccent(v);
  // Mid sits between base and accent; deep sits closer to base.
  const mid = lerpRgb(BASE, accent, 0.55);
  const deep = lerpRgb(BASE, accent, 0.3);
  return { accent, mid, deep };
}

function moodAccent(v: number): Rgb {
  const x = Math.max(0, Math.min(1, v));
  for (let i = 0; i < MOOD_ACCENTS.length - 1; i++) {
    const [v0, c0] = MOOD_ACCENTS[i];
    const [v1, c1] = MOOD_ACCENTS[i + 1];
    if (x >= v0 && x <= v1) {
      const t = (x - v0) / (v1 - v0);
      return lerpRgb(c0, c1, t);
    }
  }
  return MOOD_ACCENTS[MOOD_ACCENTS.length - 1][1];
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgbStr(c: Rgb): string {
  return `${c[0]}, ${c[1]}, ${c[2]}`;
}
