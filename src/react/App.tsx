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

/* ----------------------------------- pages -------------------------------- */

function ClockPage({
  pomo,
  tracker,
  chime,
  onOpenPomodoro,
  onOpenTracker,
  onOpenChat,
  overlayOpen,
}: {
  pomo: ReturnType<typeof usePomodoro>;
  tracker: ReturnType<typeof useTracker>;
  chime: ReturnType<typeof useChimeSettings>;
  onOpenPomodoro: () => void;
  onOpenTracker: () => void;
  onOpenChat: () => void;
  overlayOpen: boolean;
}) {
  const [menu, setMenu] = useState<boolean | string>(false);
  const system = useSystem();

  const menuItems = [
    // { label: "💬 Chat", go: "chat" },
    { label: "🍅 Pomodoro", go: "pomodoro" },
    { label: "🪑 Tracker", go: "tracker" },
    { label: "🎨 Theme", go: "theme" },
    { label: "🔔 Chime", go: "chime" },
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
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[300px] max-h-[calc(100svh-1rem)] overflow-auto rounded bg-white/50 text-black p-2 z-10 animate-menu-in "
            onClick={(e) => e.stopPropagation()}
          >
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
              <Theme onBack={() => setMenu(true)} />
            )
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {menuItems.map(({ label, go }) => (
                <li key={label}>
                  <button
            className="button w-full hover:bg-gray-200"
            onClick={() => selectMenuItem(go)}                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>
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
