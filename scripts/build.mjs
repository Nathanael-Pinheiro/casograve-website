import { cp, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const path = (relative) => fileURLToPath(new URL('../' + relative, import.meta.url));
const read = (relative) => readFile(path(relative), 'utf8');
const json = async (relative) => JSON.parse(await read(relative));
const site = await json('data/site.json');
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
})[c]);
const https = (url) => {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('URL inválida: ' + url);
  return escapeHtml(parsed.href);
};
const whatsappDigits = site.whatsapp.number.replace(/\D/g, '');
if (!/^[1-9][0-9]{1,14}$/.test(whatsappDigits) || site.whatsapp.url !== 'https://wa.me/' + whatsappDigits) {
  throw new Error('O link do WhatsApp comercial precisa corresponder ao número configurado.');
}
const whatsappUrl = https(site.whatsapp.url);
const idPattern = /^[a-zA-Z0-9_-]{11}$/;
const videoId = (id) => {
  if (!idPattern.test(id)) throw new Error('ID de vídeo inválido: ' + id);
  return id;
};
const view = (id) => 'https://youtu.be/' + videoId(id);
const external = 'target="_blank" rel="noopener noreferrer"';

const icons = {
  youtube: '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none"/>',
  external: '<path d="M7 17 17 7M7 7h10v10"/>',
  down: '<path d="M12 4v15m-6-6 6 6 6-6"/>',
  up: '<path d="M12 20V5m-6 6 6-6 6 6"/>',
  menu: '<path d="M3 7h18M3 12h18M3 17h18"/>',
  play: '<path d="m8 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2m2-7a3 3 0 0 1 4 3v3m-5-14a3 3 0 0 1 0 6"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.5-4A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 11.5h8"/>',
  whatsapp: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.5-4A8.5 8.5 0 1 1 21 11.5Z"/><path d="M9.6 7.1 8 8.3c0 3.5 3.2 6.7 6.7 6.7l1.2-1.6-2.3-1.2-.9.9a6 6 0 0 1-2.8-2.8l.9-.9-1.2-2.3Z"/>',
  tag: '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1"/>',
  mail: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01"/>',
};
const icon = (key) => {
  if (!icons[key]) throw new Error('Ícone inexistente: ' + key);
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[key] + '</svg>';
};
const localThumbs = new Set(await readdir(path('src/assets/thumbs')).catch((error) => {
  if (error.code === 'ENOENT') return [];
  throw error;
}));
const dateFormat = new Intl.DateTimeFormat('pt-BR', {dateStyle:'medium', timeZone:'America/Sao_Paulo'});
function videoCard(video, { feature = false, lead = false, index = 0 } = {}) {
  const id = videoId(video.id);
  const url = https(feature ? view(id) : video.url);
  const title = escapeHtml(video.title || 'Assistir ao vídeo no YouTube');
  const path = 'https://i.ytimg.com/vi/' + id + '/';
  const local = localThumbs.has(id + '.webp');
  const thumb = local ? 'assets/thumbs/' + id + '.webp' : path + 'maxresdefault.jpg';
  const date = video.publishedAt && new Date(video.publishedAt);
  const label = feature
    ? '<span class="video-index" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span>'
    : '';
  return `<a class="video-card${lead ? ' featured-main' : ''}" href="${url}" ${external}>
    <span class="video-thumb">
      <img src="${thumb}" data-hq="${path}hqdefault.jpg"${local ? ' data-max="' + path + 'maxresdefault.jpg"' : ''} referrerpolicy="no-referrer" loading="lazy" decoding="async" width="640" height="360" alt="">
      ${label}<span class="play">${icon('play')}</span>
    </span>
    <div class="video-copy"><h3>${title}</h3>${date && !Number.isNaN(+date) ? '<time datetime="' + escapeHtml(video.publishedAt) + '">' + dateFormat.format(date) + '</time>' : ''}</div>
  </a>`;
}
const emptyCache = {channelId: site.channelId, videos: []};
let cache;
try {
  cache = await json('data/videos.json');
  if (cache.channelId !== site.channelId || !Array.isArray(cache.videos) || cache.videos.length > 6 ||
      cache.videos.some(({id, title, url}) => !idPattern.test(id) || typeof title !== 'string' || !title.trim() ||
        url !== 'https://www.youtube.com/watch?v=' + id)) throw new Error('Cache com formato inválido.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  cache = emptyCache;
}
const latest = cache.videos.length
  ? '<div class="video-grid">' + cache.videos.map(video => videoCard(video)).join('\n') + '</div>'
  : '<div class="video-empty"><p>Confira as publicações mais recentes direto no canal.</p><a class="text-link" href="' + https(site.youtube + '/videos') + '" ' + external + '>Abrir o Caso Grave no YouTube ' + icon('external') + '</a></div>';
const featured = '<div class="featured-grid">' + videoCard(site.featured[0], {feature:true, lead:true}) +
  '<div class="featured-side">' + site.featured.slice(1).map((video, i) => videoCard(video, {feature:true, index:i+1})).join('\n') + '</div></div>';
const metricItems = [
  ['inscritos no YouTube', site.metrics.subscribers],
  ['visualizações totais', site.metrics.views],
  ['vídeos publicados', site.metrics.videos],
];
const metricFormat = new Intl.NumberFormat('pt-BR');
const channelMetrics = metricItems.every(([, count]) => Number.isSafeInteger(count) && count >= 0)
  ? '<p class="channel-metrics">' + metricItems.map(([label, count]) => metricFormat.format(count) + ' ' + label).join(' · ') + '</p>'
  : '';
const quickLink = (label, key, href, attributes = '') => `<li>
  <a class="quick-link" href="${href}"${attributes ? ' ' + attributes : ''}>${icon(key)}<span>${escapeHtml(label)}</span>${icon('external')}</a>
</li>`;
const quickLinks = [
  quickLink('YouTube', 'youtube', https(site.youtube), external),
  quickLink('Instagram', 'instagram', https(site.instagram), external),
  ...site.community.filter(group => group.quickLabel).map(group =>
    quickLink(group.quickLabel, group.quickIcon ?? group.icon, https(group.url), external)),
  quickLink('Parcerias', 'mail', 'mailto:' + escapeHtml(site.email)),
  quickLink('Contato', 'whatsapp', whatsappUrl),
].join('\n');
const components = '<ul class="components" aria-label="Componentes trabalhados na série">' +
  site.tagima.components.map(part => '<li>' + escapeHtml(part) + '</li>').join('') + '</ul>';
const episodes = site.tagima.episodes.length ? '<ul class="episode-list" aria-label="Vídeos do Projeto Tagima Ultra">' +
  site.tagima.episodes.map(({id, label, title}, i) =>
    '<li><a href="' + https(view(id)) + '" ' + external + '><span class="episode-number" aria-hidden="true">' + String(i+1).padStart(2, '0') +
    '</span><span class="episode-title"><small>' + escapeHtml(label) + '</small>' +
    escapeHtml(title ?? site.featured.find(video => video.id === id)?.title ?? 'Assistir ao vídeo no YouTube') +
    '</span>' + icon('external') + '</a></li>').join('') + '</ul>' : '';

const community = site.community.map(group => `<article class="community-card">
  <div class="community-type eyebrow">${icon(group.icon)} ${escapeHtml(group.platform)}</div>
  <h3>${escapeHtml(group.name)}</h3><p>${escapeHtml(group.description)}</p>
  <a class="text-link" href="${https(group.url)}" ${external}>${escapeHtml(group.cta)} ${icon('external')}</a>
</article>`).join('\n');
const origin = new URL(site.origin).origin;
const brand = '<a class="brand" href="{{home}}" aria-label="Caso Grave — início"><span class="brand-mark"><img src="assets/images/logo.webp" alt="" width="340" height="200"></span><span class="brand-name" aria-hidden="true">Caso<br>Grave</span></a>';
const data = {
  origin: escapeHtml(origin), youtube: https(site.youtube), instagram: https(site.instagram), email: escapeHtml(site.email),
  whatsappNumber: escapeHtml(site.whatsapp.number), whatsappUrl,
  brand, latest, featured, channelMetrics, quickLinks, series: https(site.tagima.url), components, episodes, community,
  mediaKit: site.mediaKit ? '<a class="text-link" href="' + https(site.mediaKit) + '" ' + external + '>Ver mídia kit ' + icon('external') + '</a>' : '',
  year: new Date().getUTCFullYear(),
};
function render(source, home) {
  return source
    .replace(/\{\{([a-zA-Z:]+)\}\}/g, (_match, key) => {
      if (key.startsWith('icon:')) return icon(key.slice(5));
      if (!Object.hasOwn(data, key)) throw new Error('Marcador sem valor: ' + key);
      return data[key];
    })
    .replaceAll('{{home}}', home);
}

// Start with a clean, generated directory on every build. Never follow a link out of the project.
const dist = resolve(await realpath(path('.')), 'dist');
const priorOutput = await lstat(dist).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
});
if (priorOutput) {
  if (!priorOutput.isDirectory() || priorOutput.isSymbolicLink() || await realpath(dist) !== dist) {
    throw new Error('dist precisa ser uma pasta gerada dentro do projeto.');
  }
  await rm(dist, {recursive:true});
}
await mkdir(path('dist/assets/thumbs'), {recursive:true});
await Promise.all([
  cp(path('src/assets/images'), path('dist/assets/images'), {recursive:true}),
  cp(path('src/assets/fonts'), path('dist/assets/fonts'), {recursive:true}),
  ...['style.css','main.js','_headers'].map(file => cp(path('src/' + file), path('dist/' + file))),
  ...[...new Set([...cache.videos, ...site.featured].map(({id}) => id + '.webp'))]
    .filter(file => localThumbs.has(file)).map(file => cp(path('src/assets/thumbs/' + file), path('dist/assets/thumbs/' + file))),
  writeFile(path('dist/index.html'), render(await read('src/index.html'), '#inicio')),
  writeFile(path('dist/privacidade.html'), render(await read('src/privacidade.html'), 'index.html')),
  cp(path('src/404.html'), path('dist/404.html')),
  writeFile(path('dist/videos.json'), JSON.stringify(cache, null, 2) + '\n'),
  writeFile(path('dist/robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + origin + '/sitemap.xml\n'),
  writeFile(path('dist/sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ['/', '/privacidade'].map(route => '  <url><loc>' + escapeHtml(origin) + route + '</loc></url>').join('\n') + '\n</urlset>\n'),
]);
console.log(`Build pronto em dist/ · ${cache.videos.length} vídeos recentes · ${site.featured.length} destaques.`);
