/* eslint-disable no-console */
import path from 'path';
import nodeWindows from 'node-windows';
import { fileURLToPath } from 'url';

const { Service } = nodeWindows;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptPath = path.join(__dirname, '..', 'src', 'index.js');

const svc = new Service({
  name: 'PrintManagerCollector',
  description: 'Coletor de impressões — Print Manager',
  script: scriptPath,
  nodeOptions: ['--harmony'],
});

svc.on('install', () => {
  svc.start();
  console.log('Serviço instalado e iniciado.');
});

svc.on('alreadyinstalled', () => {
  console.log('Serviço já instalado.');
});

svc.install();
