# Unbrick-it

## TODO list

-[x] posture app
-[x] jotai for pomodoro, tracker + chime
-[x] one clock tick per app, not 3 / use jotai or so atomic
-[x] PWA
-[ ] daylight cols 9:30 both are same red
-[ ] weather still shows sun emoji after sunset > find weather icons

## OLD

- [x] timer on small screen
- [ ] radio sleep mode
- [ ] dont chime at night
- [/] add vibration to chime & timer
- [ ] spotify api - control music / start playlists? / playback sdk?
- [ ] canvas animated background
- [ ] analog & other clock?
- [ ] usb - HW buttons ? what for?
- [x] web speech api
- [ ] tiny desk? https://www.youtube.com/watch?v=kfUcI82SZv4&list=PL1B627337ED6F55F0

**auth**
Hono + better auth
https://hono.dev/examples/better-auth-on-cloudflare

**radio**

- radio browser? https://www.radio-browser.info/search?page=1&order=clickcount&reverse=true&hidebroken=true&name=fm4

- fm4 https://orf-live.ors-shoutcast.at/fm4-q2a
- fm4 https://orf-live.ors-shoutcast.at/fm4-q1a
- nts http://stream-relay-geo.ntslive.net/stream
- kexp http://live-mp3-128.kexp.org/kexp128.mp3
- worldwide fm http://worldwidefm.out.airtime.pro:8000/worldwidefm_a
- npr https://npr-ice.streamguys1.com/live.mp3

**radio**

- desert island discs
  - RSS https://podcasts.files.bbci.co.uk/b006qnmr.rss

```
import Parser from 'rss-parser';
const parser = new Parser();
async function getDesertIslandDiscs() {
  const feed = await parser.parseURL('https://podcasts.files.bbci.co.uk/b006qnmr.rss');
  return feed.items.map(item => ({
    title: item.title,
    description: item.contentSnippet,
    audioUrl: item.enclosure?.url,
    pubDate: item.pubDate,
    duration: item.itunes?.duration
  }));
}
```

**weather**

- https://open-meteo.com

**framework submodule**

`git submodule update --remote framework`
