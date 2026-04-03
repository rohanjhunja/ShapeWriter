# ShapeWriter: A Dynamic Typographical Canvas

**What if your words literally took the shape of their meaning?** 

ShapeWriter is an interactive, kinetic typography installation that seamlessly morphs your text into real-time geometric shapes, objects, and silhouettes as you type. It blurs the line between language and visual art.

### Basic Capabilities
- **Semantic Icon Morphing**: Type conversational words (like *lightning*, *camera*, *apple*, or *rubbish*) and watch the entire text canvas algorithmically wrap itself into the physical shape of the object.
- **Intelligent Synonym Matching**: Powered by an extensive dictionary, the canvas understands contexts. Typing related words or short phrases dynamically resolves to root shapes instantly.
- **Mobile-Fluid Interactivity**: Built with a strictly responsive, anti-zoom interaction engine that flawlessly centers your drawing inside the remaining visual screen glass—even while typing on a squashed mobile OS keyboard.
- **Humanized Clipboard Pasting**: Pasting large chunks of text intelligently queues the characters, simulating an elegant human typewriter effect to gracefully morph the structure over time instead of instantaneous jumping.

### Technical Details
Built as a lightweight, zero-dependency visual engine using raw **Vanilla JS / HTML Canvas** bundled by **Vite**. The mathematical core leverages `@chenglou/pretext` for high-performance text-layout wrapping, and dynamically resolves static line-art SVGs asynchronously from **Lucide** via CDN. The system scrapes these remote SVG paths pixel-by-pixel, translating standard vector boundaries into dense, responsive typographical grids running seamlessly at 60 Frames Per Second.

---

### Experience it Live
Dive into the live interactive canvas directly in your browser:
🔗 **[Play with ShapeWriter Here](https://rohanjhunja.github.io/ShapeWriter/)**
