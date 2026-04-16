# GitHub Image Compare

A Chrome extension for browsing and comparing images attached to GitHub Enterprise issues and pull requests.

Click any image in an issue to open a full carousel, navigate with keyboard arrows, select two images for side-by-side comparison, and get quantitative similarity metrics — all without leaving the page.

[한국어 README](./README.ko.md)

---

## Features

- **Image Carousel** — click any image in an issue/PR to open an overlay showing all images on the page as a scrollable thumbnail strip
- **Keyboard Navigation** — `←` / `→` to move between images, `Esc` to close
- **Compare Mode** — select any two images from the thumbnail strip and view them side by side
- **Similarity Metrics** — five quantitative measures calculated in-browser with no external API:

| Metric | Description | Range |
|--------|-------------|-------|
| **SSIM** | Structural Similarity Index (perceptual quality model) | 0 – 1 (1 = identical) |
| **MSE** | Mean Squared Error (pixel-level difference) | 0 – ∞ (0 = identical) |
| **PSNR** | Peak Signal-to-Noise Ratio | dB (higher = more similar) |
| **pHash** | Perceptual Hash similarity (DCT-based) | 0 – 100% |
| **Histogram Correlation** | RGB color distribution similarity | −1 – 1 (1 = identical) |

- **Diff Heatmap** — visualize pixel-level differences between two images as a blue-to-red heatmap
- **Shadow DOM isolation** — the overlay is fully isolated from GitHub's own CSS; no style conflicts
- **GitHub Enterprise compatible** — works on any GHE installation regardless of domain

---

## Screenshots

| Carousel | Compare Mode | Metrics Panel |
|----------|-------------|---------------|
| Thumbnail strip + main image view | Side-by-side image panes | Five similarity metrics with color coding |

---

## Installation

### Prerequisites

- Node.js 18+
- Chrome 110+ (or any Chromium-based browser)

### Build from source

```bash
git clone https://github.com/your-org/image-compare.git
cd image-compare
npm install
npm run build        # outputs to dist/
```

To generate placeholder icons (only needed once):

```bash
npm run gen-icons
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder

The extension icon appears in the toolbar. On first install it sets default settings automatically.

### Development (watch mode)

```bash
npm run dev     # rebuilds on every file change
```

After each rebuild, click the **↺ reload** button on the extension card in `chrome://extensions`.

---

## Usage

### Opening the carousel

Click any image in a GitHub issue or pull request body / comment. An overlay opens showing:

- a **thumbnail strip** at the top with all images detected on the page
- the **clicked image** enlarged in the main area
- image index and filename in the header

### Navigating

| Action | Description |
|--------|-------------|
| `←` / `→` keys | Previous / next image |
| Click thumbnail | Jump directly to that image |
| `Esc` | Close the overlay |
| Click backdrop | Close the overlay |

### Comparing two images

1. Click **비교 모드** (Compare mode) in the carousel header to enter selection mode
2. Click two thumbnails — they are marked **#1** and **#2**
3. Click **비교하기 →** to open the comparison view

In the comparison view:

- Images are shown side by side
- Five similarity metrics are calculated automatically (~1 second)
- Click **차이 히트맵 보기** (Show diff heatmap) to render a pixel-difference visualization
  - Blue = similar, Red = different

### Popup settings

Click the extension icon in the toolbar to open the settings popup:

| Setting | Description |
|---------|-------------|
| **확장 활성화** | Enable / disable the extension globally |
| **GitHub Enterprise 도메인** | Optional: restrict activation to a specific GHE domain |

---

## How metrics are computed

All computation runs in-browser using the Canvas API — no images are sent to any external server.

Both images are normalized to **256 × 256** pixels before computing MSE, PSNR, SSIM, and Histogram Correlation. For pHash, images are reduced to **32 × 32** before applying a 2D DCT.

**SSIM** is computed as the average over non-overlapping **8 × 8** windows using the luminance channel.

**pHash** uses a full 2D DCT on the 32 × 32 grayscale image, takes the top-left 8 × 8 coefficients (64 bits), and measures Hamming distance between the two hashes.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 + `@crxjs/vite-plugin` |
| Styling | Tailwind CSS 3 (injected into Shadow DOM) |
| State management | Zustand 4 |
| Image processing | Canvas API (browser-native) |
| Extension manifest | MV3 |

---

## Project structure

```
src/
├── content/
│   ├── index.tsx          # Entry point — mounts React into Shadow DOM
│   ├── App.tsx            # Root component — routes between carousel and comparator
│   └── ImageDetector.ts   # MutationObserver-based image discovery
├── components/
│   ├── Carousel/
│   │   └── Carousel.tsx   # Overlay with thumbnail strip and main image
│   └── Comparator/
│       ├── Comparator.tsx  # Side-by-side view + heatmap
│       └── MetricsPanel.tsx
├── store/
│   └── imageStore.ts      # Zustand store
├── hooks/
│   └── useKeyboard.ts     # Arrow / Esc key handling
├── utils/
│   ├── imageMetrics.ts    # MSE, PSNR, SSIM, pHash, histogram
│   └── githubDetector.ts  # GitHub Enterprise DOM detection
├── popup/
│   └── Popup.tsx          # Settings popup
└── background/
    └── service-worker.ts  # Minimal MV3 service worker
```

---

## License

MIT
