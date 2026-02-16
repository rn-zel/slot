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

// Card tier system
const CARD_TIERS = {
  LOW: "LOW",
  HIGH: "HIGH",
  WILD: "WILD",      
  SCATTER: "SCATTER" 
} as const;

type CardTier = typeof CARD_TIERS[keyof typeof CARD_TIERS];

class CardReel {
  container: Container;
  cardBackground!: Graphics;
  symbols: Sprite[] = [];
  position: number = 0;
  previousPosition: number = 0;
  blur: BlurFilter = new BlurFilter();
  symbolsPerReel: number;
  slotTextures: Texture[];
  symbolSize: number;
  symbolSpacing: number;
  cardWidth: number;
  cardHeight: number;
  maskGraphics!: Graphics;
  symbolContainer!: Container;

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

    this.createCardBackground();
    this.createMask();
    this.initSymbols();
  }

  private createCardBackground() {
    this.cardBackground = new Graphics();
    
    this.cardBackground.beginFill(0x0a0f1e);
    this.cardBackground.drawRoundedRect(0, 0, this.cardWidth, this.cardHeight, 15);
    this.cardBackground.endFill();

    this.cardBackground.lineStyle(2, 0x3a4f6f, 1);
    this.cardBackground.drawRoundedRect(0, 0, this.cardWidth, this.cardHeight, 15);

    this.container.addChild(this.cardBackground);
  }

  private createMask() {
    this.maskGraphics = new Graphics();
    this.maskGraphics.beginFill(0xffffff);
    this.maskGraphics.drawRoundedRect(3, 3, this.cardWidth - 6, this.cardHeight - 6, 40);
    this.maskGraphics.endFill();
    this.container.addChild(this.maskGraphics);
  }

  private initSymbols() {
    this.symbolContainer = new Container();
    
    const totalSymbols = 3; 
    
    for (let j = 0; j < totalSymbols; j++) {
      const texture = this.randomTexture();
      const symbol = new Sprite(texture);
      
      const yPosition = j * (this.symbolSize + this.symbolSpacing) + 5;
      symbol.y = yPosition;
      
      const scale = Math.min(this.symbolSize / symbol.width, this.symbolSize / symbol.height);
      symbol.scale.set(scale);
      symbol.x = Math.round((this.cardWidth - symbol.width) / 2);
      
      this.symbols.push(symbol);
      this.symbolContainer.addChild(symbol);
    }
    
    this.symbolContainer.mask = this.maskGraphics;
    this.container.addChild(this.symbolContainer);
  }

  randomTexture(): Texture {
    return this.slotTextures[Math.floor(Math.random() * this.slotTextures.length)];
  }

  updateSymbols() {
    const symbolHeight = this.symbolSize + this.symbolSpacing;
    
    this.symbols.forEach((s, j) => {
      const prevY = s.y;
      const newY = ((this.position + j) % this.symbols.length) * symbolHeight + 5;
      s.y = newY;
      
      if (newY < prevY - symbolHeight * 2) {
        s.texture = this.randomTexture();
        const scale = Math.min(this.symbolSize / s.texture.width, this.symbolSize / s.texture.height);
        s.scale.set(scale);
        s.x = Math.round((this.cardWidth - s.width) / 2);
      }
    });
  }

  getSymbolAtRow(row: number): Sprite {
    // Fix: Ensure we always return a valid symbol
    const index = row % this.symbols.length;
    return this.symbols[index];
  }

  getSymbolTexture(row: number): Texture {
    return this.getSymbolAtRow(row).texture;
  }
}

class SlotMachine {
  app: Application;
  reels: CardReel[] = [];
  reelContainer: Container = new Container();
  topUI: Container = new Container();
  bottomUI: Container = new Container();
  spinButton!: Sprite;
  menuButton!: Sprite;
  autoSpinButton!: Sprite;
  winText!: Text;
  balanceText!: Text;
  betAmountText!: Text;
  bonusSpinsText!: Text;
  tweening: any[] = [];
  running: boolean = false;
  
