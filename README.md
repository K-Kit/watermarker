# Watermarker Kit

A simple CLI tool to add watermarks to all images in a directory.

## Features

- Add image or text watermarks
- Customize watermark position, opacity, and scale
- Process multiple image formats (jpg, jpeg, png, gif, webp)
- Control which files to process with filters

## Installation

```bash
# Install locally
npm install

# Install globally (optional)
npm install -g .
```

## Usage

```bash
# Basic usage with text watermark
node index.js --input ./images --text "© 2024"

# Using an image as watermark
node index.js --input ./images --watermark ./logo.png

# Full example with all options
node index.js \
  --input ./images \
  --output ./watermarked \
  --watermark ./logo.png \
  --position bottomright \
  --opacity 0.7 \
  --scale 0.25 \
  --filter "*.jpg"

# If installed globally
watermarker-kit --input ./images --text "© 2024"
```

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Input directory containing images | (required) |
| `--output` | `-o` | Output directory for watermarked images | ./watermarked |
| `--watermark` | `-w` | Path to watermark image | (none) |
| `--text` | `-t` | Text to use as watermark | (none) |
| `--position` | `-p` | Watermark position: topleft, topright, bottomleft, bottomright, center | bottomright |
| `--opacity` | `-a` | Watermark opacity (0-1) | 0.5 |
| `--scale` | `-s` | Watermark scale relative to image size (0-1) | 0.2 |
| `--filter` | `-f` | Image file extensions to process | *.{jpg,jpeg,png,gif,webp} |

**Note:** Either `--watermark` or `--text` must be provided.

## License

ISC 