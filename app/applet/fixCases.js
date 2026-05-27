import fs from 'fs';

const files = [
  'src/App.tsx',
  'src/components/Layout.tsx',
  'src/components/ModulesSelection.tsx',
  'src/components/UsuariosRoles.tsx'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/'Asuntos'/g, "'asuntos'");
  c = c.replace(/'Propuestas'/g, "'propuestas'");
  c = c.replace(/'Solicitudes'/g, "'solicitudes'");
  fs.writeFileSync(f, c);
});
