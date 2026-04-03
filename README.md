**ShapeWriter: Found another great Pretext experiment where words could take the exact shape of what they mean.**

ShapeWriter blurs the lines between typing and drawing. It’s a completely freeform experiment: you type a thought, and the canvas instantly conjures your sentences into real-time silhouettes as you go. 

**[🔗 Try it out in your browser here!](https://rohanjhunja.github.io/ShapeWriter/)**

### **What can you do?**
* **Draw With Words**: Type in words like *lightning*, *camera*, *apple*, or *bicycle*—and see your paragraph dynamically fold itself into that very shape! The canvas understands thousands of conversational synonyms. *Storm* becomes a lightning bolt; *rubbish* morphs into a trash can. 
* **Paste a Story**: Grab your favourite lyrics or an interesting wikipedia page and paste it straight in using the clipboard button! The canvas will carefully "type" it out for you organically, morphing the visual over time.

### **How it Works (The Short Version)**
Behind the curtain, there are no predefined images. ShapeWriter scans what you type, matches it against an expansive semantic dictionary, and quietly pulls invisible icons dynamically off the web via the **Lucide** CDN. It then uses **Vanilla JS**, **HTML Canvas**, and the **@chenglou/pretext** text-layout engine to algorithmically trace the edges of those SVG icons—weaving your literal sentences perfectly into the contour at 60 FPS.

No heavy software or massive frontend frameworks. Just a barebones **Vite** architecture and raw Javascript rendering magic!
