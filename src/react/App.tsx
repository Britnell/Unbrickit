import { type ReactNode, useEffect, useState } from "react";
import Clock from "./Clock";
import Theme from "./Theme";
import PomodoroApp, { PomodoroWidget, usePomodoro } from "./Pomodoro";
import TrackerApp, { TrackerWidget, useTracker } from "./Tracker";
import Chime, { useChime } from "./Chime";
import ChatApp from "./Chat";
import { colors, fonts } from "./state";
import { useLocalStorage } from "./useLocalStorage";

/* ---------------------------------- state --------------------------------- */

function useThemeSettings() {
  const [font, setFont] = useLocalStorage("theme", fonts[0]);
  const [fontSize, setFontSize] = useLocalStorage("fontSize", 28);
  const [fontWeight, setFontWeight] = useLocalStorage("fontWeight", 700);
  const [hue, setHue] = useLocalStorage("hue", 303);
  const [colorMode, setColorMode] = useLocalStorage("colorMode", "pastel");
  const [darkMode, setDarkMode] = useLocalStorage("darkMode", false);
  // debug override for daylight mode: null = follow real clock
  const [timeOfDay, setTimeOfDay] = useState<number | null>(null);

  return {
    font,
    fontSize,
    fontWeight,
    hue,
    colorMode,
    darkMode,
    timeOfDay,
    set: {
      font: setFont,
      fontSize: setFontSize,
      fontWeight: setFontWeight,
      hue: setHue,
      setColorMode,
      setDarkMode,
      timeOfDay: setTimeOfDay,
    },
  };
}

function useSystem() {
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [screenLock, setScreenLock] = useState<WakeLockSentinel | null>(null);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const toggleScreenLock = async () => {
    if (screenLock) {
      await screenLock.release();
      setScreenLock(null);
    } else {
      try {
        const lock = await navigator.wakeLock.request("screen");
        lock.onrelease = () => setScreenLock(null);
        setScreenLock(lock);
      } catch {
        setScreenLock(null);
      }
    }
  };

  return { fullscreen, screenLock, toggleFullscreen, toggleScreenLock };
}

function useChimeSettings() {
  const [chimeType, setChimeType] = useLocalStorage("chimeType", "chime");
  const [chimeInterval, setChimeInterval] = useLocalStorage("chimeInterval", 0);

  return {
    type: chimeType,
    interval: chimeInterval,
    set: { type: setChimeType, interval: setChimeInterval },
  };
}

/* --------------------------------- regions -------------------------------- */

/* Helper buttons like the old app */
function HelperButtons({ system }: { system: ReturnType<typeof useSystem> }) {
  return (
    <div className="absolute right-2 top-2 flex items-center gap-2 z-20">
      <button
        className="py-3 px-5 rounded bg-white/30 grid place-items-center text-lg hover:bg-white/50"
        onClick={(e) => {
          e.stopPropagation();
          system.toggleFullscreen();
        }}
      >
        {system.fullscreen ? "exit fullscreen" : "fullscreen"}
      </button>
      <button
        className="py-3 px-5 rounded bg-white/30 grid place-items-center text-lg hover:bg-white/50"
        onClick={(e) => {
          e.stopPropagation();
          system.toggleScreenLock();
        }}
      >
        {system.screenLock ? "sleep" : "keep screen unlocked"}
      </button>
    </div>
  );
}

/** Bottom sheet menu; closes when tapping outside the panel. */
function MenuSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
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

