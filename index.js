#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const { glob } = require('glob');
const { program } = require('commander');

// Configure CLI options
program
  .name('watermarker')
  .description('Add watermarks to all images in a directory')
  .version('1.0.0')
  .requiredOption('-i, --input <directory>', 'Input directory containing images')
  .option('-o, --output <directory>', 'Output directory for watermarked images', './watermarked')
  .option('-w, --watermark <file>', 'Path to watermark image')
  .option('-t, --text <text>', 'Text to use as watermark')
  .option('-p, --position <position>', 'Watermark position: topleft, topright, bottomleft, bottomright, center', 'bottomright')
  .option('-a, --opacity <opacity>', 'Watermark opacity (0-1)', '0.5')
  .option('-s, --scale <scale>', 'Watermark scale relative to image size (0-1)', '0.2')
  .option('-f, --filter <filter>', 'Image file extensions to process', '*.{jpg,jpeg,png,gif,webp}')
  .parse();

const options = program.opts();

// Ensure the input directory exists
if (!fs.existsSync(options.input)) {
  console.error(`Error: Input directory "${options.input}" does not exist`);
  process.exit(1);
}

// Create output directory if it doesn't exist
fs.ensureDirSync(options.output);

// Validate that either watermark image or text is provided
if (!options.watermark && !options.text) {
  console.error('Error: Either a watermark image (-w) or text (-t) must be provided');
  process.exit(1);
}

// Get position coordinates based on selected option
function getPositionCoordinates(position, imageWidth, imageHeight, watermarkWidth, watermarkHeight) {
  const padding = 10;
  
  switch (position.toLowerCase()) {
    case 'topleft':
      return { left: padding, top: padding };
    case 'topright':
      return { left: imageWidth - watermarkWidth - padding, top: padding };
    case 'bottomleft':
      return { left: padding, top: imageHeight - watermarkHeight - padding };
    case 'bottomright':
      return { left: imageWidth - watermarkWidth - padding, top: imageHeight - watermarkHeight - padding };
    case 'center':
    default:
      return { left: (imageWidth - watermarkWidth) / 2, top: (imageHeight - watermarkHeight) / 2 };
  }
}

// Find all image files in the input directory
async function findImages() {
  try {
    const files = await glob(options.filter, { cwd: options.input, absolute: true });
    return files;
  } catch (err) {
    throw err;
  }
}

// Create a text watermark
async function createTextWatermark(width, height) {
  // Get text length
  const textLength = options.text.length;
  
  // Calculate width and height differently
  // Scale affects width more than height for text
  const scaleFactor = parseFloat(options.scale);
  const watermarkWidth = Math.max(50, width);
  // Use a smaller scale factor for height
  const watermarkHeight = Math.max(50, height * 0.6);
  
  // Base font size calculation - more based on width than height for text
  let fontSize = Math.floor(Math.min(watermarkWidth / 5, watermarkHeight / 1.2));
  
  // More aggressive scaling for longer text
  if (textLength > 8) {
    // Apply a more progressive scaling factor as text gets longer
    const textScaleFactor = Math.min(1, 8 / textLength);
    fontSize = Math.floor(fontSize * textScaleFactor * 1.5);
  }
  
  // Cap maximum font size based on watermark dimensions
  const maxFontSize = Math.min(watermarkWidth / (textLength * 0.6), watermarkHeight * 0.9);
  fontSize = Math.min(fontSize, maxFontSize);
  
  // Ensure minimum font size
  fontSize = Math.max(12, fontSize);
  
  // Calculate better SVG dimensions
  // Give more room horizontally, less vertically
  const svgWidth = Math.max(watermarkWidth, fontSize * textLength * 0.7);
  // Height should be just enough for the text
  const svgHeight = Math.max(Math.min(watermarkHeight, fontSize * 1.3), fontSize * 1.2);
  
  console.log(`Text: "${options.text}", Length: ${textLength}, Font size: ${fontSize}px, SVG: ${Math.round(svgWidth)}x${Math.round(svgHeight)}`);
  
  const svgText = `
    <svg width="${Math.round(svgWidth)}" height="${Math.round(svgHeight)}" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}px" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
        style="filter: drop-shadow(0px 0px 2px rgba(0,0,0,0.5));"
      >${options.text}</text>
    </svg>
  `;
  
  try {
    // Convert SVG to PNG
    const watermarkBuffer = await sharp(Buffer.from(svgText))
      .png()
      .toBuffer();
    
    return watermarkBuffer;
  } catch (err) {
    console.error(`Error creating SVG: ${err.message}`);
    console.log('SVG content:', svgText);
    throw err;
  }
}

