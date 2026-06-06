const fs = require('node:fs');
const path = require('node:path');

const files = [
  'mobile/node_modules/@expo/cli/build/src/utils/npm.js',
  'mobile/node_modules/@expo/cli/build/src/utils/tar.js',
];

const from = '_tar().default.extract(';
const to = '(_tar().default ?? _tar()).extract(';

for (const relativePath of files) {
  const filePath = path.resolve(__dirname, '..', relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expo CLI helper not found: ${relativePath}`);
  }

  const source = fs.readFileSync(filePath, 'utf8');
  if (source.includes(to)) {
    console.log(`${relativePath} already patched`);
    continue;
  }

  if (!source.includes(from)) {
    throw new Error(`Expected tar helper call not found in ${relativePath}`);
  }

  fs.writeFileSync(filePath, source.replaceAll(from, to));
  console.log(`Patched ${relativePath}`);
}
