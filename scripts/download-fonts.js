import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontsDir = path.join(__dirname, '../public/fonts');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  {
    name: 'Amiri-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf'
  },
  {
    name: 'Fustat-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/fustat/Fustat-Regular.ttf'
  }
];

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: Status Code ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

console.log('Starting font downloads...');

Promise.all(fonts.map(async (font) => {
  const dest = path.join(fontsDir, font.name);
  console.log(`Downloading ${font.name}...`);
  try {
    await downloadFile(font.url, dest);
    console.log(`Successfully downloaded ${font.name}`);
  } catch (err) {
    console.error(`Error downloading ${font.name}:`, err.message);
  }
})).then(() => {
  console.log('All downloads completed.');
}).catch(err => {
  console.error('Migration failed:', err);
});
