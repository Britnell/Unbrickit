const parser = (str: string, startStr: string, endStr: string, offset = 0) => {
  const begin = str.indexOf(startStr, offset);
  const end = str.indexOf(endStr, begin + startStr.length);
  if (begin == -1 || end == -1) return null;
  return str.substring(begin, end + endStr.length);
};

export function pickEpisode(xml: string) {
  const r = Math.floor(Math.random() * xml.length);
  return parser(xml, '<item>', '</item>', r);
}

export const getEpisodeAudio = (episode: string) => {
  const ppg = parser(episode, '<ppg:enclosureSecure', '/>');
  if (!ppg) return null;
  const urltag = parser(ppg, 'url="', '"');
  if (!urltag) return null;
  return parser(urltag, 'https', '.mp3');
};

export const getEpisodeTitle = (episode: string) => {
  const titleTag = parser(episode, '<title>', '</title>');
  if (!titleTag) return null;
  return titleTag.slice(7, -8);
};

export const getEpisodeLink = (episode: string) => {
  const linkTag = parser(episode, '<link>', '</link>');
  if (!linkTag) return null;
  return linkTag.slice(6, -7);
};

export async function getDesertIslandEpisode() {
  const xml = await fetch('https://podcasts.files.bbci.co.uk/b006qnmr.rss')
    .then((res) => res.text())
    .catch(() => null);
  if (!xml) return null;

  const episode = pickEpisode(xml);
  if (!episode) {
    return null;
  }

  const audio = getEpisodeAudio(episode);
  const title = getEpisodeTitle(episode);
  const url = getEpisodeLink(episode);

  return {
    audio,
    title: title || 'Unknown title',
    url,
    // episode,
  };
}
