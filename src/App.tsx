import { useState } from 'react';
import { MeshBackground } from './components/MeshBackground';
import { Picker } from './components/Picker';
import { Sphere } from './components/Sphere';
import { MOOD_VALUES } from './moods';
import icBack from './assets/icons/ic_back.svg';
import styles from './App.module.css';

export function App() {
  const [moodIndex, setMoodIndex] = useState(2); // Okay
  const [value, setValue] = useState(MOOD_VALUES[2]);

  return (
    <div className={styles.root}>
      <MeshBackground value={value} />
      <Sphere value={value} />

      <div className={styles.content}>
        <header className={styles.topbar}>
          <button className={styles.closeBtn} aria-label="Close">
            <img src={icBack} alt="" />
          </button>
          <h1 className={styles.headline}>
            Jane,
            <br />
            how do you feel
            <br />
            this evening?
          </h1>
        </header>

        <div className={styles.pickerWrap}>
          <Picker
            value={value}
            moodIndex={moodIndex}
            onChange={(v, idx) => {
              setValue(v);
              setMoodIndex(idx);
            }}
            onMoodIndexChange={setMoodIndex}
            onValueChange={setValue}
          />
        </div>
      </div>
    </div>
  );
}
