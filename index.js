import { prepareWithSegments, layoutNextLine } from 'https://esm.sh/@chenglou/pretext'
import * as lucide from 'https://esm.sh/lucide';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let dpr = 1;

let typedText = "type here";

let targetShape = 'Square';
let previousShape = 'Square';
let shapeProgress = 1; 

let lastTime = 0;
let textScale = 1;

let timeSinceLastKey = 0;
let isIdle = false;
let idleShapeTime = 0;
let targetWord = "";

let pasteQueue = [];
let pasteTimer = 0;
let isFocused = false;
let currentCenterY = null;

const curatedObjects = [
    'Anchor', 'Apple', 'Axe', 'Backpack', 'Banana', 'Banknote', 'Bath', 'Bean', 'Bed', 'Beer', 'Bell', 'Bike', 'Bird', 'Bomb', 'Bone', 'Book', 'Bookmark', 'BoomBox', 'Bot', 'Briefcase', 'Brush', 'Bug', 'Building', 'Bus', 'Calculator', 'Calendar', 'Camera', 'Car', 'Carrot', 'Castle', 'Cat', 'Church', 'Cigarette', 'Clipboard', 'Clock', 'Cloud', 'Clover', 'Coffee', 'Coins', 'Compass', 'Croissant', 'Crown', 'CupSoda', 'Database', 'Diamond', 'Dice1', 'Dice2', 'Dice3', 'Dice4', 'Dice5', 'Dice6', 'Dog', 'Droplet', 'Drum', 'Dumbbell', 'Egg', 'Eye', 'Factory', 'Feather', 'Fingerprint', 'Fish', 'Flag', 'Flame', 'FlaskConical', 'Flower', 'Gamepad', 'Gavel', 'Gem', 'Ghost', 'Gift', 'Glasses', 'Globe', 'Grape', 'Guitar', 'Hammer', 'HardHat', 'Headphones', 'Heart', 'Helicopter', 'Home', 'Hospital', 'Hourglass', 'IceCream', 'Key', 'Keyboard', 'Lamp', 'Laptop', 'Leaf', 'Lightbulb', 'Lollipop', 'Magnet', 'Map', 'Martini', 'Medal', 'Microchip', 'Microphone', 'Microscope', 'Monitor', 'Moon', 'Mountain', 'Mouse', 'Mushroom', 'Music', 'Newspaper', 'Nut', 'Package', 'Paintbrush', 'Palette', 'Pen', 'Pencil', 'Piano', 'Pickaxe', 'Pill', 'Pizza', 'Plane', 'Printer', 'Puzzle', 'Rabbit', 'Rocket', 'Ruler', 'Sailboat', 'Sandwich', 'Scissors', 'Shield', 'Ship', 'Shirt', 'Shovel', 'Skull', 'Smartphone', 'Snail', 'Snowflake', 'Sofa', 'Spade', 'Speaker', 'Sprout', 'Star', 'Stethoscope', 'Sun', 'Swords', 'Syringe', 'Tent', 'Telescope', 'Thermometer', 'Ticket', 'Toilet', 'Tornado', 'Train', 'TramFront', 'TreeDeciduous', 'TreePine', 'Trees', 'Trophy', 'Truck', 'Turtle', 'Umbrella', 'Usb', 'Wallet', 'Watch', 'Wind', 'Wine', 'Wrench', 'Zap'
];

let lucideTags = {};
fetch('https://cdn.jsdelivr.net/npm/lucide-static@latest/tags.json')
  .then(res => res.json())
  .then(data => lucideTags = data)
  .catch(err => console.error('Failed to load Lucide synonyms dictionary', err));

function startNextIdleShape() {
    idleShapeTime = 0;
    typedText = '';
    targetWord = curatedObjects[Math.floor(Math.random() * curatedObjects.length)];
    if (typeof hiddenInput !== 'undefined' && hiddenInput) hiddenInput.value = '';
}

const MASK_RESOLUTION = 800;
const offCanvas = document.createElement('canvas');
offCanvas.width = MASK_RESOLUTION;
offCanvas.height = MASK_RESOLUTION;
const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

const shapePixelCache = {};

