# BlackHole24

An interactive WebGL black hole renderer built with Next.js, React, and TypeScript.

## Features

✨ **Physics-based Rendering**
- Schwarzschild radius (event horizon)
- Photon ring (light ring)
- Accretion disk with animated noise
- Gravitational lensing effects
- Raymarching shader algorithm

🎨 **Interactive**
- Mouse tracking for camera control
- Real-time WebGL rendering
- Responsive canvas sizing

⚡ **Performance**
- WebGL2 with fallback to WebGL
- Canvas 2D fallback for unsupported browsers
- Optimized device pixel ratio handling
- ResizeObserver for responsive design

## Getting Started

### Prerequisites
- Node.js 16+ (or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/manpreet-code1/blackhole24.git
cd blackhole24

# Install dependencies
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the black hole renderer.

### Production Build

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main page component
│   └── globals.css         # Global styles
└── components/
    └── ui/
        ├── black-hole.tsx  # Example black hole component
        └── black-hole-utils/
            └── renderer.ts # WebGL renderer engine
```

## How It Works

### Renderer Architecture

The `renderer.ts` exports a `createRenderer()` function that:

1. **Creates a WebGL context** with high-performance settings
2. **Compiles shader programs** for raymarching
3. **Renders a fullscreen quad** using fragment shaders
4. **Tracks mouse input** for interactive control
5. **Handles resizing** with ResizeObserver
6. **Provides fallbacks** to Canvas 2D or static rendering

### Shader Algorithm

The fragment shader implements:
- **Raymarching** to find the black hole surface
- **Gravitational lensing** using inverse square law physics
- **Accretion disk** rendering with procedural noise (FBM)
- **Photon ring** as a thin bright band around the event horizon
- **Glow effects** for atmospheric rendering

### Component Usage

```tsx
import { Example } from "@/components/ui/black-hole";

export default function Page() {
  return (
    <div className="fixed inset-0 h-screen w-screen bg-black">
      <Example />
    </div>
  );
}
```

## Browser Support

| Browser | Support |
|---------|----------|
| Chrome 90+ | ✅ WebGL2 |
| Firefox 88+ | ✅ WebGL2 |
| Safari 15+ | ✅ WebGL |
| Edge 90+ | ✅ WebGL2 |
| Mobile | ✅ WebGL with fallback |

## Performance Tips

- **Reduce resolution** on low-end devices by adjusting device pixel ratio cap
- **Disable animations** using `prefers-reduced-motion` media query
- **Use canvas 2D fallback** for unsupported WebGL environments

## Technologies

- **[Next.js](https://nextjs.org/)** - React framework
- **[React 18](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **WebGL 2.0** - GPU rendering

## License

MIT

## Author

**manpreet-code1** - [GitHub](https://github.com/manpreet-code1)

---

Made with ❤️ and rendered on the GPU ✨