# Unbrick-it

## TODO list

- [ ] timer on small screen
- [ ] radio sleep mode
- [ ] pomodoro timer
- [ ] dont chime at night
- [ ] add vibration to chime & timer
- [ ] alarm: chime, speak, vibrate
- [ ] podcast? DI Discs

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
