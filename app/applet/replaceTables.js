import fs from 'fs';
import path from 'path';

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, filesList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

const files = getFiles('./src');

const map = {
  'businesses': 'Directorio',
  'clients': 'Clientes',
  'agent_earnings': 'Comisiones',
  'invoices': 'Facturas',
  'roles': 'Roles',
  'asuntos': 'Asuntos',
  'propuestas': 'Propuestas',
  'solicitudes': 'Solicitudes',
  'withdrawal_requests': 'Withdrawal_requests'
};

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    for (const [key, value] of Object.entries(map)) {
      content = content.replace(new RegExp(`'${key}'`, 'g'), `'${value}'`);
      content = content.replace(new RegExp(`"${key}"`, 'g'), `"${value}"`);
    }
    fs.writeFileSync(file, content);
    console.log(`Replaced in ${file}`);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.error(`Error processing ${file}: ${e.message}`);
    }
  }
}