  REEL_COUNT: number = 5;
  SYMBOLS_PER_REEL: number = 3;
  SYMBOL_SIZE: number = 120;
  SYMBOL_SPACING: number = 5;
  CARD_WIDTH: number = 130;
  CARD_HEIGHT: number = 400;
  CARD_SPACING: number = 7;
  
  slotTextures: Texture[];
  paylines: number[][];
  
  balance: number = 100000;
  betAmount: number = 50;
  betOptions: number[] = [10, 50, 100];
  bonusSpins: number = 0;


  private readonly WILD_INDEX = 8;
  private readonly SCATTER_INDEX = 9;

  private readonly PAYOUTS: Record<string, Record<number, number>> = {
    [CARD_TIERS.LOW]: { 3: 5, 4: 10, 5: 25 },
    [CARD_TIERS.HIGH]: { 3: 10, 4: 25, 5: 50 }
  };

  constructor(app: Application, textures: Texture[]) {
    console.log("Initializing Slot Machine...");
    
    this.app = app;
    this.slotTextures = textures;

    this.paylines = [
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
    ];

    this.app.stage.addChild(this.reelContainer);
    this.app.stage.addChild(this.topUI);
    this.app.stage.addChild(this.bottomUI);
    
    this.createReels();
    this.createTopUI();
    this.createBottomUI();
    this.layoutUI();
    
    window.addEventListener("resize", () => this.layoutUI());
    this.app.ticker.add(() => this.update());
    
    console.log("Slot Machine Ready!");
    console.log("Card 9 = WILD (substitutes any symbol)");
    console.log("Card 10 = SCATTER (triggers bonus spins)");
  }

  private createReels() {
    for (let i = 0; i < this.REEL_COUNT; i++) {
      const rc = new Container();
      rc.x = i * (this.CARD_WIDTH + this.CARD_SPACING);
      this.reelContainer.addChild(rc);
      
      const reel = new CardReel(
        rc,
        this.slotTextures,
        this.SYMBOLS_PER_REEL,
        this.SYMBOL_SIZE,
        this.SYMBOL_SPACING,
        this.CARD_WIDTH,
        this.CARD_HEIGHT
      );
      this.reels.push(reel);
    }
  }

  private createTopUI() {
    const balanceContainer = new Container();
    
    const balanceLabel = new Text("BALANCE", new TextStyle({
      fill: 0x6b8299,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1
    }));
    balanceLabel.anchor.set(0.5, 0);
    balanceLabel.x = -100;
    balanceLabel.y = 0;
    
    this.balanceText = new Text("$100000", new TextStyle({
      fill: 0x00d9ff,
      fontSize: 26,
      fontWeight: "bold"
    }));
    this.balanceText.anchor.set(0.5, 0);
    this.balanceText.x = -100;
    this.balanceText.y = 16;
    
    // Bonus spins display
    const bonusLabel = new Text("BONUS SPINS", new TextStyle({
      fill: 0x6b8299,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1
    }));
    bonusLabel.anchor.set(0.5, 0);
    bonusLabel.x = 100;
    bonusLabel.y = 0;
    
    this.bonusSpinsText = new Text("0", new TextStyle({
      fill: 0xff6b00,
      fontSize: 26,
      fontWeight: "bold"
    }));
    this.bonusSpinsText.anchor.set(0.5, 0);
    this.bonusSpinsText.x = 100;
    this.bonusSpinsText.y = 16;
    
    balanceContainer.addChild(balanceLabel);
    balanceContainer.addChild(this.balanceText);
    balanceContainer.addChild(bonusLabel);
    balanceContainer.addChild(this.bonusSpinsText);
    this.topUI.addChild(balanceContainer);

    this.winText = new Text("", new TextStyle({
      fill: 0xffd700,
      fontSize: 20,
      fontWeight: "bold",
      align: "center",
      dropShadow: {
        color: 0x000000,
        blur: 4,
        distance: 2
      }
    }));
    this.winText.anchor.set(0.5);
    this.winText.y = 60;
    this.topUI.addChild(this.winText);
  }

