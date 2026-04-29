import { AnimatePresence, motion } from 'framer-motion';
import styles from './MoodLabel.module.css';

interface MoodLabelProps {
  label: string;
  moodId: string;
}

/**
 * Big headline that morphs between mood states.
 * Outgoing word lifts up + blurs out. Incoming word flies in from below with a spring.
 */
export function MoodLabel({ label, moodId }: MoodLabelProps) {
  return (
    <div className={styles.root}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={moodId}
          className={styles.word}
          initial={{ y: 60, opacity: 0, filter: 'blur(10px)', scale: 0.9 }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)', scale: 1 }}
          exit={{ y: -60, opacity: 0, filter: 'blur(12px)', scale: 1.05 }}
          transition={{
            y: { type: 'spring', stiffness: 220, damping: 24, mass: 0.9 },
            scale: { type: 'spring', stiffness: 220, damping: 24 },
            opacity: { duration: 0.25, ease: 'easeOut' },
            filter: { duration: 0.35, ease: 'easeOut' },
          }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
