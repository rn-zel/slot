import { Application, Assets, Sprite, Container, Ticker } from 'pixi.js';

interface Star {
    sprite: Sprite;
    z: number;
    x: number;
    y: number;
}

export class Starfield {
    
    public app: Application;
    public container: Container;
    private starAmount: number;
    private cameraZ: number;
    private fov: number;
    private baseSpeed: number;
    private speed: number;
    private warpSpeed: number;
    private starStretch: number;
    private starBaseSize: number;
    private stars: Star[];

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();
        
      
        this.starAmount = 1000;
        this.cameraZ = 0;
        this.fov = 20;
        this.baseSpeed = 0.025;
        this.speed = 1;
        this.warpSpeed = 25;
        this.starStretch = 5;
        this.starBaseSize = .3;
        this.stars = [];

        this.update = this.update.bind(this);
    }

    async init() {
        
        const starTexture = await Assets.load('https://pixijs.com/assets/star.png');
        
       const colors = [
        0xA020F0,
        0x030512, 
        0x00D9FF, 
        0x5E2A9B, 
        0xB0C4DE, 
        0xFF8C00,
        0x0096FF,
        0xA5F2F3  
    ];
        for (let i = 0; i < this.starAmount; i++) {
            const star: Star = {
                sprite: new Sprite(starTexture),
                z: 0,
                x: 0,
                y: 0,
            };

            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            star.sprite.tint = randomColor;
            star.sprite.anchor.x = 0.5;
            star.sprite.anchor.y = 0.7;
            this.randomizeStar(star, true);
            
            this.container.addChild(star.sprite);
            this.stars.push(star);
        }

        setInterval(() => {
            this.warpSpeed = this.warpSpeed > 0 ? 0 : 1;
        }, 5000);
        
        this.app.ticker.add(this.update);
    }

   
    randomizeStar(star: Star, initial?: boolean) {
        star.z = initial
            ? Math.random() * 2000
            : this.cameraZ + Math.random() * 1000 + 2000;

        const deg = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50 + 1;

        star.x = Math.cos(deg) * distance;
        star.y = Math.sin(deg) * distance;
    }

    //  (Pixi.js v8 ticker parameter)
    update(time: Ticker) {
        this.speed += (this.warpSpeed - this.speed) / 20;
        this.cameraZ += time.deltaTime * 10 * (this.speed + this.baseSpeed);
        
        for (let i = 0; i < this.starAmount; i++) {
            const star = this.stars[i];

            if (star.z < this.cameraZ) this.randomizeStar(star);

            const z = star.z - this.cameraZ;

            star.sprite.x =
                star.x * (this.fov / z) * this.app.renderer.screen.width +
                this.app.renderer.screen.width / 2;
            star.sprite.y =
                star.y * (this.fov / z) * this.app.renderer.screen.width +
                this.app.renderer.screen.height / 2;

            const dxCenter = star.sprite.x - this.app.renderer.screen.width / 2;
            const dyCenter = star.sprite.y - this.app.renderer.screen.height / 2;
            const distanceCenter = Math.sqrt(
                dxCenter * dxCenter + dyCenter * dyCenter,
            );
            const distanceScale = Math.max(0, (2000 - z) / 2000);

            star.sprite.scale.x = distanceScale * this.starBaseSize;
            star.sprite.scale.y =
                distanceScale * this.starBaseSize +
                (distanceScale * this.speed * this.starStretch * distanceCenter) /
                this.app.renderer.screen.width;
            star.sprite.rotation = Math.atan2(dyCenter, dxCenter) + Math.PI / 2;
        }
    }

    destroy() {
        this.app.ticker.remove(this.update);
        this.container.destroy({ children: true });
    }
}