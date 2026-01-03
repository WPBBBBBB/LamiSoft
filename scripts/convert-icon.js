const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../build/icon.svg');
const pngPath = path.join(__dirname, '../build/icon.png');

// Read SVG file
const svgBuffer = fs.readFileSync(svgPath);

// Convert to PNG with 512x512 size
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('✓ Icon converted to PNG successfully');
  })
  .catch(err => {
    console.error('Error converting icon:', err);
  });