function loadShapePixels(iconName, callback) {
    if (shapePixelCache[iconName]) {
        if (callback && shapePixelCache[iconName] !== 'loading') callback();
        return;
    }
    shapePixelCache[iconName] = 'loading';
    
    let iconData = lucide.icons[iconName];
    if (!iconData) {
        shapePixelCache[iconName] = null;
        return;
    }
    
    const rawSvg = lucide.createElement(iconData);
    rawSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    rawSvg.setAttribute('width', MASK_RESOLUTION);
    rawSvg.setAttribute('height', MASK_RESOLUTION);
    
    // Lucide icons are natively line-art. Forcing them to fill="black" breaks their negative space (e.g Umbrella/Anchor holes).
    // Instead we remove fill and use a thick stroke mask to trace the literal silhouette of the icon as overlapping text paths!
    rawSvg.querySelectorAll('*').forEach(child => {
         child.setAttribute('fill', 'none');
         child.setAttribute('stroke', 'black');
         // A stroke of 2 in a 24x24 box guarantees sharp detail preservation for icons like Gamepad.
         child.setAttribute('stroke-width', '2');
         child.setAttribute('stroke-linecap', 'round');
         child.setAttribute('stroke-linejoin', 'round');
    });

    const svgString = new XMLSerializer().serializeToString(rawSvg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.onload = () => {
        offCtx.clearRect(0, 0, MASK_RESOLUTION, MASK_RESOLUTION);
        offCtx.drawImage(img, 0, 0, MASK_RESOLUTION, MASK_RESOLUTION);
        
        const imgData = offCtx.getImageData(0,0,MASK_RESOLUTION,MASK_RESOLUTION).data;
        const bounds = [];
        
        for(let y = 0; y < MASK_RESOLUTION; y++) {
            let rowSegments = [];
            let inSegment = false;
            let firstX = 0;
            for(let x = 0; x < MASK_RESOLUTION; x++) {
                const idx = (y * MASK_RESOLUTION + x) * 4;
                const alpha = imgData[idx + 3];
                if (alpha > 10) {
                    if (!inSegment) {
                        inSegment = true;
                        firstX = x;
                    }
                } else {
                    if (inSegment) {
                        inSegment = false;
                        rowSegments.push({
                            w: (x - 1) - firstX + 1,
                            xOffset: ((x - 1) + firstX) / 2 - MASK_RESOLUTION / 2
                        });
                    }
                }
            }
            if (inSegment) {
                rowSegments.push({
                    w: (MASK_RESOLUTION - 1) - firstX + 1,
                    xOffset: ((MASK_RESOLUTION - 1) + firstX) / 2 - MASK_RESOLUTION / 2
                });
            }
            bounds[y] = rowSegments;
        }
        
        shapePixelCache[iconName] = bounds;
        URL.revokeObjectURL(url);
        if (callback && shapePixelCache[iconName] !== 'loading') callback();
    };
    img.src = url;
}

// Default preload
loadShapePixels('Square');

function getShapeParams(shape, y, maxShapeSize) {
    // Preserve core solid math shapes so they don't break as hollow outlines
    if (shape === 'Square' || shape === 'square') {
        if (y < 0 || y > maxShapeSize) return [];
        return [{ w: maxShapeSize, offsetX: 0 }];
    } else if (shape === 'circle' || shape === 'Circle') {
        const r = maxShapeSize / 2;
        if (y < 0 || y > 2 * r) return [];
        const distFromCenter = Math.abs(r - y);
        const halfWidth = Math.sqrt(Math.max(0, r * r - distFromCenter * distFromCenter));
        return [{ w: Math.max(1, 2 * halfWidth), offsetX: 0 }];
    } else if (shape === 'triangle' || shape === 'Triangle') {
        const h = (Math.sqrt(3) / 2) * maxShapeSize;
        if (y < 0 || y > h) return [];
        return [{ w: Math.max(1, (y / h) * maxShapeSize), offsetX: 0 }];
    }

    const defaultParams = [];
    
    if (shapePixelCache[shape] && shapePixelCache[shape] !== 'loading') {
        const boundsRows = shapePixelCache[shape];
        const maskY = Math.max(0, Math.min(MASK_RESOLUTION - 1, Math.round((y / maxShapeSize) * (MASK_RESOLUTION - 1))));
        const segments = boundsRows[maskY];
        if (segments && segments.length > 0) {
            return segments.map(row => ({
                w: (row.w / MASK_RESOLUTION) * maxShapeSize,
                offsetX: (row.xOffset / MASK_RESOLUTION) * maxShapeSize
            }));
        }
    }
    return defaultParams;
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
}

window.addEventListener('resize', resize);

const hiddenInput = document.createElement('input');
hiddenInput.type = 'text';
hiddenInput.style.position = 'absolute';
hiddenInput.style.top = '25%'; // Positions it to scroll organically
hiddenInput.style.left = '50%';
hiddenInput.style.opacity = 0;
hiddenInput.style.pointerEvents = 'none';
hiddenInput.style.zIndex = -1;
hiddenInput.autocomplete = 'off';
hiddenInput.autocorrect = 'off';
hiddenInput.autocapitalize = 'off';
hiddenInput.spellcheck = false;
document.body.appendChild(hiddenInput);

window.addEventListener('click', () => hiddenInput.focus());
window.addEventListener('touchstart', () => hiddenInput.focus());
document.addEventListener('keydown', () => {
    if (document.activeElement !== hiddenInput) {
        hiddenInput.focus();
    }
});

hiddenInput.addEventListener('focus', () => isFocused = true);
hiddenInput.addEventListener('blur', () => isFocused = false);

window.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteText = (e.clipboardData || window.clipboardData).getData('text');
    if (pasteText) {
        const normalized = pasteText.replace(/[\r\n]+/g, ' ');
        pasteQueue.push(...normalized.split(''));
    }
});

hiddenInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteText = (e.clipboardData || window.clipboardData).getData('text');
    if (pasteText) {
        const normalized = pasteText.replace(/[\r\n]+/g, ' ');
        pasteQueue.push(...normalized.split(''));
    }
});

// Setup physical paste button listener bridging to Clipboard API
const pasteBtn = document.querySelector('.paste-btn');
if (pasteBtn) {
    pasteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Avoid overlapping clicks grabbing hiddenInput focus
        try {
            const clipboardText = await navigator.clipboard.readText();
            if (clipboardText) {
                const normalized = clipboardText.replace(/[\r\n]+/g, ' ');
                pasteQueue.push(...normalized.split(''));
                
                // Return focus to hidden element quietly!
                hiddenInput.focus();
            }
        } catch (err) {
            console.error('Failed to read from clipboard. Allow clipboard permissions.', err);
        }
    });
}

function getLatestWord() {
    const words = typedText.split(' ');
    for (let i = words.length - 1; i >= 0; i--) {
        if (words[i].trim().length > 0) {
            return words[i].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        }
    }
    return '';
}

function findMatch(query) {
    let possibleMatch = Object.keys(lucide.icons).find(k => k.toLowerCase() === query);
    if (!possibleMatch) {
        for (const [kebabName, tags] of Object.entries(lucideTags)) {
            if (tags.some(tag => tag.toLowerCase() === query)) {
                const pascalName = kebabName.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
                if (lucide.icons[pascalName]) {
                    return pascalName;
                }
            }
        }
    }
    return possibleMatch;
}

function updateShapeTarget(text) {
    const lastWordFull = getLatestWord();
    if (!lastWordFull) return;

    let possibleMatch = null;
    let matchedSubword = lastWordFull;

    for (let j = 0; j < lastWordFull.length; j++) {
        const subWord = lastWordFull.slice(j);
        
        if (subWord.length < 3 || ['the', 'and'].includes(subWord)) {
            continue;
        }

        possibleMatch = findMatch(subWord);
        if (possibleMatch) {
            matchedSubword = subWord;
            break;
        }
    }

    let newTarget = targetShape;

    if (possibleMatch) {
      if (!shapePixelCache[possibleMatch] || shapePixelCache[possibleMatch] === 'loading') {
          loadShapePixels(possibleMatch, () => {
              if (targetShape !== possibleMatch) {
                  previousShape = targetShape;
                  targetShape = possibleMatch;
                  shapeProgress = 0;
                  typedText = matchedSubword; 
                  hiddenInput.value = typedText;
              }
          });
      } else if (shapePixelCache[possibleMatch] && shapePixelCache[possibleMatch] !== 'loading') {
          newTarget = possibleMatch;
          if (newTarget !== targetShape) {
              typedText = matchedSubword; 
              hiddenInput.value = typedText;
          }
      }
    }

    if (matchedSubword === 'square' || matchedSubword === 'circle' || matchedSubword === 'triangle') {
        const mathMatch = matchedSubword.charAt(0).toUpperCase() + matchedSubword.slice(1);
        if (targetShape !== mathMatch) {
             newTarget = mathMatch;
             typedText = matchedSubword; 
             hiddenInput.value = typedText;
        }
    }

    // Sticky targets: we never revert to baseline Square unless explicitly driven by double space
    if (newTarget !== targetShape && newTarget !== 'loading') {
        previousShape = targetShape; 
        targetShape = newTarget;
        shapeProgress = 0;
    }
}

hiddenInput.addEventListener('input', (e) => {
  timeSinceLastKey = 0;
  if (isIdle) {
      isIdle = false;
      targetShape = 'Square';
      shapeProgress = 0;
      // Do NOT clear hiddenInput.value or return early here! We want to immediately evaluate this very first keystroke!
  }
  
  if (hiddenInput.value.endsWith('  ')) {
      typedText = '';
      hiddenInput.value = '';
      targetShape = 'Square';
      shapeProgress = 0;
      return;
  }
  
  typedText = hiddenInput.value;
  textScale = 1.01;
  
  updateShapeTarget(typedText);
});

