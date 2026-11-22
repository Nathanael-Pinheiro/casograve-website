import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Browser regression tests with the installed Chrome/Edge and Node's native CDP client.
// No browser packages or downloads; all external DNS is blocked in this test profile.
const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = process.argv[2] && resolve(process.argv[2]);
const origin = 'http://127.0.0.1:4191/';
const baselineOrigin = 'http://127.0.0.1:4192/';
const key = 'casograve:welcome:v1:closed';
const site = JSON.parse(await readFile(join(root, 'data/site.json'), 'utf8'));
const backstage = site.community.find(group => group.name === 'Bastidores do Caso Grave').url;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const children = [];
let socket, profile;
const pending = new Map();
let nextId = 0;
async function until(check, label) {
  for (let i = 0; i < 120; i++) {
    const value = await check();
    if (value) return value;
    await delay(50);
  }
  throw new Error('Timeout: ' + label);
}
function cmd(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP: ' + method)); }, 10000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params, sessionId}));
  });
}
function start(command, args, options = {}) {
  const child = spawn(command, args, {cwd:root, windowsHide:true, stdio:['ignore', 'ignore', 'pipe'], ...options});
  children.push(child);
  child.on('error', error => console.error(error.message));
  child.stderr?.on('data', data => console.error(String(data).slice(0, 1800)));
  return child;
}
async function startServer(directory, port) {
  const existing = await fetch('http://127.0.0.1:' + port, {signal:AbortSignal.timeout(1000)}).then(() => true).catch(() => false);
  assert(!existing, 'A porta ' + port + ' já está em uso; encerre a prévia anterior antes de testar.');
  start(process.execPath, [join(directory, 'scripts/preview.mjs')], {env:{...process.env, PORT:String(port)}});
  await until(async () => fetch('http://127.0.0.1:' + port).then(r => r.ok).catch(() => false), 'servidor');
}
async function fresh({width = 1440, height = 1000, setup = '', javascript = true, url = origin, reduced = true} = {}) {
  const {browserContextId} = await cmd('Target.createBrowserContext');
  const {targetId} = await cmd('Target.createTarget', {url:'about:blank', browserContextId});
  const {sessionId} = await cmd('Target.attachToTarget', {targetId, flatten:true});
  const faults = [];
  const onMessage = ({data}) => {
    const event = JSON.parse(data);
    if (event.sessionId === sessionId && event.method === 'Runtime.exceptionThrown') faults.push(event.params.exceptionDetails.text);
  };
  socket.addEventListener('message', onMessage);
  const call = (method, params) => cmd(method, params, sessionId);
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor:1, mobile:width < 600});
  await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion', value:reduced ? 'reduce' : 'no-preference'}]});
  if (setup) await call('Page.addScriptToEvaluateOnNewDocument', {source:setup});
  if (!javascript) await call('Emulation.setScriptExecutionDisabled', {value:true});
  const loaded = async () => until(() => evaluate('document.readyState === "complete" && Boolean(document.querySelector(".site-footer"))').catch(() => false), 'carregamento');
  await call('Page.navigate', {url});
  await loaded();
  const press = async (key, modifiers = 0) => {
    const windowsVirtualKeyCode = key === 'Tab' ? 9 : 27;
    await call('Input.dispatchKeyEvent', {type:'keyDown', key, code:key, windowsVirtualKeyCode, modifiers});
    await call('Input.dispatchKeyEvent', {type:'keyUp', key, code:key, windowsVirtualKeyCode, modifiers});
  };
  const clickAt = async (x, y) => {
    await call('Input.dispatchMouseEvent', {type:'mousePressed', x, y, button:'left', clickCount:1});
    await call('Input.dispatchMouseEvent', {type:'mouseReleased', x, y, button:'left', clickCount:1});
  };
  const click = async selector => {
    const point = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      element.scrollIntoView({block:'center', behavior:'instant'});
      const box = element.getBoundingClientRect();
      return {x:box.x + box.width / 2, y:box.y + box.height / 2};
    })()`);
    await clickAt(point.x, point.y);
  };
  const isOpen = () => evaluate('Boolean(document.querySelector("#welcome-modal")?.open)');
  const finish = async () => {
    assert.deepEqual(faults, [], 'Erros JavaScript');
    socket.removeEventListener('message', onMessage);
    await cmd('Target.disposeBrowserContext', {browserContextId});
  };
  const screenshot = async name => {
    await evaluate('document.fonts.ready');
    const {data} = await call('Page.captureScreenshot', {format:'png'});
    await writeFile(join(root, '.local', name), Buffer.from(data, 'base64'));
    return data;
  };
  return {call, evaluate, press, click, clickAt, isOpen, finish, loaded, screenshot};
}

try {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter(Boolean);
  let executable;
  for (const path of candidates) {
    if (await access(path).then(() => true).catch(() => false)) { executable = path; break; }
  }
  assert(executable, 'Instale Chrome/Edge ou defina CHROME_PATH para executar este teste.');
  await mkdir(join(root, '.local'), {recursive:true});
  profile = await mkdtemp(join(root, '.local/welcome-chrome-'));
  await startServer(root, 4191);
  if (baseline) await startServer(baseline, 4192);
  start(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--remote-debugging-port=0',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    '--user-data-dir=' + profile, 'about:blank']);
  const devtools = await until(() => readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => false), 'Chrome');
  const [port, endpoint] = devtools.trim().split(/\r?\n/);
  socket = new WebSocket('ws://127.0.0.1:' + port + endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });
  socket.addEventListener('message', ({data}) => {
    const message = JSON.parse(data), item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    clearTimeout(item.timer);
    if (message.error) item.reject(new Error(JSON.stringify(message.error)));
    else item.resolve(message.result);
  });

  for (const [width, height] of [[320,568], [375,667], [768,1024], [1440,1000], [667,375]]) {
    const page = await fresh({width, height});
    assert(await page.isOpen(), 'Primeira visita');
    const layout = await page.evaluate(`(() => {
      const modal = document.querySelector('#welcome-modal'), box = modal.getBoundingClientRect();
      const content = modal.querySelector('.welcome-content'), style = getComputedStyle(modal);
      return {overflow:Math.max(0, document.documentElement.scrollWidth - innerWidth),
        inside:box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight,
        clipped:modal.scrollWidth > modal.clientWidth,
        backdrop:getComputedStyle(modal, '::backdrop').backgroundColor,
        dimensions:{x:box.x, y:box.y, width:box.width, height:box.height, viewport:[innerWidth,innerHeight], client:[document.documentElement.clientWidth,document.documentElement.clientHeight]},
        focus:modal.contains(document.activeElement),
        reduced:getComputedStyle(modal).animationName,
        centered:Math.abs(parseFloat(style.marginLeft) - parseFloat(style.marginRight)) <= 1 &&
          Math.abs(parseFloat(style.marginTop) - parseFloat(style.marginBottom)) <= 1,
        pageVisible:document.querySelector('.hero').getBoundingClientRect().height > 0,
        controls:[...content.querySelectorAll('a,button')].every(el => el.getBoundingClientRect().height >= 44)};
    })()`);
    assert.equal(layout.overflow, 0);
    assert(layout.inside && layout.centered && layout.focus && layout.pageVisible && layout.controls && !layout.clipped, JSON.stringify(layout));
    assert.equal(layout.backdrop, 'rgba(0, 0, 0, 0.65)');
    assert.equal(layout.reduced, 'none');
    if ([375,768,1440].includes(width)) await page.screenshot('welcome-' + width + '.png');
    await page.click('.welcome-continue');
    assert.equal(await page.isOpen(), false);
    assert.equal(await page.evaluate('location.href'), origin);
    assert.equal(await page.evaluate('document.documentElement.style.overflow'), '');
    assert.equal(await page.evaluate('document.documentElement.scrollWidth > innerWidth'), false);
    await page.finish();
    console.log(width + 'x' + height + ': modal centralizado, controles acessíveis, sem overflow; continuar fecha sem navegar.');
  }

  for (const action of ['youtube', 'backstage', 'continue', 'close', 'escape', 'backdrop']) {
    const page = await fresh();
    await page.evaluate('window.__welcomeNavigationCheck = "preserved"');
    if (action === 'youtube' || action === 'backstage') {
      const link = action === 'youtube' ? site.youtube : backstage;
      const selector = action === 'youtube' ? '.welcome-actions a:first-child' : '.welcome-actions a:nth-child(2)';
      assert.deepEqual(await page.evaluate(`(() => {
        const a = document.querySelector(${JSON.stringify(selector)});
        return [a.href, a.target, a.rel];
      })()`), [link, '_blank', 'noopener noreferrer']);
      await page.click(selector);
      assert.equal(await page.isOpen(), false, 'Fechamento imediato do link externo');
      const target = await until(async () => (await cmd('Target.getTargets')).targetInfos.find(t => t.url === link), 'nova aba');
      const {sessionId} = await cmd('Target.attachToTarget', {targetId:target.targetId, flatten:true});
      const opener = await cmd('Runtime.evaluate', {expression:'window.opener === null', returnByValue:true}, sessionId);
      assert.equal(opener.result.value, true, 'Nova aba sem opener');
      await cmd('Target.closeTarget', {targetId:target.targetId});
    } else if (action === 'continue') await page.click('.welcome-continue');
    else if (action === 'close') await page.click('.welcome-close');
    else if (action === 'escape') await page.press('Escape');
    else {
      await page.click('.welcome-message');
      assert(await page.isOpen(), 'Clique interno não fecha');
      await page.clickAt(5, 5);
    }
    assert.equal(await page.isOpen(), false, action);
    assert.equal(await page.evaluate('window.__welcomeNavigationCheck'), 'preserved', 'Sem recarregar a aba original');
    assert.equal(await page.evaluate('location.href'), origin, 'Aba original preservada');
    assert.equal(await page.evaluate(`sessionStorage.getItem('${key}')`), '1');
    await page.call('Page.reload');
    await page.loaded();
    assert.equal(await page.isOpen(), false, 'Não reaparece na sessão');
    await page.call('Page.navigate', {url:origin + 'privacidade'});
    await page.loaded();
    await page.call('Page.navigate', {url:origin});
    await page.loaded();
    assert.equal(await page.isOpen(), false, 'Navegação preserva a sessão');
    await page.finish();
    console.log(action + ': fechamento imediato e persistência na sessão; links externos abrem outra aba.');
  }

  {
    const page = await fresh();
    assert(await page.isOpen(), 'Nova sessão deve exibir');
    assert.equal(await page.evaluate('document.activeElement.className'), 'welcome-close');
    await page.press('Tab', 8);
    assert.equal(await page.evaluate('document.activeElement.classList.contains("welcome-continue")'), true);
    await page.press('Tab');
    assert.equal(await page.evaluate('document.activeElement.className'), 'welcome-close');
    for (let i = 0; i < 12; i++) {
      await page.press('Tab');
      assert(await page.evaluate('document.querySelector("#welcome-modal").contains(document.activeElement)'));
    }
    const ax = await page.call('Accessibility.getFullAXTree');
    const axDialog = ax.nodes.find(n => n.role?.value === 'dialog');
    assert.equal(axDialog?.name?.value.toLocaleLowerCase('pt-BR'), 'toda a baixaria começa aqui!', JSON.stringify(axDialog));
    const before = await page.evaluate('scrollY');
    await page.call('Input.dispatchMouseEvent', {type:'mouseWheel', x:5, y:100, deltaX:0, deltaY:500});
    await delay(100);
    assert.equal(await page.evaluate('scrollY'), before, 'Fundo bloqueado');
    await page.press('Escape');
    await page.call('Input.dispatchMouseEvent', {type:'mouseWheel', x:100, y:100, deltaX:0, deltaY:500});
    await until(() => page.evaluate('scrollY > 0'), 'rolagem restaurada');
    await page.finish();
    console.log('Nova sessão, nome acessível, foco contido, Escape e bloqueio/restauração de rolagem: aprovados.');
  }

  {
    const page = await fresh({setup:`document.addEventListener('readystatechange', () => {
      if (document.readyState !== 'interactive') return;
      document.querySelector('.hero-actions a').focus({preventScroll:true});
      window.scrollTo({top:500, behavior:'instant'});
    }, {once:true});`});
    const before = await page.evaluate('scrollY');
    assert(before > 0);
    await page.press('Escape');
    assert.equal(await page.evaluate('scrollY'), before, 'Posição de rolagem preservada');
    assert(await page.evaluate('document.activeElement.matches(".hero-actions a")'), 'Foco restaurado');
    await page.finish();
    console.log('Foco anterior e posição de rolagem preservados.');
  }

  for (const [label, setup, expected] of [
    ['storage bloqueado', `Object.defineProperty(window, 'sessionStorage', {get(){ throw new DOMException('Bloqueado', 'SecurityError'); }});`, true],
    ['dialog indisponível', 'HTMLDialogElement.prototype.showModal = undefined;', false],
    ['falha ao abrir', `HTMLDialogElement.prototype.showModal = () => { throw new Error('Falha simulada'); };`, false],
  ]) {
    const page = await fresh({setup});
    assert.equal(await page.isOpen(), expected, label);
    if (expected) await page.click('.welcome-continue');
    assert.equal(await page.evaluate('document.documentElement.style.overflow'), '');
    await page.click('.hero-actions a[href="#sobre"]');
    await until(() => page.evaluate('location.hash === "#sobre"'), 'navegação');
    await page.finish();
    console.log(label + ': landing page continua utilizável.');
  }
  {
    const page = await fresh({javascript:false});
    assert.equal(await page.isOpen(), false);
    assert.equal(await page.evaluate('getComputedStyle(document.querySelector("#welcome-modal")).display'), 'none');
    await page.finish();
    const animated = await fresh({reduced:false});
    assert.equal(await animated.evaluate('getComputedStyle(document.querySelector("#welcome-modal")).animationDuration'), '0.25s');
    await animated.finish();
    console.log('Sem JavaScript: página utilizável; animação normal de 250ms e movimento reduzido respeitado.');
  }

  if (baseline) {
    const expected = new Set(['index.html', 'main.js', 'style.css', 'privacidade.html']);
    const files = (await readdir(join(root, 'dist'), {recursive:true, withFileTypes:true}))
      .filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name));
    const oldFiles = (await readdir(join(baseline, 'dist'), {recursive:true, withFileTypes:true}))
      .filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name).slice(join(baseline, 'dist').length + 1).replaceAll('\\', '/'));
    assert.deepEqual(files.map(file => file.slice(join(root, 'dist').length + 1).replaceAll('\\', '/')).sort(), oldFiles.sort(), 'Nenhum asset adicionado ou removido');
    const changed = [];
    for (const file of files) {
      const relative = file.slice(join(root, 'dist').length + 1).replaceAll('\\', '/');
      const [old, current] = await Promise.all([readFile(join(baseline, 'dist', relative)), readFile(file)]);
      if (!old.equals(current)) changed.push(relative);
    }
    assert.deepEqual(changed.sort(), [...expected].sort());
    const oldHtml = await readFile(join(baseline, 'dist/index.html'), 'utf8');
    const newHtml = await readFile(join(root, 'dist/index.html'), 'utf8');
    assert.equal(newHtml.replace(/\r?\n  <dialog class="welcome-modal"[\s\S]*?<\/dialog>\r?\n/, ''), oldHtml);
    for (const width of [375, 768, 1440]) {
      const current = await fresh({width, height:1000});
      await current.click('.welcome-continue');
      const old = await fresh({width, height:1000, url:baselineOrigin});
      for (const page of [current, old]) {
        // Mobile scroll indicators fade independently of the content.
        await page.call('Emulation.setScrollbarsHidden', {hidden:true});
        const missing = await page.evaluate(`(async () => {
          document.querySelectorAll('img').forEach(img => img.loading = 'eager');
          await Promise.allSettled([...document.images].map(img => img.decode()));
          await document.fonts.ready;
          window.scrollTo({top:0, behavior:'instant'});
          document.activeElement.blur();
          return [...document.images].filter(img => !img.naturalWidth).map(img => img.src);
        })()`);
        assert.deepEqual(missing, [], 'Todas as imagens locais carregam');
      }
      const a = await current.screenshot('welcome-closed-' + width + '.png');
      const b = await old.screenshot('welcome-baseline-' + width + '.png');
      const hash = png => createHash('sha256').update(Buffer.from(png, 'base64')).digest('hex');
      assert.equal(hash(a), hash(b), 'Screenshot idêntica à v1.0.0 após fechar: ' + width);
      await current.finish();
      await old.finish();
    }
    console.log('v1.0.0: 34 assets idênticos; só 4 arquivos gerados alterados; HTML original preservado e screenshots idênticas após fechar (375/768/1440).');
  }
  console.log('Todos os testes do popup passaram. Capturas em .local/welcome-*.png.');
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    await cmd('Browser.close').catch(() => {});
    socket.close();
  }
  for (const child of children) if (child.exitCode === null) child.kill();
}