  private createBottomUI() {
    const chipsContainer = new Container();
    chipsContainer.y = -65;
    
    this.betOptions.forEach((amount, index) => {
      const chip = this.createBetChip(amount, index * 100 - 100);
      chipsContainer.addChild(chip);
    });
    
    this.bottomUI.addChild(chipsContainer);

    const betContainer = new Container();
    betContainer.y = 18;
    
    const betLabel = new Text("SET BET", new TextStyle({
      fill: 0x6b8299,
      fontSize: 9,
      fontWeight: "600",
      letterSpacing: 1
    }));
    betLabel.anchor.set(0.5);
    betLabel.y = -24;
    
    const minusBtn = this.createControlButton("-", -80);
    minusBtn.on("pointerdown", () => this.adjustBet(-10));
    
    const plusBtn = this.createControlButton("+", 80);
    plusBtn.on("pointerdown", () => this.adjustBet(10));
    
    this.betAmountText = new Text("$ 50.00", new TextStyle({
      fill: 0xffffff,
      fontSize: 22,
      fontWeight: "bold"
    }));
    this.betAmountText.anchor.set(0.5);
    
    betContainer.addChild(betLabel);
    betContainer.addChild(minusBtn);
    betContainer.addChild(this.betAmountText);
    betContainer.addChild(plusBtn);
    this.bottomUI.addChild(betContainer);

    this.createImageButtons();
  }

  private createBetChip(amount: number, xOffset: number): Container {
    const chip = new Container();
    chip.x = xOffset;
    chip.interactive = true;
    chip.cursor = "pointer";
    
    const circle = new Graphics();
    const isSelected = amount === this.betAmount;
    
    if (isSelected) {
      const glow = new Graphics();
      glow.beginFill(0x00d9ff, 0.3);
      glow.drawCircle(0, 0, 35);
      glow.endFill();
      glow.filters = [new BlurFilter(8)];
      chip.addChild(glow);
      
      circle.beginFill(0x00d9ff);
    } else {
      circle.beginFill(0x1a2838);
      circle.lineStyle(2, 0x3a4f6f, 1);
    }
    circle.drawCircle(0, 0, 25);
    circle.endFill();
    
    const text = new Text(amount.toString(), new TextStyle({
      fill: isSelected ? 0x0a0f1e : 0xffffff,
      fontSize: 15,
      fontWeight: "bold"
    }));
    text.anchor.set(0.5);
    
    chip.addChild(circle);
    chip.addChild(text);
    
    chip.on("pointerdown", () => {
      this.betAmount = amount;
      this.updateBetDisplay();
    });
    
    return chip;
  }

  private createControlButton(label: string, xOffset: number): Container {
    const btn = new Container();
    btn.x = xOffset;
    btn.interactive = true;
    btn.cursor = "pointer";
    
    const circle = new Graphics();
    circle.beginFill(0x1a2838);
    circle.drawCircle(0, 0, 20);
    circle.endFill();
    circle.lineStyle(2, 0x3a4f6f, 1);
    circle.drawCircle(0, 0, 20);
    
    const text = new Text(label, new TextStyle({
      fill: 0xffffff,
      fontSize: 22,
      fontWeight: "bold"
    }));
    text.anchor.set(0.5);
    
    btn.addChild(circle);
    btn.addChild(text);
    
    return btn;
  }

