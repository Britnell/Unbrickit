import { type ReactNode, useState } from 'react';
import Clock from './Clock';
import Theme from './Theme';
import PomodoroApp, { PomodoroWidget, usePomodoro } from './Pomodoro';
import Chime, { useChime } from './Chime';
import { colors, fonts, useLocalStorage } from './state';

/* ---------------------------------- state --------------------------------- */

function useThemeSettings() {
  const [font, setFont] = useState(() => useLocalStorage('theme', fonts[0]));
  const [fontSize, setFontSize] = useState(() => useLocalStorage('fontSize', 28));
  const [fontWeight, setFontWeight] = useState(() => useLocalStorage('fontWeight', 700));
  const [hue, setHue] = useState(() => useLocalStorage('hue', 303));
  const [colorMode, setColorMode] = useState(() => useLocalStorage('colorMode', 'pastel'));
  const [darkMode, setDarkMode] = useState<boolean>(() => useLocalStorage<string>('darkMode', 'false') === 'true');

  return {
    font, fontSize, fontWeight, hue: Number(hue), colorMode, darkMode,
    set: {
      font: (v: string) => { setFont(v); localStorage.setItem('theme', v); },
      fontSize: (v: number) => { setFontSize(v); localStorage.setItem('fontSize', String(v)); },
      fontWeight: (v: number) => { setFontWeight(v); localStorage.setItem('fontWeight', String(v)); },
      hue: (v: number) => { setHue(v); localStorage.setItem('hue', String(v)); },
      colorMode: (v: string) => { setColorMode(v); localStorage.setItem('colorMode', v); },
      darkMode: (v: boolean) => { setDarkMode(v); localStorage.setItem('darkMode', String(v)); },
    },
  };
}

function useChimeSettings() {
  const [chimeType, setChimeType] = useState(() => useLocalStorage('chimeType', 'chime'));
  const [chimeInterval, setChimeInterval] = useState(() => useLocalStorage('chimeInterval', 0));

  return {
    type: chimeType,
    interval: Number(chimeInterval),
    set: {
      type: (v: string) => { setChimeType(v); localStorage.setItem('chimeType', v); },
      interval: (v: number) => { setChimeInterval(v); localStorage.setItem('chimeInterval', String(v)); },
    },
  };
}

/* --------------------------------- regions -------------------------------- */

/** Bottom sheet menu; closes when tapping outside the panel. */
function MenuSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0" onClick={onClose}>
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[300px] max-h-[calc(100svh-1rem)] overflow-auto rounded bg-white/50 text-black p-1 z-10 animate-menu-in"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------- pages -------------------------------- */

function ClockPage({ pomo, theme, chime, onOpenPomodoro }: {
  pomo: ReturnType<typeof usePomodoro>;
  theme: ReturnType<typeof useThemeSettings>;
  chime: ReturnType<typeof useChimeSettings>;
  onOpenPomodoro: () => void;
}) {
  const [menu, setMenu] = useState<boolean | string>(false);

  const menuItems = [
    { label: '🎨 Theme', action: () => setMenu('theme') },
    { label: '🔔 Chime', action: () => setMenu('chime') },
    { label: '🍅 Pomodoro', action: () => { setMenu(false); onOpenPomodoro(); } },
  ];

  return (
    <>
      <div className="absolute inset-0" onClick={() => setMenu(!menu)}>
        <Clock font={theme.font} fontSize={theme.fontSize} fontWeight={theme.fontWeight} />
      </div>

      {/* widgets: anchored top-right, all widgets in one flex row */}
      <div className="absolute bottom-2 right-2 flex gap-2 pointer-events-auto">
          <PomodoroWidget pomo={pomo} onOpen={onOpenPomodoro} />
      </div>

      {!menu && (
        <button
          onClick={(e) => { e.stopPropagation(); setMenu(true); }}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 px-8 py-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className=""><path d="m18 15-6-6-6 6"/></svg>
      </button>      )}

      {menu && (
        <MenuSheet onClose={() => setMenu(false)}>
          {typeof menu === 'string' ? (
            menu === 'chime' ? (
              <Chime
                type={chime.type} interval={chime.interval}
                setType={chime.set.type} setInterval_={chime.set.interval}
                onBack={() => setMenu(true)}
              />
            ) : (
              <Theme
                font={theme.font} fontSize={theme.fontSize} fontWeight={theme.fontWeight}
                hue={theme.hue} colorMode={theme.colorMode} darkMode={theme.darkMode}
                setFont={theme.set.font} setFontSize={theme.set.fontSize}
                setFontWeight={theme.set.fontWeight} setHue={theme.set.hue}
                setColorMode={theme.set.colorMode} setDarkMode={theme.set.darkMode}
                onBack={() => setMenu(true)}
              />
            )
          ) : (            <ul className="grid grid-cols-2">
              {menuItems.map(({ label, action }) => (
                <li key={label}>
                  <button className="w-full px-2 py-3 rounded hover:bg-gray-200" onClick={action}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </MenuSheet>
      )}
    </>
  );
}

/* ----------------------------------- app ---------------------------------- */

export default function App() {
  const [page, setPage] = useState<'clock' | 'pomodoro'>('clock');
  const pomo = usePomodoro();
  const theme = useThemeSettings();
  const chime = useChimeSettings();
  useChime(chime);
  const c = colors(theme.hue, theme.colorMode, theme.darkMode);

  return (
    <main className="fixed inset-0" style={{ background: c.bg, color: c.text }}>
      <ClockPage pomo={pomo} theme={theme} chime={chime} onOpenPomodoro={() => setPage('pomodoro')} />
      {page === 'pomodoro' && (
        <PomodoroApp pomo={pomo} onClose={() => setPage('clock')} />
      )}
    </main>
  );
}
