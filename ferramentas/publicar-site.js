// =====================================================================
//  Envia a pasta site/ para a branch gh-pages do GitHub
//
//  O GitHub Pages publica o que estiver nessa branch. Como a pasta
//  site/ e gerada (nao versionada na branch principal), usamos um
//  repositorio temporario dentro dela e sobrescrevemos a gh-pages.
//
//  Rode SEMPRE depois de gerar-site.js — o atalho PUBLICAR-SITE.bat
//  ja faz os dois na ordem certa.
// =====================================================================

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(RAIZ, 'site');

if (!existsSync(join(SITE, 'index.html'))) {
  console.error('');
  console.error('  A pasta site/ nao existe ou esta incompleta.');
  console.error('  Rode antes:  node ferramentas/gerar-site.js');
  console.error('');
  process.exit(1);
}

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' });

// De onde enviar: o mesmo endereco da branch principal
let origem;
try {
  origem = git(['remote', 'get-url', 'origin'], RAIZ).trim();
} catch {
  console.error('  Este projeto ainda nao esta ligado a um repositorio no GitHub.');
  process.exit(1);
}

console.log('');
console.log('  Enviando a demonstracao para o GitHub Pages...');

// repositorio temporario dentro de site/
rmSync(join(SITE, '.git'), { recursive: true, force: true });

git(['init', '-q'], SITE);
git(['checkout', '-q', '-b', 'gh-pages'], SITE);
git(['add', '-A'], SITE);
git([
  '-c', 'user.name=Aric Pazzini',
  '-c', 'user.email=aric.pazzini@gmail.com',
  'commit', '-q', '-m', 'Demonstracao do sistema Marelo Motos (gerada automaticamente)',
], SITE);
git(['push', '-q', '--force', origem, 'gh-pages:gh-pages'], SITE);

// nao deixa lixo para tras
rmSync(join(SITE, '.git'), { recursive: true, force: true });

const dono = origem.replace(/.*github\.com[/:]/, '').replace(/\.git$/, '').split('/');
console.log('');
console.log('  Publicado. O link e:');
console.log(`  https://${dono[0].toLowerCase()}.github.io/${dono[1]}/`);
console.log('');
console.log('  O GitHub pode levar ate 2 minutos para atualizar.');
console.log('');