  private createImageButtons() {
    const buttonContainer = new Container();
    buttonContainer.y = 100;

    this.menuButton = new Sprite(Assets.get("menu.png"));
    this.menuButton.anchor.set(0.5);
    this.menuButton.x = -150;
    this.menuButton.scale.set(0.7);
    this.menuButton.interactive = true;
    this.menuButton.cursor = "pointer";
    this.menuButton.on("pointerdown", () => {
      console.log("Menu clicked");
    });
    
    const menuGlow = new Graphics();
    menuGlow.beginFill(0x3a4f6f, 0.3);
    menuGlow.drawCircle(this.menuButton.x, 0, 38);
    menuGlow.endFill();
    buttonContainer.addChild(menuGlow);
    buttonContainer.addChild(this.menuButton);

    this.spinButton = new Sprite(Assets.get("spinBTN.png"));
    this.spinButton.anchor.set(0.5);
    this.spinButton.x = 0;
    this.spinButton.y = 0;
    this.spinButton.scale.set(0.08); 
    this.spinButton.interactive = true;
    this.spinButton.cursor = "pointer";
    this.spinButton.on("pointerdown", () => this.startSpin());
    
    const spinGlow = new Graphics();
    spinGlow.beginFill(0x00d9ff, 0.4);
    spinGlow.drawCircle(0, 0, 52);
    spinGlow.endFill();
    spinGlow.filters = [new BlurFilter(15)];
    buttonContainer.addChild(spinGlow);
    buttonContainer.addChild(this.spinButton);

    this.autoSpinButton = new Sprite(Assets.get("auto.png"));
    this.autoSpinButton.anchor.set(0.5);
    this.autoSpinButton.x = 150;
    this.autoSpinButton.scale.set(0.7);
    this.autoSpinButton.interactive = true;
    this.autoSpinButton.cursor = "pointer";
    this.autoSpinButton.on("pointerdown", () => {
      this.startAutoSpin();
    });
    
    const autoGlow = new Graphics();
    autoGlow.beginFill(0x3a4f6f, 0.3);
    autoGlow.drawCircle(this.autoSpinButton.x, 0, 38);
    autoGlow.endFill();
    buttonContainer.addChild(autoGlow);
    buttonContainer.addChild(this.autoSpinButton);

    this.bottomUI.addChild(buttonContainer);
  }

  private autoSpinActive: boolean = false;
  private autoSpinCount: number = 0;

  private startAutoSpin() {
    if (this.autoSpinActive) {
      this.autoSpinActive = false;
      this.autoSpinCount = 0;
    } else {
      this.autoSpinActive = true;
      this.autoSpinCount = 10;
      this.autoSpinNext();
    }
  }

  private autoSpinNext() {
    if (!this.autoSpinActive || this.autoSpinCount <= 0) {
      this.autoSpinActive = false;
      return;
    }

    if (!this.running && this.balance >= this.betAmount) {
      this.autoSpinCount--;
      this.startSpin();
      
      setTimeout(() => {
        this.autoSpinNext();
      }, 3000);
    }
  }

  private adjustBet(amount: number) {
    this.betAmount = Math.max(10, Math.min(1000000000, this.betAmount + amount));
    this.updateBetDisplay();
  }

  private updateBetDisplay() {
    this.betAmountText.text = `$ ${this.betAmount.toFixed(2)}`;
    
    this.bottomUI.children.forEach(child => {
      if (child instanceof Container && child.y === -65) {
        child.removeChildren();
        this.betOptions.forEach((amount, index) => {
          const chip = this.createBetChip(amount, index * 100 - 100);
          child.addChild(chip);
        });
      }
    });
  }

  layoutUI() {
    const totalReelWidth = this.REEL_COUNT * this.CARD_WIDTH + (this.REEL_COUNT - 1) * this.CARD_SPACING;
    
    this.reelContainer.x = Math.round((this.app.screen.width - totalReelWidth) / 2);
    this.reelContainer.y = Math.round((this.app.screen.height - this.CARD_HEIGHT) / 3.5);
    
    this.topUI.x = this.app.screen.width / 2;
    this.topUI.y = this.reelContainer.y - 85;
    
    this.bottomUI.x = this.app.screen.width / 2;
    this.bottomUI.y = this.reelContainer.y + this.CARD_HEIGHT + 100;
  }

