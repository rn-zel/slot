// src/main.ts
import { Application, Assets, Texture } from "pixi.js";
import { SlotMachine } from "./SlotMachine";
import { ASSETS } from "./Config";
import { Starfield } from './Starfield'; 


(async () => {
  try {
    const app = new Application();
    await app.init({ 
        // background: 0x000000, 
        resizeTo: window, 
        resolution: window.devicePixelRatio, 
        autoDensity: true 
    });
    document.body.appendChild(app.canvas);

    //  Load standard assets
    await Assets.load([...ASSETS.TEXTURES, ...ASSETS.UI, ...ASSETS.VIDEOS]);
    
   
    // INITIALIZE STARFIELD 
   
    const starBackground = new Starfield(app);
    
   
    app.stage.addChild(starBackground.container);
    
    await starBackground.init();

    
    const slotTextures = ASSETS.TEXTURES.map(url => Texture.from(url));
    const bgTexture = Texture.from("reelsbg.png");
    
  
    (window as any).slotMachine = new SlotMachine(app, slotTextures, bgTexture);
    
  } catch (error) { 
      console.error("Error starting game:", error); 
  }
})();