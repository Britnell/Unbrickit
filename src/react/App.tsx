import { useState } from 'react';
import Clock from './Clock';
import Theme from './Theme';
import { fonts, useLocalStorage } from './state';

export default function App() {
  const [menu, setMenu] = useState(false); // false | true | 'theme'
  const [font, setFont] = useState(() => useLocalStorage('theme', fonts[0]));
  const [fontSize, setFontSize] = useState(() => useLocalStorage('fontSize', 28));
  const [fontWeight, setFontWeight] = useState(() => useLocalStorage('fontWeight', 700));

  const selectFont = (f: string) => {
    setFont(f);
    localStorage.setItem('theme', f);
  };

  const selectFontSize = (v: number) => {
    setFontSize(v);
    localStorage.setItem('fontSize', String(v));
  };

  const selectFontWeight = (v: number) => {
    setFontWeight(v);
    localStorage.setItem('fontWeight', String(v));
  };

  const closeMenu = () => setMenu(false);

  return (
    <main className="fixed inset-0">
      <div className="absolute inset-0" onClick={() => setMenu(!menu)}>
        <Clock font={font} fontSize={fontSize} fontWeight={fontWeight} />
      </div>

      {/* bottom menu */}
      {!menu && (
        <button
          onClick={(e) => { e.stopPropagation(); setMenu(true); }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-8 py-1 text-2xl"
        >
          ...
        </button>
      )}

      {menu && (
        <div className="absolute inset-0" onClick={closeMenu}>
          <div
            className="absolute w-[300px] left-1/2 -translate-x-1/2 bottom-2 p-1 bg-[#fff8] rounded z-10 overflow-auto max-h-[calc(100svh-1rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {menu === 'theme' ? (
              <Theme
                font={font}
                setFont={selectFont}
                fontSize={fontSize}
                setFontSize={selectFontSize}
                fontWeight={fontWeight}
                setFontWeight={selectFontWeight}
                onBack={() => setMenu(true)}
              />
            ) : (
              <ul className="grid grid-cols-2">
                <li>
                  <button
                    className="w-full px-2 py-3 rounded hover:bg-[#fff5]"
                    onClick={() => setMenu('theme')}
                  >
                    🎨 Theme
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