  startSpin() {
    // Check if using bonus spin or regular spin
    const isBonusSpin = this.bonusSpins > 0;
    
    if (this.running) return;
    if (!isBonusSpin && this.balance < this.betAmount) return;
    
    this.running = true;
    
    if (isBonusSpin) {
      this.bonusSpins--;
      this.bonusSpinsText.text = this.bonusSpins.toString();
    } else {
      this.balance -= this.betAmount;
      this.balanceText.text = `$${this.balance}`;
    }
    
    this.spinButton.alpha = 0.6;
    this.winText.text = "";

    this.reels.forEach((r, i) => {
      const target = r.position + 10 + i;
      const time = 2000 + i * 100;
      this.tweenTo(
        r,
        "position",
        target,
        time,
        this.backout(0.5),
        i === this.reels.length - 1 ? () => this.reelsComplete() : undefined
      );
    });
  }

  private getCardTier(textureIndex: number): CardTier {
    if (textureIndex >= 0 && textureIndex <= 4) return CARD_TIERS.LOW;  
    if (textureIndex >= 5 && textureIndex <= 7) return CARD_TIERS.HIGH; 
    if (textureIndex === 7) return CARD_TIERS.WILD;                     
    if (textureIndex === 8) return CARD_TIERS.SCATTER;                  
    return CARD_TIERS.LOW;
  }

  private getTextureIndex(texture: Texture): number {
    return this.slotTextures.indexOf(texture);
  }

  // Check for SCATTER symbols 
  private checkScatterWins(): number {
    let scatterCount = 0;
    
    // Count all scatter symbols across all visible positions
    for (let row = 0; row < 5; row++) {
      for (let reel = 0; reel < this.REEL_COUNT; reel++) {
        const textureIndex = this.getTextureIndex(this.reels[reel].getSymbolTexture(row));
        if (textureIndex === this.SCATTER_INDEX) {
          scatterCount++;
        }
      }
    }
    
    return scatterCount;
  }

  // Check payline wins with WILD substitution
  private checkPaylineWins(): Array<{
    lineIndex: number;
    symbolIndex: number;
    tier: CardTier;
    count: number;
    payout: number;
  }> {
    const wins: Array<{
      lineIndex: number;
      symbolIndex: number;
      tier: CardTier;
      count: number;
      payout: number;
    }> = [];

    this.paylines.forEach((line, lineIndex) => {
      const textureIndices: number[] = [];
      
      // Get texture indices for this payline
      for (let reelIndex = 0; reelIndex < this.REEL_COUNT; reelIndex++) {
        const texture = this.reels[reelIndex].getSymbolTexture(line[reelIndex]);
        textureIndices.push(this.getTextureIndex(texture));
      }
      
      // Find the first non-WILD symbol to determine what we're matching
      let baseSymbolIndex = -1;
      for (let i = 0; i < textureIndices.length; i++) {
        if (textureIndices[i] !== this.WILD_INDEX) {
          baseSymbolIndex = textureIndices[i];
          break;
        }
      }
      
      // If all symbols are WILD, treat first WILD as the base symbol
      if (baseSymbolIndex === -1) {
        baseSymbolIndex = this.WILD_INDEX;
      }
      
      // Count consecutive matches (including WILD substitutes) from left
      let matchCount = 0;
      for (let i = 0; i < textureIndices.length; i++) {
        const currentIndex = textureIndices[i];
        // Match if: same as base symbol OR is WILD (substitutes anything)
        if (currentIndex === baseSymbolIndex || currentIndex === this.WILD_INDEX) {
          matchCount++;
        } else {
          break; // Stop on first non-match
        }
      }
      
      // Check if we have a winning combination (3+)
      if (matchCount >= 3) {
        const tier = this.getCardTier(baseSymbolIndex);
        
        // Only pay out for LOW and HIGH tiers (not WILD/SCATTER as base)
        if (tier === CARD_TIERS.LOW || tier === CARD_TIERS.HIGH) {
          const payoutMultiplier = this.PAYOUTS[tier][matchCount] || 0;
          const payout = payoutMultiplier * this.betAmount;
          
          wins.push({
            lineIndex,
            symbolIndex: baseSymbolIndex,
            tier,
            count: matchCount,
            payout
          });
        }
      }
    });

    return wins;
  }

