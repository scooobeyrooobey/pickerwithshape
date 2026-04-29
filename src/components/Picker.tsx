import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutGroup,
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { MOODS, MOOD_VALUES, valueToMoodIndex } from '../moods';
import icPicker from '../assets/icons/ic_picker.svg';
import styles from './Picker.module.css';

const TRACK_WIDTH = 320;
const KNOB_SIZE = 84;
const KNOB_RANGE = TRACK_WIDTH - KNOB_SIZE;
const KNOB_RADIUS = KNOB_SIZE / 2;
const LABEL_HALF_H = 6; // approx half visual label height
const ANCHOR_OFFSET = 24; // .labelAnchor bottom = calc(50% + 24px) — see CSS
const SAFETY_GAP = 14; // visual gap between knob edge and label edge
const CLEAR_RADIUS = KNOB_RADIUS + LABEL_HALF_H + SAFETY_GAP; // 62
const DEFAULT_CENTER_ABOVE_LINE = ANCHOR_OFFSET + LABEL_HALF_H; // 14

interface PickerProps {
  value: number;
  moodIndex: number;
  onChange: (value: number, moodIndex: number) => void;
  onMoodIndexChange: (moodIndex: number) => void;
  /** Fires on every motion frame — continuous position in [0..1]. */
  onValueChange?: (value: number) => void;
}

export function Picker({ value, moodIndex, onChange, onMoodIndexChange, onValueChange }: PickerProps) {
  const knobX = useMotionValue(value * KNOB_RANGE);
  const smoothKnobX = useSpring(knobX, { stiffness: 320, damping: 32, mass: 0.6 });

  const [isPressed, setIsPressed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const internalDriveRef = useRef(false); // true while we're driving knobX ourselves
  const pointerStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startKnobX: number;
    activeIdx: number;
  } | null>(null);

  // Sync incoming `value` (e.g. external resets) → knob position when not pressed.
  // Skip while we're driving the knob ourselves — otherwise the continuous
  // onValueChange feedback would restart the spring every frame and freeze it.
  useEffect(() => {
    if (isPressed || internalDriveRef.current) return;
    const target = value * KNOB_RANGE;
    if (Math.abs(knobX.get() - target) < 0.5) return;
    animate(knobX, target, SNAP_SPRING);
  }, [value, isPressed, knobX]);

  // Continuous value channel for visual consumers (mesh / sphere).
  useEffect(() => {
    const unsub = knobX.on('change', (latest) => {
      onValueChange?.(latest / KNOB_RANGE);
    });
    return unsub;
  }, [knobX, onValueChange]);

  const snapToIdx = useCallback((idx: number) => {
    internalDriveRef.current = true;
    const controls = animate(knobX, MOOD_VALUES[idx] * KNOB_RANGE, {
      ...SNAP_SPRING,
      onComplete: () => { internalDriveRef.current = false; },
    });
    return controls;
  }, [knobX]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    pointerStateRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startKnobX: knobX.get(),
      activeIdx: moodIndex,
    };
    setIsPressed(true);
  }, [knobX, moodIndex]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const st = pointerStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startClientX;
    const targetX = Math.max(0, Math.min(KNOB_RANGE, st.startKnobX + dx));
    const v = targetX / KNOB_RANGE;
    const idx = valueToMoodIndex(v);
    if (idx !== st.activeIdx) {
      st.activeIdx = idx;
      onMoodIndexChange(idx);
      snapToIdx(idx);
    }
  }, [onMoodIndexChange, snapToIdx]);

  const finishPointer = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const st = pointerStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    const idx = st.activeIdx;
    pointerStateRef.current = null;
    setIsPressed(false);
    onChange(MOOD_VALUES[idx], idx);
    snapToIdx(idx);
  }, [onChange, snapToIdx]);

  // Lines span the full root (which is full viewport width).
  // Left line: from viewport-left to knob's left edge.
  // Right line: from knob's right edge to viewport-right.
  const leftLineWidth = useTransform(
    knobX,
    (x) => `calc(50% - ${TRACK_WIDTH / 2}px + ${x}px)`
  );
  const rightLineWidth = useTransform(
    knobX,
    (x) => `calc(50% + ${TRACK_WIDTH / 2 - KNOB_SIZE}px - ${x}px)`
  );

  const activeId = MOODS[moodIndex].id;

  return (
    <div className={styles.root}>
      <motion.div className={styles.lineLeft} style={{ width: leftLineWidth }} />
      <motion.div className={styles.lineRight} style={{ width: rightLineWidth }} />

      <div className={styles.frame} style={{ width: TRACK_WIDTH }}>
        <LayoutGroup>
          {/* Big-word slot. Whichever mood becomes active flies up here. */}
          <div className={styles.bigWordSlot}>
            {MOODS.map(
              (mood) =>
                mood.id === activeId && (
                  <motion.span
                    key={mood.id}
                    layoutId={`mood-${mood.id}`}
                    className={styles.bigWord}
                    transition={SHARED_TRANSITION}
                  >
                    {mood.label}
                  </motion.span>
                )
            )}
          </div>

          <div ref={trackRef} className={styles.track} style={{ height: KNOB_SIZE }}>
            {MOODS.map((mood) =>
              mood.id === activeId ? null : (
                <ArcLabel key={mood.id} mood={mood} smoothKnobX={smoothKnobX} />
              )
            )}

            <motion.button
              type="button"
              className={styles.knob}
              style={{ x: knobX, scale: isPressed ? 1.05 : 1 }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={finishPointer}
              onPointerCancel={finishPointer}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              aria-label="Mood picker"
            >
              <img src={icPicker} alt="" className={styles.knobIcon} draggable={false} />
            </motion.button>
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}

const SHARED_TRANSITION = {
  type: 'spring' as const,
  stiffness: 240,
  damping: 26,
  mass: 0.9,
};

// Spring used for every snap (drag-time and external value sync).
const SNAP_SPRING = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 26,
  mass: 0.8,
};

