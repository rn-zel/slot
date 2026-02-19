import { Application, Container, Sprite, Texture, Text, TextStyle, Graphics, Assets, ColorMatrixFilter } from "pixi.js";
import { CONFIG, PAYOUTS, PAYLINES } from "./Config";
import { Reel } from "./Reel";
import gsap from "gsap"; 

export class SlotMachine {
  app: Application;
  mainContainer = new Container();
  backgroundContainer = new Container();
  reelContainer = new Container();
  uiContainer = new Container();
  reels: Reel[] = [];
  
  // UI Elements
  characterSprite!: Sprite; // Renamed from videoSprite
  
  spinButton!: Sprite;
  autoSpinButton!: Sprite;
  winText!: Text;
  balanceText!: Text;
  betAmountText!: Text;
  totalWinText!: Text;
  bonusSpinsText!: Text;
  
  running: boolean = false;
  isEditingBet: boolean = false; 
  
  // Game State
  slotTextures: Texture[];
  backgroundTexture: Texture;
  balance: number = PAYOUTS.CURRENT_BALANCE;
  betAmount: number = PAYOUTS.BET_AMMOUNT;
  bonusSpins: number = PAYOUTS.FREE_SPIN_COUNT;
  sessionWins: number = 0;
  autoSpinActive: boolean = false;
  autoSpinCount: number = 0;

  constructor(app: Application, textures: Texture[], bgTexture: Texture) {
    this.app = app;
    this.slotTextures = textures;
    this.backgroundTexture = bgTexture;

    this.app.stage.addChild(this.mainContainer);
    this.mainContainer.addChild(this.backgroundContainer);
    this.mainContainer.addChild(this.reelContainer);
    this.mainContainer.addChild(this.uiContainer);

    this.setupBackground();
    this.createReels();
    this.createUI();
    this.setupBetInput(); 
    
    // Call the new image setup method
    this.setupTopCharacter();

    this.handleResize();

    window.addEventListener("resize", () => this.handleResize());
  }

  private setupBackground() {
    const bg = new Sprite(this.backgroundTexture);
    bg.anchor.set(0.5);
    bg.width = 1920; 
    bg.height = 1080;
    this.backgroundContainer.addChild(bg);
  }

  private createReels() {
    const reelCount = 5;
    const totalWidth = (CONFIG.CARD_WIDTH * reelCount) + (CONFIG.CARD_SPACING * (reelCount - 1));
    this.reelContainer.pivot.x = totalWidth / 2;
    this.reelContainer.pivot.y = CONFIG.CARD_HEIGHT / 2;
    this.reelContainer.x = CONFIG.REEL_OFFSET_X;
    this.reelContainer.y = CONFIG.REEL_OFFSET_Y; 

    // Mask
    const mask = new Graphics();
    mask.beginFill(0xFF0000);
    mask.drawRect(-totalWidth / 2, -CONFIG.CARD_HEIGHT / 2 + CONFIG.REEL_OFFSET_Y, totalWidth, CONFIG.CARD_HEIGHT);
    mask.endFill();
    this.mainContainer.addChild(mask);
    this.reelContainer.mask = mask;

    for (let i = 0; i < reelCount; i++) {
      const rc = new Container();
      rc.x = i * (CONFIG.CARD_WIDTH + CONFIG.CARD_SPACING);
      this.reelContainer.addChild(rc);
      const reel = new Reel(rc, this.slotTextures, 3, CONFIG.SYMBOL_SIZE, CONFIG.SYMBOL_SPACING, CONFIG.CARD_WIDTH, CONFIG.CARD_HEIGHT);
      this.reels.push(reel);
    }
  }

