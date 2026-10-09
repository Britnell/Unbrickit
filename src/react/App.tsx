import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useAtomValue, useAtom } from "jotai";
import Clock from "./component/Clock";
import Theme from "./component/Theme";
import PomodoroPage, {
  PomodoroWidget,
  usePomodoro,
} from "./component/Pomodoro";
import SeatingPage, {
  SeatingWidget,
  useSeatingEngine,
} from "./component/Seating";
import Chime, { useChime } from "./component/Chime";
import PosturePage, {
  PostureWidget,
  usePostureEngine,
} from "./component/Posture";
import PodcastPage, { PodcastWidget } from "./component/Podcast";
import RadioPage, { RadioWidget } from "./component/Radio";
import ChatPage from "./component/Chat";
import WeatherPage, {
  WeatherWidget,
  useWeatherEngine,
} from "./component/Weather";
import {
  paletteAtom,
  clockTimeAtom,
  chimeTypeAtom,
  playingPodcastAtom,
  playingPodcastPausedAtom,
  weatherWidgetAtom,
  playingRadioAtom,
} from "./atoms";
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
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen();
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
  const [chimeType, setChimeType] = useAtom(chimeTypeAtom);
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
        className="button button-glass grid place-items-center text-lg"
        onClick={(e) => {
          e.stopPropagation();
          window.location.reload();
        }}
      >
        ⟳
      </button>
      <button
        className="button button-glass grid place-items-center text-lg"
        onClick={(e) => {
          e.stopPropagation();
          system.toggleFullscreen();
        }}
      >
        {system.fullscreen ? "⤡" : "⛶"}
      </button>
      <button
        className="button button-glass grid place-items-center text-lg"
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

/* ------------------------------ menu views -------------------------------- */

/* All sub-pages of the menu: header title + content. Rendered in ONE place below. */
const menuTitles = {
  pomodoro: "🍅 Pomodoro",
  seating: "🪑 Seating",
  posture: "🧍 Posture",
  theme: "🎨 Theme",
  chime: "🔔 Chime",
  podcast: "🎙️ Podcasts",
  weather: "🌤️ Weather",
  radio: "📻 Radio",
  chat: "💬 Chat",
} as const;

type MenuViewName = keyof typeof menuTitles;