function render(time) {
  requestAnimationFrame(render);
  
  if (!lastTime) lastTime = time;
  const delta = time - lastTime;
  lastTime = time;
  
  timeSinceLastKey += delta;

  if (!isIdle && timeSinceLastKey > 10000) {
      isIdle = true;
      startNextIdleShape();
  }

  if (isIdle) {
      idleShapeTime += delta;
      
      if (targetWord && typedText.length < targetWord.length) {
          const desiredLength = Math.floor(idleShapeTime / 200); 
          if (desiredLength > typedText.length && desiredLength <= targetWord.length) {
              typedText = targetWord.substring(0, desiredLength);
              textScale = 1.01;
              
              if (typedText === targetWord) {
                   if (!shapePixelCache[targetWord] || shapePixelCache[targetWord] === 'loading') {
                        loadShapePixels(targetWord, () => {
                            if (isIdle && targetWord === typedText && targetShape !== targetWord) {
                                previousShape = targetShape;
                                targetShape = targetWord;
                                shapeProgress = 0;
                            }
                        });
                   } else if (targetShape !== targetWord) {
                        previousShape = targetShape;
                        targetShape = targetWord;
                        shapeProgress = 0;
                   }
              }
          }
      }
      
      if (idleShapeTime > 5000) {
          startNextIdleShape();
      }
  }
  
  if (pasteQueue.length > 0) {
      pasteTimer += delta;
      if (pasteTimer > 50) { 
          pasteTimer = 0;
          const char = pasteQueue.shift();
          hiddenInput.value += char;
          hiddenInput.dispatchEvent(new Event('input')); 
      }
  }
  
  if (shapeProgress < 1) {
      shapeProgress += delta / 600; 
      if (shapeProgress > 1) shapeProgress = 1;
  }

  if (textScale > 1) {
      textScale -= delta / 300; 
      if (textScale < 1) textScale = 1;
  }

  ctx.clearRect(0, 0, width, height);

  const displayString = typedText || " ";
  const sourceText = Array(200).fill(displayString).join('');

  const font = '400 16px "Courier Prime", "Courier New", monospace';
  ctx.font = font;

  // Max dimension bounds 
  const maxShapeSize = Math.min(width, height) * 0.7; 
  
  const targetCenterY = height / 2; 
  
  if (currentCenterY === null) currentCenterY = height / 2;
  currentCenterY += (targetCenterY - currentCenterY) * delta * 0.005;
  
  const centerY = currentCenterY;
  const centerX = width / 2;

  const p = shapeProgress < 0.5 ? 2 * shapeProgress * shapeProgress : 1 - Math.pow(-2 * shapeProgress + 2, 2) / 2;
  
  const shapeTop = centerY - maxShapeSize / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(textScale, textScale);
  ctx.translate(-centerX, -centerY);
  
  ctx.fillStyle = '#f4f4f0'; // stark white ink on dark bg
  ctx.textBaseline = 'top';
  
  const prepared = prepareWithSegments(sourceText, font);
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let currentY = 0; 
  
  while (currentY <= maxShapeSize) {
       const prevParams = getShapeParams(previousShape, currentY, maxShapeSize);
       const targetParams = getShapeParams(targetShape, currentY, maxShapeSize);
       
       const maxSegments = Math.max(prevParams.length, targetParams.length);
       
       for (let i = 0; i < maxSegments; i++) {
           const prevS = prevParams[i] || { w: 0, offsetX: 0 };
           const targS = targetParams[i] || { w: 0, offsetX: 0 };
           
           const interpolatedWidth = prevS.w * (1 - p) + targS.w * p;
           const interpolatedOffset = prevS.offsetX * (1 - p) + targS.offsetX * p;
           
           if (interpolatedWidth <= 5) {
               // Skipping rendering anything smaller than 5px entirely cleans up artifacts/lines!
               continue; 
           }

           const line = layoutNextLine(prepared, cursor, interpolatedWidth);
           if (!line) break;
           
           const x = centerX + interpolatedOffset - (line.width / 2); 
           ctx.fillText(line.text, x, shapeTop + currentY);
           
           cursor = line.end;
       }
       currentY += 24; // 16px font with 4px tight leading
  }
  
  ctx.restore();
}

document.fonts.ready.then(() => {
  resize();
  requestAnimationFrame(render);
});