// Process an image and add the watermark
async function processImage(inputFile) {
  try {
    const filename = path.basename(inputFile);
    const outputFile = path.join(options.output, filename);
    
    console.log(`Processing: ${filename}`);
    
    // Check if file exists and is accessible
    try {
      await fs.access(inputFile, fs.constants.R_OK);
    } catch (err) {
      console.error(`Error: Cannot access file ${inputFile}: ${err.message}`);
      return;
    }
    
    // Get file stats to confirm it's a valid file
    const stats = await fs.stat(inputFile);
    if (!stats.isFile()) {
      console.error(`Error: ${inputFile} is not a file`);
      return;
    }
    
    if (stats.size === 0) {
      console.error(`Error: ${inputFile} is empty`);
      return;
    }
    
    // Get image metadata
    let imageMetadata;
    try {
      imageMetadata = await sharp(inputFile).metadata();
    } catch (err) {
      console.error(`Error reading metadata for ${filename}: ${err.message}`);
      return;
    }
    
    if (!imageMetadata.width || !imageMetadata.height) {
      console.error(`Error: Invalid image dimensions for ${filename}`);
      return;
    }
    
    const { width: imageWidth, height: imageHeight } = imageMetadata;
    console.log(`Image dimensions: ${imageWidth}x${imageHeight}`);
    
    // Calculate watermark dimensions
    const watermarkMaxWidth = Math.max(50, imageWidth * parseFloat(options.scale));
    const watermarkMaxHeight = Math.max(50, imageHeight * parseFloat(options.scale));
    
    let watermarkBuffer;
    
    if (options.text) {
      // Create text watermark
      try {
        watermarkBuffer = await createTextWatermark(watermarkMaxWidth, watermarkMaxHeight);
      } catch (err) {
        console.error(`Error creating text watermark: ${err.message}`);
        return;
      }
    } else {
      // Load and resize image watermark
      try {
        watermarkBuffer = await sharp(options.watermark)
          .resize({
            width: Math.floor(watermarkMaxWidth),
            fit: 'inside'
          })
          .ensureAlpha()
          .toBuffer();
      } catch (err) {
        console.error(`Error loading watermark image: ${err.message}`);
        return;
      }
    }
    
    // Get watermark dimensions
    let watermarkMetadata;
    try {
      watermarkMetadata = await sharp(watermarkBuffer).metadata();
    } catch (err) {
      console.error(`Error getting watermark metadata: ${err.message}`);
      return;
    }
    
    // Calculate position
    const position = getPositionCoordinates(
      options.position,
      imageWidth,
      imageHeight,
      watermarkMetadata.width,
      watermarkMetadata.height
    );
    
    // Apply watermark
    try {
      await sharp(inputFile)
        .composite([{
          input: watermarkBuffer,
          left: Math.floor(position.left),
          top: Math.floor(position.top),
          blend: 'over',
          opacity: parseFloat(options.opacity)
        }])
        .toFile(outputFile);
      
      console.log(`Successfully processed: ${filename}`);
    } catch (err) {
      console.error(`Error applying watermark to ${filename}: ${err.message}`);
    }
  } catch (error) {
    console.error(`Error processing ${path.basename(inputFile)}: ${error.message}`);
  }
}

// Main function
async function main() {
  try {
    console.log(`Searching for images in: ${options.input}`);
    console.log(`Output directory: ${options.output}`);
    
    const images = await findImages();
    
    if (images.length === 0) {
      console.log('No images found matching the filter pattern.');
      return;
    }
    
    console.log(`Found ${images.length} images to process`);
    
    // Process all images
    for (const image of images) {
      await processImage(image);
    }
    
    console.log(`Done! Processed ${images.length} images`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main(); 