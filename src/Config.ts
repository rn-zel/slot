

export const CONFIG = {
    REEL_OFFSET_X: 0,      
    REEL_OFFSET_Y: -30,    
    
    CARD_WIDTH: 290,       
    CARD_HEIGHT: 600,      
    SYMBOL_SIZE: 170,      
    SYMBOL_SPACING: 30,    
    CARD_SPACING: 20,      
    SYMBOL_MARGIN: 20,

    CONSOLE_Y: 390,     
    SPIN_BTN_SIZE: 0.3,

    // UI Buttons
    BTN_SPIN_X: 0,
    BTN_SPIN_Y: 790,
    BTN_AUTO_X: -367,       
    BTN_AUTO_Y: 700,
    BTN_MENU_X: 845,    
    BTN_MINUS_X: -758,
    BTN_MINUS_Y: 395,     
    BTN_PLUS_X: -570,
    BTN_PLUS_Y: 395,     
    
    // Text Positions
    TEXT_TOTALWIN_X: 250,
    TEXT_BET_X: -710,      
    TEXT_BAL_X: 550,      
};

export const PAYOUTS = {

    MACHINE_SCALE: .7,

    CURRENT_BALANCE: 1000,
    BET_AMMOUNT: 100,


    LOW: .5,   
    HIGH: 2, 
    WILD: 10,

    SCATTER_SPINS: 5,
    SCATTER_REQ: 4,
    SCATTER_EXTRA: 3,

    MULTI_4: 3,   
    MULTI_5: 10,  
    JACKPOT: 2000, 

    AUTO_SPIN_LIMIT: Number.POSITIVE_INFINITY,
    AUTO_SPIN_DELAY: 1500,

    FREE_SPIN_COUNT: 0
};

export const PAYLINES = [
    [0,0,0,0,0], 
    [1,1,1,1,1], 
    [2,2,2,2,2], 
    [0,1,2,1,0],
    [2,1,0,1,2],
    // [2,1,2,1,2],
    // [1,2,1,2,1],
    // [0,1,0,1,0],
    // [1,0,1,0,1]
];

// export const REEL_BANDS = [
   
//     [0,0,0,0,1,1,1,2,2,3,3,4,4,5,6,7,8,9,0,1,2], 
    
//     [0,0,0,1,1,1,2,2,3,3,4,4,5,5,6,7,9,0,1,2,3], 
    
//     [0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,9,0,1,2], 
    
//     [0,0,1,1,2,2,3,3,4,4,5,5,6,7,8,9,0,1,2,3,4], 
    
//     [0,0,1,1,2,2,3,4,5,6,7,9,0,1,2,3,4,5,6,7,8]  
// ];

export const ASSETS = {
    TEXTURES: [
        "moon.png", "comet.png", "meteor.png", "ice.png", "const.png", 
        "sun.png", "galaxy.png", "black.png",                  
        "wild.png", "scatter.png"                                
    ],
    UI: [ "reelsbg.png", "menu.png", "spinBTN.png", "auto.png", "plus.png", "minus.png", "1.png"],
    
    VIDEOS: ["galactus.mp4"]

};