  private reelsComplete() {
    this.spinButton.alpha = 1;
    this.running = false;

    // Check for SCATTER bonuses first
    const scatterCount = this.checkScatterWins();
    if (scatterCount >= 5) {
      const bonusSpinsAwarded = scatterCount * 1; //  spins per scatter
      this.bonusSpins += bonusSpinsAwarded;
      this.bonusSpinsText.text = this.bonusSpins.toString();
      
      this.winText.text = `SCATTER BONUS!\n${scatterCount} Scatters = ${bonusSpinsAwarded} FREE SPINS!`;
      
      // Highlight all scatter symbols
      this.highlightScatters();
      
      return; 
    }

    // Check regular payline wins
    const wins = this.checkPaylineWins();

    if (wins.length > 0) {
      let totalWin = 0;
      const winDetails: string[] = [];

      wins.forEach((win) => {
        totalWin += win.payout;
        
        const line = this.paylines[win.lineIndex];
        
        // Highlight winning symbols
        for (let i = 0; i < win.count; i++) {
          const s = this.reels[i].getSymbolAtRow(line[i]);
          this.createWinHighlight(i, s);
        }
        
        const lineNames = ['TOP', 'MID', 'BOT'];
        const hasWild = this.checkLineHasWild(line, win.count);
        const wildText = hasWild ? " +WILD" : "";
        winDetails.push(`${lineNames[win.lineIndex]}: ${win.count}x ${win.tier}${wildText}`);
      });

      this.balance += totalWin;
      this.balanceText.text = `$${this.balance}`;

      if (totalWin >= 10000) {
        this.winText.text = `MEGA WIN!\n+$${totalWin}`;
      } else {
        this.winText.text = `WIN +$${totalWin}\n${winDetails.join(' | ')}`;
      }
    } else {
      this.winText.text = "";
    }
  }

  private checkLineHasWild(line: number[], count: number): boolean {
    for (let i = 0; i < count; i++) {
      const textureIndex = this.getTextureIndex(this.reels[i].getSymbolTexture(line[i]));
      if (textureIndex === this.WILD_INDEX) {
        return true;
      }
    }
    return false;
  }

  private highlightScatters() {
    for (let row = 0; row < 3; row++) {
      for (let reel = 0; reel < this.REEL_COUNT; reel++) {
        const textureIndex = this.getTextureIndex(this.reels[reel].getSymbolTexture(row));
        if (textureIndex === this.SCATTER_INDEX) {
          const s = this.reels[reel].getSymbolAtRow(row);
          this.createScatterHighlight(reel, s);
        }
      }
    }
  }

  private createWinHighlight(reelIndex: number, symbol: Sprite) {
    const glowBg = new Graphics();
    glowBg.beginFill(0xffd700, 0.25);
    glowBg.drawRoundedRect(
      this.reels[reelIndex].container.x + symbol.x - 12,
      this.reels[reelIndex].container.y + symbol.y - 12,
      symbol.width + 24,
      symbol.height + 24,
      14
    );
    glowBg.endFill();
    glowBg.filters = [new BlurFilter(12)];
    this.reelContainer.addChild(glowBg);
    
    const highlight = new Graphics();
    highlight.lineStyle(6, 0xffd700, 1);
    highlight.drawRoundedRect(
      this.reels[reelIndex].container.x + symbol.x - 8,
      this.reels[reelIndex].container.y + symbol.y - 8,
      symbol.width + 16,
      symbol.height + 16,
      12
    );
    this.reelContainer.addChild(highlight);
    
    const flash = new Graphics();
    flash.lineStyle(3, 0xffffff, 0.9);
    flash.drawRoundedRect(
      this.reels[reelIndex].container.x + symbol.x - 5,
      this.reels[reelIndex].container.y + symbol.y - 5,
      symbol.width + 10,
      symbol.height + 10,
      10
    );
    this.reelContainer.addChild(flash);
    
    this.animateHighlight(glowBg, highlight, flash);
  }

