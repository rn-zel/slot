import {
  Application,
  Assets,
  Container,
  Sprite,
  Texture,
  Text,
  TextStyle,
  BlurFilter,
  Graphics
} from "pixi.js";




// slot Machine Classes

class Reel {
  container: Container;
  symbols: Sprite[] = [];
  position: number = 0;
  previousPosition: number = 0;
  blur: BlurFilter = new BlurFilter();
  symbolsPerReel: number;
  slotTextures: Texture[];
  symbolSize: number;
  symbolSpacing: number;

  constructor(container: Container, textures: Texture[], symbolsPerReel: number, symbolSize: number, symbolSpacing: number) {
    this.container = container;
    this.slotTextures = textures;
    this.symbolsPerReel = symbolsPerReel;
    this.symbolSize = symbolSize;
    this.symbolSpacing = symbolSpacing;

    this.container.filters = [];
    this.initSymbols();
  }

  private initSymbols() {
    for (let j = 0; j < this.symbolsPerReel; j++) {
      const texture = this.randomTexture();
      const symbol = new Sprite(texture);
      symbol.y = j * (this.symbolSize + this.symbolSpacing);
      const scale = Math.min(this.symbolSize / symbol.width, this.symbolSize / symbol.height);
      symbol.scale.set(scale);
      symbol.x = Math.round((this.symbolSize - symbol.width) / 2);
      this.symbols.push(symbol);
      this.container.addChild(symbol);
    }
  }

  randomTexture(): Texture {
    return this.slotTextures[Math.floor(Math.random() * this.slotTextures.length)];
  }

  updateSymbols() {
    this.previousPosition = this.position;
    this.symbols.forEach((s, j) => {
      const prevY = s.y;
      s.y = ((this.position + j) % this.symbols.length) * (this.symbolSize + this.symbolSpacing) - this.symbolSize;
      if (s.y < 0 && prevY > this.symbolSize) {
        s.texture = this.randomTexture();
        const scale = Math.min(this.symbolSize / s.texture.width, this.symbolSize / s.texture.height);
        s.scale.set(scale);
        s.x = Math.round((this.symbolSize - s.width) / 2);
      }
    });
  }

  getMiddleSymbolTexture(): Texture {
    return this.symbols[1].texture;
  }

  getSymbolAtRow(row: number): Sprite {
    return this.symbols[row];
  }
}

class SlotMachine {
  app: Application;
  reels: Reel[] = [];
  reelContainer: Container = new Container();
  bottomUI: Container = new Container();
  spinButton!: Sprite;
  winText!: Text;
  tweening: any[] = [];
  running: boolean = false;
  REEL_COUNT: number;
  SYMBOLS_PER_REEL: number;
  SYMBOL_SIZE: number;
  SYMBOL_SPACING: number;
  slotTextures: Texture[];
  paylines: number[][];

  constructor(app: Application, textures: Texture[], reelCount = 5, symbolsPerReel = 3, symbolSize = 90, symbolSpacing = 10) {
    this.app = app;
    this.slotTextures = textures;
    this.REEL_COUNT = reelCount;
    this.SYMBOLS_PER_REEL = symbolsPerReel;
    this.SYMBOL_SIZE = symbolSize;
    this.SYMBOL_SPACING = symbolSpacing;

   
    this.paylines = [
      
      [0, 0, 0, 0, 0], 
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2], 
     
    ];

    this.app.stage.addChild(this.reelContainer);
    this.app.stage.addChild(this.bottomUI);
    this.createReels();
    this.createUI();
    this.layoutUI();
    window.addEventListener("resize", () => this.layoutUI());
    this.app.ticker.add(() => this.update());
  }

  public forceWin(paylineIndex: number, textureIndex = 0) {
  const line = this.paylines[paylineIndex];
  const winningTexture = this.slotTextures[textureIndex];
  line.forEach((rowIndex, reelIndex) => {
    const reel = this.reels[reelIndex];
    reel.symbols[rowIndex].texture = winningTexture;
    const scale = Math.min(reel.symbolSize / winningTexture.width, reel.symbolSize / winningTexture.height);
    reel.symbols[rowIndex].scale.set(scale);
    reel.symbols[rowIndex].x = Math.round((reel.symbolSize - reel.symbols[rowIndex].width) / 2);
  });
  this.reelsComplete();
}


  private createReels() {
    for (let i = 0; i < this.REEL_COUNT; i++) {
      const rc = new Container();
      rc.x = i * (this.SYMBOL_SIZE + this.SYMBOL_SPACING);
      this.reelContainer.addChild(rc);
      const reel = new Reel(rc, this.slotTextures, this.SYMBOLS_PER_REEL, this.SYMBOL_SIZE, this.SYMBOL_SPACING);
      this.reels.push(reel);
    }
  }

  private createUI() {
    this.spinButton = new Sprite(Assets.get("spinBTN.png"));
    this.spinButton.anchor.set(0.5);
    this.spinButton.scale.set(0.8);
    this.spinButton.interactive = true;
    this.spinButton.cursor = "pointer";
    this.bottomUI.addChild(this.spinButton);

    this.winText = new Text("", new TextStyle({ fill: 0xffffff, fontSize: 28, fontWeight: "bold" }));
    this.winText.anchor.set(0.5);
    this.bottomUI.addChild(this.winText);

    this.spinButton.on("pointerdown", () => this.startSpin());
  }

  layoutUI() {
    const REEL_HEIGHT = this.SYMBOLS_PER_REEL * (this.SYMBOL_SIZE + this.SYMBOL_SPACING);
    this.reelContainer.x = Math.round((this.app.screen.width - (this.REEL_COUNT * this.SYMBOL_SIZE + (this.REEL_COUNT - 1) * this.SYMBOL_SPACING)) / 2);
    this.reelContainer.y = Math.round((this.app.screen.height - REEL_HEIGHT) / 2 - 50);

    this.bottomUI.x = this.app.screen.width / 2;
    this.bottomUI.y = this.reelContainer.y + REEL_HEIGHT + 50;
    this.spinButton.y = 0;
    this.winText.y = this.spinButton.height / 2 + 30;
  }

  startSpin() {
    if (this.running) return;
    this.running = true;
    this.spinButton.interactive = false;
    this.spinButton.alpha = 0.5;

    this.reels.forEach((r, i) => {
      const target = r.position + 10 + i;
      const time = 2000 + i * 100;
      this.tweenTo(r, "position", target, time, this.backout(0.5), i === this.reels.length - 1 ? () => this.reelsComplete() : undefined);
    });
  }


