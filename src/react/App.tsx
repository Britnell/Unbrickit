import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import Clock from "./Clock";
import Theme from "./Theme";
import PomodoroApp, { PomodoroWidget, usePomodoro } from "./Pomodoro";
import TrackerApp, { TrackerWidget, useTracker } from "./Tracker";
import Chime, { useChime } from "./Chime";
import ChatApp from "./Chat";
import { paletteAtom } from "./atoms";
import { useLocalStorage } from "./useLocalStorage";

/* ---------------------------------- state --------------------------------- */

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
        className="button grid place-items-center text-lg hover:bg-gray-200"
        onClick={(e) => {
          e.stopPropagation();
          window.location.reload();
        }}
      >
        ⟳
      </button>
      <button
        className="button grid place-items-center text-lg hover:bg-gray-200"
        onClick={(e) => {
          e.stopPropagation();
          system.toggleFullscreen();
        }}
      >
        {system.fullscreen ? "⤡" : "⛶"}
      </button>
      <button
        className="button grid place-items-center text-lg hover:bg-gray-200"
        onClick={(e) => {
          e.stopPropagation();
          system.toggleScreenLock();
        }}
      >
        {system.screenLock ? "screen 🔒︎" : "screen 🔓︎"}
      </button>
    </div>
  );
}

/* ------------------------------ menu chrome ------------------------------- */

/* ----------------------------------- pages -------------------------------- */

/* ------------------------------ menu chrome ------------------------------- */

/* The ONE place that renders the menu panel: position, white bg, rounded, min width */
export function MenuPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute bottom-2 left-1/2 -translate-x-1/2 min-w-[300px] max-w-full max-h-[calc(100svh-1rem)] overflow-auto rounded bg-white/50 text-black p-2 z-10 animate-menu-in"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

/* Shared header for submenu views: back arrow (button) on the left, title centered, no X */
export function MenuHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <button
        onClick={onBack}
        className="button grid place-items-center hover:bg-gray-200"
        aria-label="Back"
      >
        ←
      </button>
      <span className="flex-1 text-center">{title}</span>
      <span className="w-8" />
    </div>
  );
}

const menuViews = {
  theme: { title: "🎨 Theme", render: () => <Theme /> },
  chime: {
    title: "🔔 Chime",
    render: (chime: ReturnType<typeof useChimeSettings>) => (
      <Chime
        type={chime.type}
        interval={chime.interval}
        setType={chime.set.type}
        setInterval_={chime.set.interval}
      />
    ),
  },
} as const;

function ClockPage({
  pomo,
  tracker,
  chime,
  onOpen,
  overlayOpen,
  menu,
  setMenu,
}: {
  pomo: ReturnType<typeof usePomodoro>;
  tracker: ReturnType<typeof useTracker>;
  chime: ReturnType<typeof useChimeSettings>;
  onOpen: (page: "pomodoro" | "tracker" | "chat", from: "menu" | "clock") => void;
  overlayOpen: boolean;
  menu: boolean | string;
  setMenu: (m: boolean | string) => void;
}) {
  const system = useSystem();

  const menuItems = [
    // { label: "💬 Chat", go: "chat" },
    { label: "🍅 Pomodoro", go: "pomodoro" },
    { label: "🪑 Tracker", go: "tracker" },
    { label: "🎨 Theme", go: "theme" },
    { label: "🔔 Chime", go: "chime" },
  ];

  const selectMenuItem = (go: string) => {
    if (go === "pomodoro" || go === "tracker" || go === "chat") {
      setMenu(false);
      onOpen(go, "menu");
    } else setMenu(go);
  };

  return (
    <>
      <div className="absolute inset-0" onClick={() => setMenu(!menu)}>
        <Clock />
      </div>

      {/* widgets: anchored top-right, all widgets in one flex row */}
      {menu && !overlayOpen && <HelperButtons system={system} />}

      {!menu && !overlayOpen && (
        <div className="absolute bottom-2 right-2 flex gap-2 pointer-events-auto">
        <PomodoroWidget
          pomo={pomo}
          onOpen={() => {
            setMenu(false);
            onOpen("pomodoro", "clock");
          }}
        />
        <TrackerWidget
          tracker={tracker}
          onOpen={() => {
            setMenu(false);
            onOpen("tracker", "clock");
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
          className="button absolute bottom-2 left-1/2 -translate-x-1/2 !bg-transparent"
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
        <div className="absolute inset-0" onClick={() => setMenu(false)}>
          <MenuPanel>
              {typeof menu === "string" ? (
                <>
                  <MenuHeader
                    title={menuViews[menu as keyof typeof menuViews].title}
                    onBack={() => setMenu(true)}
                  />
                  {menu === "chime"
                    ? menuViews.chime.render(chime)
                    : menuViews.theme.render()}
                </>
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {menuItems.map(({ label, go }) => (
                    <li key={label}>
                      <button
                        className="button w-full hover:bg-gray-200"
                        onClick={() => selectMenuItem(go)}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </MenuPanel>
        </div>
      )}
    </>
  );
}

/* ----------------------------------- app ---------------------------------- */

export default function App() {
  const [page, setPage] = useState<"clock" | "pomodoro" | "tracker" | "chat">("clock");
  const [menu, setMenu] = useState<boolean | string>(false);
  // simple history: where to go back to after an overlay page
  const [prevPage, setPrevPage] = useState<"clock" | "menu">("clock");

  const openPage = (p: "pomodoro" | "tracker" | "chat", from: "menu" | "clock") => {
    setPrevPage(from);
    setPage(p);
  };

  const closePage = () => {
    setPage("clock");
    setMenu(prevPage === "menu");
  };
  const pomo = usePomodoro();
  const [reminder, setReminder] = useLocalStorage<number>(
    "tracker-reminder",
    30,
  );
  const chime = useChimeSettings();
  const tracker = useTracker({
    reminderMinutes: reminder,
    chimeType: chime.type,
  });
  useChime(chime);
  const c = useAtomValue(paletteAtom);

  return (
    <main className="fixed inset-0" style={{ background: c.bg, color: c.text }}>
      <ClockPage
        pomo={pomo}
        tracker={tracker}
        chime={chime}
        onOpen={openPage}
        overlayOpen={page !== "clock"}
        menu={menu}
        setMenu={setMenu}
      />
      {page === "pomodoro" && (
        <PomodoroApp pomo={pomo} onClose={closePage} />
      )}
      {page === "chat" && <ChatApp onClose={closePage} />}
      {page === "tracker" && (
        <TrackerApp
          tracker={tracker}
          reminder={reminder}
          setReminder={setReminder}
          onClose={closePage}
        />
      )}
    </main>
  );
}