function MenuView({
  view,
  onBack,
  pomo,
  chime,
}: {
  view: MenuViewName;
  onBack: () => void;
  pomo: ReturnType<typeof usePomodoro>;
  chime: ReturnType<typeof useChimeSettings>;
}) {
  return (
    <>
      {/* header: back arrow on the left, title centered */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="button grid place-items-center"
          aria-label="Back"
        >
          ←
        </button>
        <span className="flex-1 text-center">{menuTitles[view]}</span>
        <span className="w-8" />
      </div>

      {view === "pomodoro" && <PomodoroPage pomo={pomo} />}
      {view === "seating" && <SeatingPage />}
      {view === "theme" && <Theme />}
      {view === "chime" && (
        <Chime
          type={chime.type}
          interval={chime.interval}
          setType={chime.set.type}
          setInterval_={chime.set.interval}
        />
      )}
      {view === "posture" && <PosturePage />}
      {view === "podcast" && <PodcastPage />}
      {view === "weather" && <WeatherPage />}
      {view === "radio" && <RadioPage />}
      {view === "chat" && (
        <div className="grid place-items-center p-8">
          <ChatPage />
        </div>
      )}
    </>
  );
}

function ClockPage({
  pomo,
  chime,
  overlayOpen,
  menu,
  setMenu,
}: {
  pomo: ReturnType<typeof usePomodoro>;
  chime: ReturnType<typeof useChimeSettings>;
  overlayOpen: boolean;
  menu: boolean | MenuViewName;
  setMenu: (m: boolean | MenuViewName) => void;
}) {
  const system = useSystem();
  const playingPodcast = useAtomValue(playingPodcastAtom);
  const playingRadio = useAtomValue(playingRadioAtom);
  const podcastPaused = useAtomValue(playingPodcastPausedAtom);
  const showWeatherWidget = useAtomValue(weatherWidgetAtom);

  const menuItems = {
    podcast: "🎙️ Podcasts",
    radio: "📻 Radio",
    pomodoro: "🍅 Pomodoro",
    weather: "🌤️ Weather",
    posture: "🧍 Posture",
    seating: "🪑 Seating",
    theme: "🎨 Theme",
    chime: "🔔 Chime",
    chat: "💬 Chat",
  } as const;

  const selectMenuItem = (go: MenuViewName) => setMenu(go);

  return (
    <>
      <div className="absolute inset-0" onClick={() => setMenu(!menu)}>
        <Clock />
      </div>

      {/* widgets: anchored top-right, all widgets in one flex row */}
      {menu === true && !overlayOpen && <HelperButtons system={system} />}

      {!menu && !overlayOpen && (
        <div className="absolute bottom-2 left-2 flex gap-2 pointer-events-auto">
          {showWeatherWidget && (
            <WeatherWidget onOpen={() => setMenu("weather")} />
          )}
          {!podcastPaused && playingPodcast && (
            <PodcastWidget onOpen={() => setMenu("podcast")} />
          )}
          {playingRadio && <RadioWidget onOpen={() => setMenu("radio")} />}
        </div>
      )}

      {!menu && !overlayOpen && (
        <div className="absolute bottom-2 right-2 flex gap-2 pointer-events-auto">
          <PomodoroWidget pomo={pomo} onOpen={() => setMenu("pomodoro")} />
          <SeatingWidget onOpen={() => setMenu("seating")} />
          <PostureWidget onOpen={() => setMenu("posture")} />
        </div>
      )}

      {!menu && !overlayOpen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenu(true);
          }}
          className="button button-glass absolute bottom-2 left-1/2 -translate-x-1/2 !bg-transparent"
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
        /* This whole block mounts once when the menu opens (false -> truthy)
           and stays mounted while navigating between views, so the
           animate-menu-in animation only plays on the initial open. */
        <div className="absolute inset-0" onClick={() => setMenu(false)}>
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 min-w-[300px] max-w-full max-h-[calc(100svh-1rem)] rounded bg-white text-black p-2 z-10 animate-menu-in"
            onClick={(e) => e.stopPropagation()}
          >
            {typeof menu === "string" ? (
              <MenuView
                view={menu}
                onBack={() => setMenu(true)}
                pomo={pomo}
                chime={chime}
              />
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {/*<div></div>*/}
                {(Object.entries(menuItems) as [MenuViewName, string][]).map(
                  ([go, label]) => (
                    <li key={label}>
                      <button
                        className="button w-full"
                        onClick={() => selectMenuItem(go)}
                      >
                        {label}
                      </button>
                    </li>
                  ),
                )}
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
  const [menu, setMenu] = useState<boolean | MenuViewName>(false);

  const pomo = usePomodoro();
  const chime = useChimeSettings();
  useSeatingEngine();
  usePostureEngine();
  useWeatherEngine();
  useChime(chime);
  const c = useAtomValue(paletteAtom);
  const [, setClockTime] = useAtom(clockTimeAtom);

  useEffect(() => {
    const tick = () => setClockTime(Date.now());
    let id: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      id = setInterval(tick, 1000);
      tick();
    }, 1000 - new Date().getMilliseconds());
    return () => {
      clearTimeout(timeout);
      clearInterval(id);
    };
  }, [setClockTime]);

  return (
    <main className="fixed inset-0" style={{ background: c.bg, color: c.text }}>
      <ClockPage
        pomo={pomo}
        chime={chime}
        overlayOpen={false}
        menu={menu}
        setMenu={setMenu}
      />
      <Toaster duration={6000} position="bottom-right" />
    </main>
  );
}
