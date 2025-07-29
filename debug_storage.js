// Zkontroluj localStorage
console.log('Current localStorage:', localStorage.getItem('larpConfig'));

// Oprav URL pokud je potřeba
const config = JSON.parse(localStorage.getItem('larpConfig') || '{}');
if (config.sheetsUrl && config.sheetsUrl.includes('/edit')) {
  console.log('Fixing URL format...');
  const match = config.sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    config.sheetsUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&sheet=`;
    localStorage.setItem('larpConfig', JSON.stringify(config));
    console.log('URL fixed, new config:', config);
    console.log('Reloading page...');
    location.reload();
  }
} else {
  console.log('URL is already in correct format or missing');
}