private checkConsecutiveAnywhere(): { lineIndex: number, type: "win" | "bonus" | "jackpot", startReel: number, count: number }[] {
  const results: { lineIndex: number, type: "win" | "bonus" | "jackpot", startReel: number, count: number }[] = [];

  this.paylines.forEach((line, lineIndex) => {
    let i = 0;

    while (i < this.reels.length) {
      const firstSymbol = this.reels[i].getSymbolAtRow(line[i]).texture;
      let consecutiveCount = 1;

      for (let j = i + 1; j < this.reels.length; j++) {
        const symbol = this.reels[j].getSymbolAtRow(line[j]).texture;
        if (symbol === firstSymbol) consecutiveCount++;
        else break;
      }

      if (consecutiveCount >= 3) {
        
        let type: "win" | "bonus" | "jackpot" = "win";
        if (consecutiveCount === 4) type = "bonus";
        if (consecutiveCount >= 5) type = "jackpot";

        results.push({ lineIndex, type, startReel: i, count: consecutiveCount });
        i += consecutiveCount; 
      } else {
        i++; 
      }
    }
  });

  return results;
}



private reelsComplete() {
  this.spinButton.interactive = true;
  this.spinButton.alpha = 1;
  this.running = false;

  const winners = this.checkConsecutiveAnywhere();

  if (winners.length > 0) {
    // Determine overall win type based on total pattern count
    let overallType: "win" | "bonus" | "jackpot" = "win";
    if(winners.length === 3) overallType = "win";
    if (winners.length === 4) overallType = "bonus";
    if (winners.length >= 5) overallType = "jackpot";

    // Accumulate messages
    let messages: string[] = [];

    winners.forEach((w) => {
      const line = this.paylines[w.lineIndex];

      messages.push(`Line ${w.lineIndex + 1}: ${w.count} in a row`);

      // Highlight consecutive symbols
      const g = new Graphics();
      g.lineStyle(4, 0xffd700, 1);
      for (let i = 0; i < w.count; i++) {
        const reelIndex = w.startReel + i;
        const s = this.reels[reelIndex].getSymbolAtRow(line[reelIndex]);
        const x = this.reels[reelIndex].container.x + s.x + s.width / 2;
        const y = this.reels[reelIndex].container.y + s.y + s.height / 2;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      this.app.stage.addChild(g);
      setTimeout(() => this.app.stage.removeChild(g), 1000);
    });

    // Add overall win type and multiplier
    if (overallType === "win") {
      messages.push(`\nWIN! ${winners.length}x`);
    } else if (overallType === "bonus") {
      messages.push(`\nBONUS! ${winners.length}x`);
    } else if (overallType === "jackpot") {
      messages.push(`\nJACKPOT! ${winners.length}x`);
    }

    // Show all winning messages
    this.winText.text = messages.join("\n");

  } else {
    this.winText.text = "";
  }
}





  // tween system
  private tweenTo(object: any, property: string, target: number, time: number, easing: (t: number) => number, complete?: () => void) {
    this.tweening.push({ object, property, propertyBeginValue: object[property], target, easing, time, start: Date.now(), complete });
  }

  private backout(amount: number) { return (t: number) => --t * t * ((amount + 1) * t + amount) + 1; }
  private lerp(a: number, b: number, t: number) { return a * (1 - t) + b * t; }

  update() {
    const now = Date.now();
    for (let i = this.tweening.length - 1; i >= 0; i--) {
      const t = this.tweening[i];
      const phase = Math.min(1, (now - t.start) / t.time);
      t.object[t.property] = this.lerp(t.propertyBeginValue, t.target, t.easing(phase));
      if (phase === 1) {
        t.object[t.property] = t.target;
        if (t.complete) t.complete();
        this.tweening.splice(i, 1);
      }
    }
    this.reels.forEach(r => r.updateSymbols());
  }
}


// initialization

(async () => {
  const app = new Application();
  await app.init({
    background: 0x000000,
    resizeTo: window,
    resolution: window.devicePixelRatio,
    autoDensity: true
  });
  document.body.appendChild(app.canvas);

  const texturesUrls = ["/1.png", "/2.png", "/3.png", "/4.png", "/5.png"];
  await Assets.load(texturesUrls);
  const slotTextures: Texture[] = texturesUrls.map(url => Texture.from(url));
  await Assets.load("spinBTN.png");
  const slotMachine = new SlotMachine(app, slotTextures);
  slotMachine.forceWin(1,0); 
 
})(); 