interface ArcLabelProps {
  mood: (typeof MOODS)[number];
  smoothKnobX: ReturnType<typeof useSpring>;
}

function ArcLabel({ mood, smoothKnobX }: ArcLabelProps) {
  const knobCenterX = useTransform(smoothKnobX, (x) => x + KNOB_RADIUS);
  const labelAnchorX = TRACK_WIDTH / 2 + mood.offsetX;

  // Circle-clearance lift: keep the label outside a virtual circle around the knob.
  // When the knob's horizontal distance is within CLEAR_RADIUS, push the label
  // up so its bottom-center sits on the clearance circle. Account for the
  // labelAnchor's base CSS offset (DEFAULT_CENTER_ABOVE_LINE) so we don't
  // overshoot. Outside that range, fall back to the mood's resting offsetY.
  const lift = useTransform(knobCenterX, (kx) => {
    const dx = Math.abs(kx - labelAnchorX);
    if (dx >= CLEAR_RADIUS) return mood.offsetY;
    const requiredCenterAbove = Math.sqrt(CLEAR_RADIUS * CLEAR_RADIUS - dx * dx);
    if (requiredCenterAbove <= DEFAULT_CENTER_ABOVE_LINE) return mood.offsetY;
    return -(requiredCenterAbove - DEFAULT_CENTER_ABOVE_LINE);
  });

  // Radial fan rotation: each label leans away from the knob.
  // Magnitude grows as the label sits closer to the knob horizontally.
  // Geometrically: angle between the horizontal and the line from the knob
  // center up to the label center (height = DEFAULT_CENTER_ABOVE_LINE).
  const rotation = useTransform(knobCenterX, (kx) => {
    const signedDx = labelAnchorX - kx;
    const absDx = Math.abs(signedDx);
    if (absDx < 0.5) return 0;
    const angleRad = Math.atan2(DEFAULT_CENTER_ABOVE_LINE, absDx);
    return Math.sign(signedDx) * angleRad * (180 / Math.PI);
  });

  return (
    <div
      className={styles.labelAnchor}
      style={{ left: `calc(50% + ${mood.offsetX}px)` }}
    >
      <motion.span
        layoutId={`mood-${mood.id}`}
        className={styles.arcLabel}
        style={{ rotate: rotation, y: lift }}
        transition={SHARED_TRANSITION}
      >
        {mood.label}
      </motion.span>
    </div>
  );
}
