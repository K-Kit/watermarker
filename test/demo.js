#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

// Paths
const BASE_DIR = __dirname;
const IMAGES_DIR = path.join(BASE_DIR, 'images');
const WATERMARKED_DIR = path.join(BASE_DIR, 'watermarked');
const LOGO_PATH = path.join(BASE_DIR, 'logo.png');

// Create sample images in not already present
function createSampleImages() {
  // Make sure directories exist
  fs.ensureDirSync(IMAGES_DIR);
  
  // Check if images already exist
  if (fs.readdirSync(IMAGES_DIR).length === 0) {
    console.log('Creating sample images for demonstration...');
    
    // Generate 3 sample colored images
    const colors = ['red', 'green', 'blue'];
    
    for (let i = 0; i < colors.length; i++) {
      const outputPath = path.join(IMAGES_DIR, `sample_${colors[i]}.png`);
      
      // Use string interpolation for the command with proper quotes
      const command = `
        node -e "
          const sharp = require('sharp');
          sharp({
            create: {
              width: 500,
              height: 300,
              channels: 3,
              background: { r: ${colors[i] === 'red' ? 255 : 0}, g: ${colors[i] === 'green' ? 255 : 0}, b: ${colors[i] === 'blue' ? 255 : 0} }
            }
          })
          .png()
          .toFile('${outputPath}')
          .then(() => console.log('Created ${outputPath}'))
          .catch(err => console.error('Error:', err));
        "
      `;
      
      execSync(command, { stdio: 'inherit' });
    }
    
    // Create a simple logo for watermark
    console.log('Creating logo for watermark...');
    const logoCommand = `
      node -e "
        const sharp = require('sharp');
        const svgBuffer = Buffer.from('<svg width=\\"200\\" height=\\"100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect width=\\"200\\" height=\\"100\\" fill=\\"rgba(255,255,255,0.5)\\"/><text x=\\"20\\" y=\\"65\\" font-family=\\"Arial\\" font-size=\\"30\\" fill=\\"black\\">WATERMARK</text></svg>');
        
        sharp(svgBuffer)
          .png()
          .toFile('${LOGO_PATH}')
          .then(() => console.log('Created watermark logo'))
          .catch(err => console.error('Error:', err));
      "
    `;
    
    execSync(logoCommand, { stdio: 'inherit' });
  } else {
    console.log('Sample images already exist, skipping creation.');
  }
}

// Run watermarker with various examples
function runDemos() {
  console.log('\n=== DEMO 1: Text Watermark ===');
  execSync(`node ${path.join(process.cwd(), 'index.js')} -i ${IMAGES_DIR} -o ${WATERMARKED_DIR}/text -t "© 2024"`, { stdio: 'inherit' });
  
  console.log('\n=== DEMO 2: Image Watermark ===');
  execSync(`node ${path.join(process.cwd(), 'index.js')} -i ${IMAGES_DIR} -o ${WATERMARKED_DIR}/image -w ${LOGO_PATH}`, { stdio: 'inherit' });
  
  console.log('\n=== DEMO 3: Custom Position & Opacity ===');
  execSync(`node ${path.join(process.cwd(), 'index.js')} -i ${IMAGES_DIR} -o ${WATERMARKED_DIR}/custom -t "CENTER MARK" -p center -a 0.8 -s 0.4`, { stdio: 'inherit' });
  
  console.log('\n=== DEMOS COMPLETED ===');
  console.log(`Check the output in: ${WATERMARKED_DIR}`);
}

// Main function
async function main() {
  try {
    // Ensure directories exist
    fs.ensureDirSync(IMAGES_DIR);
    fs.ensureDirSync(WATERMARKED_DIR);
    
    // Create sample images
    createSampleImages();
    
    // Run demos
    runDemos();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 