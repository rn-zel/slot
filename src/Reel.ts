import { Container, Sprite, Texture, BlurFilter } from "pixi.js";
import { CONFIG } from "./Config";

export class Reel {
  container: Container;
  symbols: Sprite[] = [];
  position: number = 0;
  blur: BlurFilter = new BlurFilter();
  symbolsPerReel: number;
  slotTextures: Texture[];
  symbolSize: number;
  symbolSpacing: number;
  cardWidth: number;
  cardHeight: number;
  symbolContainer: Container;

  constructor(
    container: Container,
    textures: Texture[],
    symbolsPerReel: number,
    symbolSize: number,
    symbolSpacing: number,
    cardWidth: number,
    cardHeight: number
  ) {
    this.container = container;
    this.slotTextures = textures;
    this.symbolsPerReel = symbolsPerReel;
    this.symbolSize = symbolSize;
    this.symbolSpacing = symbolSpacing;
    this.cardWidth = cardWidth;
    this.cardHeight = cardHeight;
    this.symbolContainer = new Container();

    this.initSymbols();
    this.container.addChild(this.symbolContainer);
  }

  private initSymbols() {
    const totalSymbols = 5; 
    
    for (let j = 0; j < totalSymbols; j++) {
      const texture = this.randomTexture();
      const symbol = new Sprite(texture);
      
      const yPosition = (j - 1) * (this.symbolSize + this.symbolSpacing);
      symbol.y = yPosition;
      
      const availableWidth = this.cardWidth - (CONFIG.SYMBOL_MARGIN * 2);
      const scale = Math.min(availableWidth / symbol.width, (this.symbolSize) / symbol.height);
      
      symbol.scale.set(scale);
      symbol.anchor.set(0.5, 0); 
      symbol.x = this.cardWidth / 2; 
      
      (symbol as any).baseScale = scale; 

      this.symbols.push(symbol);
      this.symbolContainer.addChild(symbol);
    }
  }

  randomTexture(): Texture {
    return this.slotTextures[Math.floor(Math.random() * this.slotTextures.length)];
  }

  updateSymbols() {
    const symbolHeight = this.symbolSize + this.symbolSpacing;
    
    this.symbols.forEach((s, j) => {
      const prevY = s.y;
      const relativePos = ((this.position + j) % this.symbols.length);
      const newY = (relativePos - 1) * symbolHeight;
      s.y = newY;
      
      if (newY < prevY && relativePos < 1) {
        s.texture = this.randomTexture();
        const availableWidth = this.cardWidth - (CONFIG.SYMBOL_MARGIN * 2);
        const scale = Math.min(availableWidth / s.texture.width, (this.symbolSize) / s.texture.height);
        s.scale.set(scale);
        (s as any).baseScale = scale; 
      }
    });
  }

  getSymbolAtRow(row: number): Sprite {
    const targetY = row * (this.symbolSize + this.symbolSpacing);
    const found = this.symbols.find(s => Math.abs(s.y - targetY) < 50);
    return found || this.symbols[0];
  }

  getSymbolTexture(row: number): Texture {
    return this.getSymbolAtRow(row).texture;
  }
  
  setBrightness(row: number, brightness: number) {
      const symbol = this.getSymbolAtRow(row);
      const baseScale = (symbol as any).baseScale || 1;

      if (brightness < 1) {
          symbol.tint = 0x555555; 
          symbol.scale.set(baseScale); 
      } else {
          symbol.tint = 0xFFFFFF; 
          if(brightness > 1) {
              symbol.scale.set(baseScale * 1.15); 
          }
      }
  }
  
  resetBrightness() {
      this.symbols.forEach(s => {
          s.tint = 0xFFFFFF;
          const baseScale = (s as any).baseScale || 1;
          s.scale.set(baseScale);
      });
  }
}