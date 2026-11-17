import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
const dist = new URL('../dist/', import.meta.url);
const get = (file) => readFile(new URL(file, dist), 'utf8');
const site = JSON.parse(await readFile(new URL('../data/site.json', import.meta.url), 'utf8'));
const html = await get('index.html');
const privacy = await get('privacidade.html');
const data = JSON.parse(await get('videos.json'));
const notFound = await get('404.html');
const css = await get('style.css');
const all = [html, privacy, notFound];

// Catch accidental dependencies on a developer's machine in publishable text.
const devOnly = /(?:\/\/(?:localhost(?=[:/?#]|$)|127\.0\.0\.1\b|0\.0\.0\.0\b|\[::1\])|\bfile:\/\/|(?:^|[\s"'])[A-Z]:[\\/]|\/(?:Users|home)\/)/im;
const publishableText = ['index.html', 'privacidade.html', '404.html', 'style.css', 'main.js', '_headers', 'videos.json', 'robots.txt', 'sitemap.xml'];
for (const file of publishableText) assert(!devOnly.test(await get(file)), 'Caminho local em ' + file);
const entries = await readdir(dist, {recursive:true, withFileTypes:true});
assert(entries.every(entry => !entry.isSymbolicLink()), 'A saída não pode conter links simbólicos.');

async function checkLocalRef(ref) {
  const local = new URL(ref === '/' || ref === './' ? 'index.html' : ref.replace(/^\//, ''), dist);
  assert(local.href.startsWith(dist.href), 'Referência fora de dist: ' + ref);
  assert((await stat(local)).isFile(), 'Referência sem arquivo: ' + ref);
}

assert.equal(data.channelId, site.channelId);
assert(data.videos.length <= 6);
assert.equal(new Set(data.videos.map(({id}) => id)).size, data.videos.length);
assert(data.videos.every(({id, url}) => url === 'https://www.youtube.com/watch?v=' + id));
const recentSection = html.match(/<section id="videos"[^>]*>[\s\S]*?<\/section>/)?.[0];
assert(recentSection && !recentSection.includes('youtube.com/shorts/'));
assert.equal((html.match(/class="video-card(?: |")/g) || []).length, data.videos.length + site.featured.length);
assert.equal((html.match(/<time datetime=/g) || []).length, data.videos.filter(video => video.publishedAt).length);
for (const video of site.featured) assert(html.includes('https://youtu.be/' + video.id));
assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
assert.match(html, /<html lang="pt-BR">/);
assert(html.includes('mailto:' + site.email));
assert(html.includes('<link rel="canonical" href="' + site.origin + '/">'));
assert(privacy.includes('<link rel="canonical" href="' + site.origin + '/privacidade">'));
assert.match(notFound, /<meta name="robots" content="noindex">/);
assert((await get('sitemap.xml')).includes(site.origin + '/privacidade'));
assert((await get('robots.txt')).includes(site.origin + '/sitemap.xml'));

for (const page of all) {
  assert(!page.includes('{{'), 'Marcadores de build pendentes');
  const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, link] of page.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    if (link.startsWith('#')) {
      assert(ids.includes(link.slice(1)), 'Âncora sem destino: ' + link);
      continue;
    }
    if (link.startsWith('https://') || link.startsWith('mailto:')) continue;
    for (const candidate of link.split(/,\s+/)) {
      await checkLocalRef(candidate.split(' ')[0]);
    }
  }
}
for (const [, asset] of css.matchAll(/url\(\s*["']?([^"'()\s]+)["']?\s*\)/g)) await checkLocalRef(asset);
console.log('Saída estática, caminhos de produção, assets, rotas, SEO e catálogo de vídeos verificados.');