  private createUI() {
    const glowStyle = new TextStyle({
      fill: 0xffffff,
      fontSize: 36, 
      fontWeight: "bold",
      dropShadow: { color: 0x00d9ff, blur: 6, distance: 0, angle: 0 },
      align: "center"
    });

    // Spin Button
    this.spinButton = new Sprite(Assets.get("spinBTN.png"));
    this.spinButton.anchor.set(0.5);
    this.spinButton.scale.set(CONFIG.SPIN_BTN_SIZE); 
    this.spinButton.x = CONFIG.BTN_SPIN_X;
    this.spinButton.y = CONFIG.CONSOLE_Y;
    this.spinButton.interactive = true;
    this.spinButton.cursor = "pointer";
    this.spinButton.on("pointerdown", () => this.startSpin());
    this.uiContainer.addChild(this.spinButton);

    // Auto Spin
    this.autoSpinButton = new Sprite(Assets.get("auto.png"));
    this.autoSpinButton.anchor.set(0.5);
    this.autoSpinButton.scale.set(0.26);
    this.autoSpinButton.x = CONFIG.BTN_AUTO_X;
    this.autoSpinButton.y = CONFIG.BTN_AUTO_Y;
    this.autoSpinButton.interactive = true;
    this.autoSpinButton.cursor = "pointer";
    this.autoSpinButton.on("pointerdown", () => this.startAutoSpin());
    this.uiContainer.addChild(this.autoSpinButton);

    // Menu
    const menuButton = new Sprite(Assets.get("menu.png"));
    menuButton.anchor.set(0.5);
    menuButton.scale.set(0.2);
    menuButton.x = CONFIG.BTN_MENU_X;
    menuButton.y = CONFIG.CONSOLE_Y;
    this.uiContainer.addChild(menuButton);

    // Texts
    this.balanceText = new Text(`₱${this.balance}`, glowStyle);
    this.balanceText.anchor.set(0, 0.5);
    this.balanceText.x = CONFIG.TEXT_BAL_X; 
    this.balanceText.y = CONFIG.CONSOLE_Y + 5;
    this.balanceText.resolution = 2;
    this.uiContainer.addChild(this.balanceText);

    this.betAmountText = new Text(`₱${this.betAmount}`, glowStyle);
    this.betAmountText.anchor.set(0, 0.5);
    this.betAmountText.x = CONFIG.TEXT_BET_X;
    this.betAmountText.y = CONFIG.CONSOLE_Y + 5;
    this.betAmountText.resolution = 2;
    this.betAmountText.interactive = true; 
    this.betAmountText.cursor = "text";
    this.betAmountText.on("pointerdown", () => this.enableBetEditing());
    this.uiContainer.addChild(this.betAmountText);

    this.totalWinText = new Text("₱0", glowStyle);
    this.totalWinText.anchor.set(0, 0.5);
    this.totalWinText.x = CONFIG.TEXT_TOTALWIN_X;
    this.totalWinText.resolution = 2;
    this.totalWinText.y = CONFIG.CONSOLE_Y + 5;
    this.uiContainer.addChild(this.totalWinText);

    // +/- Buttons
    const minus = new Sprite(Assets.get("minus.png"));
    minus.anchor.set(0.5);
    minus.scale.set(0.2);
    minus.x = CONFIG.BTN_MINUS_X;
    minus.y = CONFIG.BTN_MINUS_Y;
    minus.interactive = true;
    minus.cursor = "pointer";
    minus.on("pointerdown", () => this.adjustBet(-10));
    this.uiContainer.addChild(minus);

    const plus = new Sprite(Assets.get("plus.png"));
    plus.anchor.set(0.5);
    plus.scale.set(0.1);
    plus.x = CONFIG.BTN_PLUS_X;
    plus.y = CONFIG.BTN_PLUS_Y;
    plus.interactive = true;
    plus.cursor = "pointer";
    plus.on("pointerdown", () => this.adjustBet(10));
    this.uiContainer.addChild(plus);

    // WinMessage
    this.winText = new Text("", new TextStyle({
        fill: 0xffd700,
        fontSize: 100,
        fontWeight: "bold",
        dropShadow: { color: 0x00000, blur: 15, distance: 0 },
        stroke: { color: 0xF55845, width: 6 },
        align: "center"
    }));

    this.winText.anchor.set(0.5);
    this.winText.x = 0; 
    this.winText.y = 0; 
    this.winText.resolution = 2;
    this.uiContainer.addChild(this.winText);
    
    // Bonusspin
    this.bonusSpinsText = new Text("", new TextStyle({
        fill: 0xff6b00,
        fontSize: 40,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 }
    }));
    this.bonusSpinsText.anchor.set(0.5);
    this.bonusSpinsText.y = -350; 
    this.bonusSpinsText.resolution = 2;
    this.uiContainer.addChild(this.bonusSpinsText);
  }

  //  Betting Logic 
  private updateBetTextDisplay(textToShow: string) {
      this.betAmountText.text = textToShow;
      const cleanNumber = textToShow.replace(/[^0-9]/g, '');
      const len = cleanNumber.length;
      let newSize = 36;
      if (len >= 7) newSize = 20; 
      else if (len >= 5) newSize = 25; 
      this.betAmountText.style.fontSize = newSize;
  }

 //GALACTUS
  private setupTopCharacter() {
    this.characterSprite = new Sprite(Assets.get("1.png"));

   

    const filter = new ColorMatrixFilter();
    this.characterSprite.filters = [filter];
    filter.contrast(1, false); 
    filter.brightness(1, false);
    this.characterSprite.scale.set(1.9)
    this.characterSprite.anchor.set(0.5, 1);
    this.characterSprite.x = 0; 
    this.characterSprite.y = -410;
    
    this.backgroundContainer.addChild(this.characterSprite);

    // gsap.to(this.characterSprite,{
    //     y: -370,
    //     duration: 2.5,
    //     ease: "sine.inOut",
    //     yoyo: true,
    //     repeat: -1
    // })
    gsap.to(this.characterSprite.scale, {
            x: 1.8,               
            y: 1.8,               
            duration: 2.1,        
            ease: "sine.inOut",    
            yoyo: true,            
            repeat: -1
    });
  }

  private setupBetInput() {
    window.addEventListener("keydown", (e) => {
        if (!this.isEditingBet) return;
        if (e.key >= "0" && e.key <= "9") {
            let currentBetStr = this.betAmountText.text.replace("₱", "").replace("|", "");
            if (currentBetStr === "0") currentBetStr = "";
            if (currentBetStr.length < 9) {
                const newBetStr = currentBetStr + e.key;
                this.betAmount = parseInt(newBetStr);
                this.updateBetTextDisplay(`₱${this.betAmount}|`); 
            }
        } 
        else if (e.key === "Backspace") {
            let currentBetStr = this.betAmountText.text.replace("₱", "").replace("|", "");
            currentBetStr = currentBetStr.slice(0, -1);
            if (currentBetStr === "") currentBetStr = "0";
            this.betAmount = parseInt(currentBetStr);
            this.updateBetTextDisplay(`₱${this.betAmount}|`);
        }
        else if (e.key === "Enter" || e.key === "Escape") {
            this.disableBetEditing();
        }
    });

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', (e) => {
        if (this.isEditingBet && e.target !== this.betAmountText) {
             this.disableBetEditing();
        }
    });
  }

  private enableBetEditing() {
      if (this.running) return;
      this.isEditingBet = true;
      this.betAmountText.style.fill = 0x00ff00; 
      this.updateBetTextDisplay(`₱${this.betAmount}|`); 
  }

  private disableBetEditing() {
      this.isEditingBet = false;
      this.betAmountText.style.fill = 0xffffff; 
      this.betAmount = Math.max(10, Math.min(1000000000, this.betAmount));
      this.updateBetTextDisplay(`₱${this.betAmount}`); 
  }

  private adjustBet(amount: number) {
    if (this.isEditingBet) this.disableBetEditing();
    this.betAmount = Math.max(10, Math.min(1000000000, this.betAmount + amount));
    this.updateBetTextDisplay(`₱${this.betAmount}`); 
  } 

  //  Game Loop & Logic 
  handleResize() {
    const DESIGN_WIDTH = 1920;
    const DESIGN_HEIGHT = 1080;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    let scale = Math.min(screenWidth / DESIGN_WIDTH, screenHeight / DESIGN_HEIGHT);
    scale *= .6;
    this.mainContainer.scale.set(scale);
    this.mainContainer.x = screenWidth / 2;
    this.mainContainer.y = screenHeight / 1.55;
  }

  private startAutoSpin() {
    if (this.autoSpinActive) {
      this.autoSpinActive = false;
      this.autoSpinCount = 0;
      this.autoSpinButton.alpha = 1;
    } else {
      this.autoSpinActive = true;
      this.autoSpinCount = PAYOUTS.AUTO_SPIN_LIMIT;
      this.autoSpinButton.alpha = 0.5;
      this.autoSpinNext();
    }
  }

  private autoSpinNext() {
    if (!this.autoSpinActive || this.autoSpinCount <= 0) {
      this.autoSpinActive = false;
      this.autoSpinButton.alpha = 1;
      return;
    }
   if (!this.running && this.balance < this.betAmount && this.bonusSpins === 0) {
       this.autoSpinActive = false;
       this.autoSpinButton.alpha = 1;
       alert("Out of Balance!");
       return;
    }
   if (!this.running){
    this.autoSpinCount--;
    this.startSpin();
   }
  }

  startSpin() {
    if (this.isEditingBet) this.disableBetEditing();
    const isBonusSpin = this.bonusSpins > 0;
    if (this.running) return;
    if (!isBonusSpin && this.balance < this.betAmount) return;
    
    this.reels.forEach(r => {
        r.resetBrightness();
        r.symbols.forEach(s => gsap.killTweensOf(s.scale)); 
    });
    
    this.running = true;
    if (isBonusSpin) {
      this.bonusSpins--;
      this.bonusSpinsText.text = this.bonusSpins > 0 ? `FREE SPINS: ${this.bonusSpins}` : "";
    } else {
      this.balance -= this.betAmount;
      this.balanceText.text = `₱${this.balance}`;
    }
    
    this.spinButton.alpha = 0.6;
    this.winText.text = "";

    // R GSAP
    this.reels.forEach((r, i) => {
      const target = r.position + 20 + i * 2;
      const time = 2.0 + i * 0.2; 
      
      gsap.to(r, {
          position: target,
          duration: time,
          ease: "back.out(0.4)", 
          onUpdate: () => r.updateSymbols(),
          onComplete: i === this.reels.length - 1 ? () => this.reelsComplete() : undefined
      });
    });
  }

  private reelsComplete() {
    this.spinButton.alpha = 1;
    this.running = false;
    
    // 1. SCATTER LOGIC
    const scatterCount = this.countScatters();
    if (scatterCount >= PAYOUTS.SCATTER_REQ) {
        const extraSpins = (scatterCount - PAYOUTS.SCATTER_REQ) * PAYOUTS.SCATTER_EXTRA;
        const totalSpins = PAYOUTS.SCATTER_SPINS + extraSpins;

        this.bonusSpins += totalSpins;
        this.bonusSpinsText.text = `FREE SPINS: ${this.bonusSpins}`;
        
        if (scatterCount > 5){
          this.winText.text = `MEGA BONUS!\n\n${totalSpins} SPINS!`;
          this.winText.style.fontSize = 100;
        } else {
          this.winText.text = `BONUS!\n\n${totalSpins} SPINS!`;
          this.winText.style.fontSize = 80;
        }

        // GSAP TEXT BOUNCE ANIMATION
        this.winText.scale.set(0); 
        gsap.to(this.winText.scale, { x: .1, y: .1, duration: 1, ease: "elastic.out(1, 0.4)" });
    } 

    // 2. WIN LOGIC
    const wins = this.checkPaylineWins(); 
    
    if(wins.length > 0) {
        let totalWin = 0;
        let isJackpot = false;

        this.reels.forEach(r => r.symbols.forEach(s => s.tint = 0x555555));

        wins.forEach(w => {
            totalWin += w.payout;
            if (w.isJackpot) isJackpot = true;
            
             const line = PAYLINES[w.lineIndex];
             for(let i=0; i<w.matchLength; i++) {
                 const realReelIndex = w.startIndex + i;
                 const reel = this.reels[realReelIndex];
                 const row = line[realReelIndex];
                 
                 reel.setBrightness(row, 2); 

                 // GSAP  PULSE ANIMATION
                 const symbolSprite = reel.getSymbolAtRow(row); 
                 if (symbolSprite) {
                     gsap.fromTo(symbolSprite.scale, 
                        { x: .5, y: .5 }, 
                        { x: .6, y: .6, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" }
                     );
                 }
             }
        });

        this.balance += totalWin;
        this.sessionWins += totalWin;
        this.balanceText.text = `₱${this.balance}`;
        this.totalWinText.text = `₱${this.sessionWins}`;
        
        if (scatterCount < 5) {
            if (isJackpot) {
                 this.winText.text = "JACKPOT!!!";
                 this.winText.style.fill = 0xff0000; 
            } else {
                 this.winText.text = `WIN ₱${totalWin}`;
                 this.winText.style.fill = 0xffd700; 
            }
            
            // GSAP TEXT BOUNCE ANIMATION
            this.winText.scale.set(.7); 
            gsap.to(this.winText.scale, { x: 1, y: 1, duration: 0.8, ease: "back.out(1.7)" });
        }
    }

    // 3. AUTO SPIN LOGIC 
    if(this.autoSpinActive){
        setTimeout(() => {
            this.autoSpinNext();
        }, PAYOUTS.AUTO_SPIN_DELAY);
    }
  }

  private getSymbolType(texture: Texture): string {
    const index = this.slotTextures.indexOf(texture);
    if (index >= 0 && index <= 4) return 'LOW'; 
    if (index >= 5 && index <= 7) return 'HIGH'; 
    if (index === 8) return 'WILD'; 
    if (index === 9) return 'SCATTER'; 
    return 'UNKNOWN';
  }

  private countScatters(): number {
    let count = 0;
    for (let r = 0; r < this.reels.length; r++) {
        for (let row = 0; row < 3; row++) {
             const texture = this.reels[r].getSymbolTexture(row);
             if (this.getSymbolType(texture) === 'SCATTER') {
                 count++;
             }
        }
    }
    return count;
  }

  private checkPaylineWins() {
      const wins: any[] = [];
      const WILD_INDEX = 8;     
      const SCATTER_INDEX = 9;  

      PAYLINES.forEach((line, lineIndex) => {
          const symbols = [
              this.slotTextures.indexOf(this.reels[0].getSymbolTexture(line[0])),
              this.slotTextures.indexOf(this.reels[1].getSymbolTexture(line[1])),
              this.slotTextures.indexOf(this.reels[2].getSymbolTexture(line[2])),
              this.slotTextures.indexOf(this.reels[3].getSymbolTexture(line[3])),
              this.slotTextures.indexOf(this.reels[4].getSymbolTexture(line[4]))
          ];

          let bestWinForLine = { payout: 0, isJackpot: false, matchLength: 0, startIndex: 0 };

          for (let start = 0; start <= 2; start++) {
               let targetIndex = symbols[start];
               let matchLength = 1;

               if (targetIndex === WILD_INDEX) {
                   if (start === 0 && 
                       symbols[1] === WILD_INDEX && 
                       symbols[2] === WILD_INDEX && 
                       symbols[3] === WILD_INDEX && 
                       symbols[4] === WILD_INDEX) {
                            wins.push({ lineIndex, payout: this.betAmount * PAYOUTS.JACKPOT, isJackpot: true, matchLength: 5, startIndex: 0 });
                            return; 
                   }
                   
                   for(let k = start + 1; k < 5; k++) {
                       if (symbols[k] !== WILD_INDEX) {
                           targetIndex = symbols[k];
                           break;
                       }
                   }
               }

               if (targetIndex === SCATTER_INDEX) continue; 

               for (let next = start + 1; next < 5; next++) {
                   if (symbols[next] === targetIndex || symbols[next] === WILD_INDEX) {
                       matchLength++;
                   } else {
                       break; 
                   }
               }

               if (matchLength >= 3) {
                   let multiplier = 0;
                   const type = this.getSymbolType(this.slotTextures[targetIndex]);
                   let basePay = (type === 'HIGH') ? PAYOUTS.HIGH : PAYOUTS.LOW;

                   if (matchLength === 3) multiplier = basePay;
                   if (matchLength === 4) multiplier = basePay * PAYOUTS.MULTI_4;
                   if (matchLength === 5) multiplier = basePay * PAYOUTS.MULTI_5;

                   const payout = this.betAmount * multiplier;
                   
                   if (payout > bestWinForLine.payout) {
                       bestWinForLine = { payout, isJackpot: false, matchLength: matchLength, startIndex: start };
                   }
               }
          }

          if (bestWinForLine.payout > 0) {
              wins.push({ 
                  lineIndex, 
                  payout: bestWinForLine.payout, 
                  isJackpot: bestWinForLine.isJackpot,
                  matchLength: bestWinForLine.matchLength,
                  startIndex: bestWinForLine.startIndex 
              });
          }
      });
      return wins;
  }
}