function ClockPage({
  pomo,
  tracker,
  theme,
  chime,
  onOpenPomodoro,
  onOpenTracker,
  onOpenChat,
  overlayOpen,
}: {
  pomo: ReturnType<typeof usePomodoro>;
  tracker: ReturnType<typeof useTracker>;
  theme: ReturnType<typeof useThemeSettings>;
  chime: ReturnType<typeof useChimeSettings>;
  onOpenPomodoro: () => void;
  onOpenTracker: () => void;
  onOpenChat: () => void;
  overlayOpen: boolean;
}) {
  const [menu, setMenu] = useState<boolean | string>(false);
  const system = useSystem();

  const menuItems = [
    { label: "🍅 Pomodoro", go: "pomodoro" },
    { label: "🪑 Tracker", go: "tracker" },
    { label: "🎨 Theme", go: "theme" },
    { label: "🔔 Chime", go: "chime" },
    { label: "💬 Chat", go: "chat" },
  ];

  const selectMenuItem = (go: string) => {
    if (go === "pomodoro") {
      setMenu(false);
      onOpenPomodoro();
    } else if (go === "tracker") {
      setMenu(false);
      onOpenTracker();
    } else if (go === "chat") {
      setMenu(false);
      onOpenChat();
    } else setMenu(go);
  };

  return (
    <>
      <div className="absolute inset-0" onClick={() => setMenu(!menu)}>
        <Clock
          font={theme.font}
          fontSize={theme.fontSize}
          fontWeight={theme.fontWeight}
        />
      </div>

      {/* widgets: anchored top-right, all widgets in one flex row */}
      {menu && !overlayOpen && <HelperButtons system={system} />}

      {!menu && !overlayOpen && (
        <div className="absolute bottom-2 right-2 flex gap-2 pointer-events-auto">
        <PomodoroWidget
          pomo={pomo}
          onOpen={() => {
            setMenu(false);
            onOpenPomodoro();
          }}
        />
        <TrackerWidget
          tracker={tracker}
          onOpen={() => {
            setMenu(false);
            onOpenTracker();
          }}
        />
        </div>
      )}

      {!menu && !overlayOpen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenu(true);
          }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-8 py-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className=""
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      )}

      {menu && (
        <MenuSheet onClose={() => setMenu(false)}>
          {typeof menu === "string" ? (
            menu === "chime" ? (
              <Chime
                type={chime.type}
                interval={chime.interval}
                setType={chime.set.type}
                setInterval_={chime.set.interval}
                onBack={() => setMenu(true)}
              />
            ) : (
              <Theme
                font={theme.font}
                fontSize={theme.fontSize}
                fontWeight={theme.fontWeight}
                hue={theme.hue}
                colorMode={theme.colorMode}
                darkMode={theme.darkMode}
                timeOfDay={theme.timeOfDay}
                setTimeOfDay={theme.set.timeOfDay}
                setFont={theme.set.font}
                setFontSize={theme.set.fontSize}
                setFontWeight={theme.set.fontWeight}
                setHue={theme.set.hue}
                setColorMode={theme.set.setColorMode}
                setDarkMode={theme.set.setDarkMode}
                onBack={() => setMenu(true)}
              />
            )
          ) : (
            <ul className="grid grid-cols-2">
              {menuItems.map(({ label, go }) => (
                <li key={label}>
                  <button
                    className="w-full px-2 py-4 rounded hover:bg-gray-200"
                    onClick={() => selectMenuItem(go)}
                  >
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
  const [page, setPage] = useState<"clock" | "pomodoro" | "tracker" | "chat">("clock");
  const pomo = usePomodoro();
  const [reminder, setReminder] = useLocalStorage<number>(
    "tracker-reminder",
    30,
  );
  const theme = useThemeSettings();
  const chime = useChimeSettings();
  const tracker = useTracker({
    reminderMinutes: reminder,
    chimeType: chime.type,
  });
  useChime(chime);
  const c = colors(theme.hue, theme.colorMode, theme.darkMode, theme.timeOfDay);

  return (
    <main className="fixed inset-0" style={{ background: c.bg, color: c.text }}>
      <ClockPage
        pomo={pomo}
        tracker={tracker}
        theme={theme}
        chime={chime}
        onOpenPomodoro={() => setPage("pomodoro")}
        onOpenTracker={() => setPage("tracker")}
        onOpenChat={() => setPage("chat")}
        overlayOpen={page !== "clock"}
      />
      {page === "pomodoro" && (
        <PomodoroApp pomo={pomo} onClose={() => setPage("clock")} />
      )}
      {page === "chat" && <ChatApp onClose={() => setPage("clock")} />}
      {page === "tracker" && (
        <TrackerApp
          tracker={tracker}
          reminder={reminder}
          setReminder={setReminder}
          onClose={() => setPage("clock")}
        />
      )}
    </main>
  );
}