  private createScatterHighlight(reelIndex: number, symbol: Sprite) {
    const glowBg = new Graphics();
    glowBg.beginFill(0xff6b00, 0.3);
    glowBg.drawRoundedRect(
      this.reels[reelIndex].container.x + symbol.x - 12,
      this.reels[reelIndex].container.y + symbol.y - 12,
      symbol.width + 24,
      symbol.height + 24,
      14
    );
    glowBg.endFill();
    glowBg.filters = [new BlurFilter(15)];
    this.reelContainer.addChild(glowBg);
    
    const highlight = new Graphics();
    highlight.lineStyle(6, 0xff6b00, 1);
    highlight.drawRoundedRect(
      this.reels[reelIndex].container.x + symbol.x - 8,
      this.reels[reelIndex].container.y + symbol.y - 8,
      symbol.width + 16,
      symbol.height + 16,
      12
    );
    this.reelContainer.addChild(highlight);
    
    const flash = new Graphics();
    flash.lineStyle(3, 0xffffff, 0.9);
    flash.drawRoundedRect(
      this.reels[reelIndex].container.x + symbol.x - 5,
      this.reels[reelIndex].container.y + symbol.y - 5,
      symbol.width + 10,
      symbol.height + 10,
      10
    );
    this.reelContainer.addChild(flash);
    
    this.animateHighlight(glowBg, highlight, flash);
  }

  private animateHighlight(glowBg: Graphics, highlight: Graphics, flash: Graphics) {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % 1000) / 1000;
      
      highlight.alpha = 0.8 + Math.sin(progress * Math.PI * 2) * 0.2;
      flash.alpha = 0.4 + Math.sin(progress * Math.PI * 4) * 0.4;
      glowBg.alpha = 0.15 + Math.sin(progress * Math.PI * 2) * 0.1;
      
      if (elapsed < 2500) {
        requestAnimationFrame(animate);
      } else {
        this.reelContainer.removeChild(glowBg);
        this.reelContainer.removeChild(highlight);
        this.reelContainer.removeChild(flash);
      }
    };
    animate();
  }

  private tweenTo(
    object: any,
    property: string,
    target: number,
    time: number,
    easing: (t: number) => number,
    complete?: () => void
  ) {
    this.tweening.push({
      object,
      property,
      propertyBeginValue: object[property],
      target,
      easing,
      time,
      start: Date.now(),
      complete,
    });
  }

  private backout(amount: number) {
    return (t: number) => --t * t * ((amount + 1) * t + amount) + 1;
  }

  private lerp(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
  }

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
    this.reels.forEach((r) => r.updateSymbols());
  }
}

(async () => {
  try {
    const app = new Application();
    await app.init({
      background: 0x0a1128,
      resizeTo: window,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });
    document.body.appendChild(app.canvas);

    const texturesUrls = [
      "/1.png", "/2.png", "/3.png", "/4.png", "/5.png",  
      "/6.png", "/7.png",                        
      "/8.png",                                           
      "/9.png"                                           
    ];
    
    const buttonUrls = [
      "menu.png",
      "spinBTN.png",
      "auto.png"
    ];
    
    await Assets.load([...texturesUrls, ...buttonUrls]);
    
    const slotTextures: Texture[] = texturesUrls.map((url) => Texture.from(url));
    const slotMachine = new SlotMachine(app, slotTextures);
    
    (window as any).slotMachine = slotMachine;
    console.log(" Slot Machine Ready!");
    console.log(" Cards 1-5 = LOW | Cards 6-8 = HIGH");
    console.log("Card 9 = WILD (substitutes any symbol)");
    console.log(" Card 10 = SCATTER (3+ = bonus spins)");
    
  } catch (error) {
    console.error("Error:", error);
  }
})();