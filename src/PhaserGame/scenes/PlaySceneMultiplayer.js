import Phaser from 'phaser';
import {PlayScene} from './PlayScene.js';
import {Player} from "../gameObjects/Player";
import {Rider} from "../gameObjects/Rider";
import { CST } from "../CST";
import {generate} from 'randomstring';
import * as firebase from 'firebase';
import { ConsoleLogger } from '@aws-amplify/core';
import {HUD} from "../gameObjects/HUD";
import {Enemy} from "../gameObjects/Enemy";
import spriteAnimations from '../gameObjects/Animations';
import { Units } from "../gameObjects/Units";

/**
 * PlaySceneMultiplayer - extends Phaser.Scene
 * The main scene where the multiplayer game plays out. Has connetions to the firebase where the multiplayer data synchronizes. 
 */
export class PlaySceneMultiplayer extends PlayScene{ //The difference here is that everything is going to be rendered based on the database 
    
    /**
     * creates the class memebers needed for the multiplayer scene calls the constructor of the playscene
     */
    constructor() {
        super(CST.SCENES.PLAYMULTIPLAYER);

    /**
     * The key is the path in the database and the value is what that path should be in the database.
     * anything inside updates will be updates in the update function and then deleted
     * Updates to the database 60 times a second
     *
     * @name PlaySceneMultiplayer#updates
     * @type object
     */
        this.updates = {};

    /**
     * Object that contains all the player objects for the players
     * key is the ID of the player and the value is the actual player sprite in phaser
     * 
     * @name PlaySceneMultiplayer#otherPlayers
     * @type object
     */
        this.otherPlayers = {};

    /**
     * Scene type. 
     * 
     * @name PlaySceneMultiplayer#sceneType
     * @type string
     */
        this.sceneType = "Multiplayer";

    /**
     * varible which tells if the current user is the creator of the multiplayer game.
     * 
     * @name PlaySceneMultiplayer#isCreator
     * @type boolean
     */
        this.isCreator = false;

    /**
     * if the game is currently going for the actual player
     * 
     * @name PlaySceneMultiplayer#GameIsGoing
     * @type boolean
     */
        this.GameIsGoing = false; 

    /**
     * the seatnumber which corresponds to the position in the game and id associated with the leaderboard
     * 
     * @name PlaySceneMultiplayer#seatNumber
     * @type number
     */
        this.seatNumber = -1;

    /**
     * the number of bots this current user should create in their game
     * 
     * @name PlaySceneMultiplayer#bots
     * @type number
     */
        this.bots = 0;

    /**
     * the array should contain only strings which correspond to paths in the database where a listener is currently active
     * any database listener created should also have the path added to this array
     * when the game ends all the listeners in the array are turned off
     * 
     * @name PlaySceneMultiplayer#databaseListners
     * @type array
     */
        this.databaseListners = [];
        //Checking who is the HostID   

    /**
     * The object that contains all the enemies summons by other players
     * @name PlaySceneMultiplayer#otherenemies
     * @type Object
     */
        this.otherenemies = {};
    
    /**
     * The object that contains all the enemies summons by youself
     * @name PlaySceneMultiplayer#mybuddies
     * @type Object
     */
        this.mybuddies = {};
    
    /**
     * the score in number of the player
     * @name PlaySceneMultiplayer#score
     * @type Number
     */
        this.score = 0;
    }

    init(data){
    /**
     * The id of the player
     *
     * @name Player#playerID
     * @type number
     */
        this.playerID = data.playerID;

    /**
     * The id of the game room
     *
     * @name Player#gameRoom
     * @type number
     */
        this.gameRoom = data.roomkey;

    /**
     * The seatnumber of the player in the game
     *
     * @name Player#seatNumber
     * @type number
     */
        this.seatNumber = data.seatNumber;

    /**
     * The spritekey of the player
     *
     * @name Player#spritekey
     * @type String
     */
        this.spritekey = data.chartype;

    /**
     * The bots in the game
     *
     * @name Player#bots
     * @type number
     */
        this.bots = 0;

    /**
     * The amount of players in the game
     *
     * @name Player#players
     * @type number
     */
        this.players = data.numOfPlayers;
   
    }


    createPlayer = (id,position,velocity) =>{
      
        console.log("CreatingPlayer");
        firebase.database().ref(`Games/${this.gameRoom}/Players/${id}/playerType`).once('value', (snapShot)=>{
            this.temp = snapShot.val();
        })
        console.log(this.temp);
        if(this.temp == "bomber"){
        this.otherPlayers[id] = new Player(this,position.x,position.y, "p1", "p1_01.png",0,500,64,id);
        }
        else if (this.temp == "rider"){
        this.otherPlayers[id] = new Rider(this,position.x,position.y, "rider", "rider_01.png",1,500,200,id).setScale(0.6);
        }
        this.otherPlayers[id].setVelocity(velocity.x,velocity.y);
        if(position.x === 300 && position.y === 300){
            this.pyramid.assignID(id);
         
        }
        else if(position.x === 1000 && position.y === 300){
            this.university.assignID(id);
   
        }
        else if(position.x === 300 && position.y === 1000){
            this.magicstone.assignID(id);

        }
        else this.building.assignID(id);
         
 
        this.enemyPlayers.add(this.otherPlayers[id]);
        //this.otherPlayers[id].immovable=true;
        //assign collider to this new player
        this.physics.add.overlap(this.damageItems, this.otherPlayers[id],this.bothCollisions);
        this.physics.add.collider(this.otherPlayers[id], this.CollisionLayer);
        this.physics.add.collider(this.otherPlayers[id], this.waterLayer);
        this.physics.add.collider(this.otherPlayers[id], this.enemies);
        this.player1.setCollideWorldBounds(true);

        let movementDataDB = `Games/${this.gameRoom}/Players/${id}/movementData`;
        firebase.database().ref(movementDataDB).on("child_changed", (snapShot) => {
            let dataChanged = snapShot.val();
            let changedKey = snapShot.key;

            if(changedKey === 'pos'){
                this.otherPlayers[id].setPosition(dataChanged.x,dataChanged.y); 
            }else{
                this.otherPlayers[id].setVelocity(dataChanged.x,dataChanged.y); 
            }
            
        });

        let attackDB = `Games/${this.gameRoom}/Players/${id}/attack`;
        firebase.database().ref(attackDB).on("child_changed", (snapShot) => {      
            let dataChanged = snapShot.val();  
            let changedKey = snapShot.key;

            if(changedKey === 'pos'){
                this.otherPlayers[id].setPosition(dataChanged.x,dataChanged.y); 
            }else if(changedKey === 'velocity'){
                this.otherPlayers[id].setVelocity(dataChanged.x,dataChanged.y); 
            }
            else{
                this.otherPlayers[id].attack();
            }

        });

        let inGameDB = `Games/${this.gameRoom}/Players/${id}/inGame`;
        firebase.database().ref(inGameDB).on("value", (snapShot) => { 
            if(snapShot.val() === false){
            this.removePlayer(id);
            }

        });

        this.databaseListners.push(movementDataDB,attackDB,inGameDB);
    }

    removePlayer = (id)=>{
        console.log("REMOVING");
        this.otherPlayers[id].kill();
        delete this.otherPlayers[id];
        firebase.database().ref(`Games/${this.gameRoom}/Players/${id}/movementData`).off();
        firebase.database().ref(`Games/${this.gameRoom}/Players/${id}/attack`).off();
        firebase.database().ref(`Games/${this.gameRoom}/Players/${id}/inGame`).off();
    }

    createBotAt = (towerNumber)=>{
        let playerPos = this.startingPosFromTowerNum(towerNumber);
        let bot =  new Player(this,playerPos.x,playerPos.y, "p1", "p1_01.png",0,500,64,"bot" + towerNumber);
        bot.becomeBot();
        this.updateSprite(bot);
    }

    addNewEnemy = (x, y, type, playerid, enemyid) => {

        if(type==='wolf'){              
            this.newenemy =new Enemy(this, x, y, "wolf", "Wolf_01.png",this.player1,0,200,0.1,5,50,99,200,playerid);
        }

        else if(type==='ninjabot'){              
            this.newenemy=new Enemy(this, x, y, "ninjabot", "ninjabot_1.png",this.player1,1,100,0.8,5,180,60,700,playerid)
        }
        
        else if(type==='skull'){              
            this.newenemy=new Enemy(this, x, y, "skull","skull_01",this.player1,3,200,0.8,5,180,60,650,playerid).setScale(0.9);
        }
        else if(type==='demon1'){              
            this.newenemy=new Enemy(this, x, y, "demon1","demon1_01",this.player1,2,200,0.7,2,200,70,600, playerid).setScale(1.5);
        }
        else if(type==='wall'){              
            this.newenemy=new Enemy(this, x, y, "wall","wall_01",this.player1,null,100,0,0,0,0,0,playerid).setScale(0.5);
            this.newenemy.body.immovable=true;
            this.newenemy.body.moves=false;
        }

        this.newenemy.assignSelfID(enemyid, this.gameRoom);
        this.otherenemies[enemyid] = this.newenemy;

        this.enemies.add(this.newenemy);

        this.attackableGroup.add(this.newenemy);

        this.physics.add.overlap(this.enemiesAttacks,this.enemyPlayers,this.bothCollisions);

    }

    create() {
        //this.spritekey = "bomber";
        super.create(this.playerID, 'multi');
   
      
        
        this.lastVelocity = {x:0, y:0}; //Save last velocity to keep track of what we sent to the database
        let database = firebase.database();
        let startingPlayerPosition = this.startingPosFromTowerNum(this.seatNumber);

        this.player.setPosition(startingPlayerPosition.x,startingPlayerPosition.y);
        if(this.spritekey == "bomber"){
        this.player1 = new Player(this,startingPlayerPosition.x,startingPlayerPosition.y, "p1", "p1_01.png",0,500,64,this.playerID);
        }
        else if(this.spritekey == "rider"){
        this.player1 = new Rider(this,startingPlayerPosition.x,startingPlayerPosition.y, "rider", "rider_01.png",1,500,200,this.playerID).setScale(0.6);
        }
        this.player1.setSize(29, 29);
        //this.player1.setVisible(false);
        //this.player.setVisible(true);
        this.player1.setVisible(true);
        this.player.setVisible(false);





        if(this.seatNumber === 1) this.pyramid.assignID(this.playerID);
   
        else if(this.seatNumber === 2) this.university.assignID(this.playerID);
     
        else if(this.seatNumber === 3) this.building.assignID(this.playerID);
   
        else this.magicstone.assignID(this.playerID);
     
       let countDownText= this.add.text(this.player.x, this.player.y, 5, { fontFamily: 'Arial', fontSize: 700, color: '#ffffff' });
       countDownText.setOrigin(0.5,0.5); 

       this.cameras.main.startFollow(this.player1);
       this.player.kill();
       this.hUD = new HUD(this, this.player1, this.playerID, this.mode, this.gameRoom);
       this.manabar=this.hUD.manabar;
       //this.player1.immovable=true;
        this.physics.add.collider(this.player1, this.CollisionLayer);
        this.physics.add.collider(this.player1, this.waterLayer);
        this.physics.add.collider(this.player1, this.enemies);

       this.enemyPlayers.add(this.player1);
       //player collide handler with damage item
       this.physics.add.overlap(this.damageItems, this.player1, this.bothCollisions);



       let creatorDB = `Games/${this.gameRoom}/creator`;
       database.ref(creatorDB).once("value", (snapShot) => {
            let value = snapShot.val();
            let uID = value.uid;

            if(uID === this.playerID){ //check if playerCreated the room
                this.isCreator = true;
                this.updates[`Games/${this.gameRoom}/HostID`] = this.playerID;
                let count = 5;
                let updateCountDown = ()=>{
                    
                    if(count > -2){
                        this.updates[`Games/${this.gameRoom}/countDown`] = count;
                        setTimeout(updateCountDown, 1000);
                    }
                    count--;
                };
                updateCountDown();
            }
        });
        
        let countDownDB = `Games/${this.gameRoom}/countDown`;
        database.ref(countDownDB).on('value',(snapShot)=>{
            let countDown = snapShot.val();
            if(countDown > 0){
                countDownText.setText(countDown);
            }
            if(countDown === 0){
                countDownText.setText("Go");
                let poop = this.countDownText;
                let tween = this.tweens.add({
                    targets: countDownText,
                    alpha: 0,
                    ease: 'Power1',
                    duration: 2000
                });
                this.GameIsGoing = true;
            }


        });
        
        let playerIDDB = `Games/${this.gameRoom}/Players/${this.playerID}`;
        database.ref(playerIDDB).set({
            movementData: {
                pos: this.startingPosFromTowerNum(this.seatNumber),
                velocity: {x:0,y:0}
            },
            attack: {
                time:0,
                pos: this.startingPosFromTowerNum(this.seatNumber),
                velocity: {x: 0, y:0}
            },
            inGame: true,     
            playerType: this.spritekey
        });
        
        let seatNumberDB = `Games/${this.gameRoom}/Towers/${this.seatNumber}`;
        database.ref(seatNumberDB).set({ //CreateTowerInDatabase
            HP: 100,
            owner: this.playerID  
        });
        
        let playerDB = `Games/${this.gameRoom}/Players`;
        database.ref(playerDB).on('child_added',(snapShot)=>{
            let id = snapShot.key;

            if(id === this.playerID)
                return;

            let playerData = snapShot.val();
            this.createPlayer(id,playerData.movementData.pos,playerData.movementData.velocity);

        });
       
        let movementDataDB = `Games/${this.gameRoom}/Players/${this.playerID}/movementData`
        database.ref(movementDataDB).on('child_changed', (snapShot) => {        
            let dataChanged = snapShot.val(); //The new data
            let changedKey = snapShot.key; //The key for the data that was changed

            if(changedKey === 'pos'){
                this.player1.setPosition(dataChanged.x,dataChanged.y); 
            }else{
                this.player1.setVelocity(dataChanged.x,dataChanged.y); 
            }
        });
        
        let timeDB = `Games/${this.gameRoom}/Players/${this.playerID}/attack/time`;
        database.ref(timeDB).on("value", (snapShot) => { 
            if (snapShot.val() != 0)       
                this.player1.attack();

        });




        firebase.database().ref(playerDB).on("child_removed", (snapShot) => {
            this.removePlayer(snapShot.key);
        });


        window.addEventListener('beforeunload', (event) => {

            database.ref(`Games/${this.gameRoom}/Players/${this.playerID}`).remove();

        });
        
        //check if otherplayer has placed a new enemy on the map
        let dragdataDB = `Games/${this.gameRoom}/dragdata`;
        firebase.database().ref(dragdataDB).on('child_changed', snapShot=>{
            let newenemyinfo = snapShot.val();

            if( newenemyinfo.x >= 0 && newenemyinfo.y >= 0 && newenemyinfo.ownerid !== this.playerID ){
                this.addNewEnemy( newenemyinfo.x, newenemyinfo.y, newenemyinfo.type, newenemyinfo.ownerid, newenemyinfo.enemyid );
            }
        })

        //check if the enemy dies, if so async to all players and meanwhile getting score
        let enemyDB = `Games/${this.gameRoom}/enemies`;
        firebase.database().ref(enemyDB).on('child_changed', snapShot=>{
            let enemyinfo = snapShot.val();
            let enemyid = snapShot.key;
            
            if( enemyinfo.killerid === this.playerID ){
                this.score += 50;
                console.log(this.score);
            }

            if(!enemyinfo.alive){
                if(this.mybuddies[enemyid]){
                    this.mybuddies[enemyid].kill(false);
                }
                else if(this.otherenemies[enemyid]){
                    this.otherenemies[enemyid].kill(false);
                }
            }
            
            //firebase.database().ref(enemyDB).child(enemyid).remove();
            
        })

        this.databaseListners.push(creatorDB,countDownDB,playerIDDB,seatNumberDB,playerDB,movementDataDB,timeDB,dragdataDB,enemyDB);

    }

    update(time){
        this.hUD.update(time,this.player1,this);
        this.changeEnemyColor(this.player1,time);
        let inputVelocity = {x:0,y:0}; //Velocity based on player input
        let speed = 64;

        if (this.GameIsGoing && this.player1.active) {


            if (this.keyboard.SHIFT.isDown) {
                speed = 192;
            }

            if (this.keyboard.W.isDown) {
                inputVelocity.y = -speed;
            }
            if (this.keyboard.S.isDown) {
                inputVelocity.y = speed;
            }
            if (this.keyboard.A.isDown) {
                inputVelocity.x = -speed;
            }
            if (this.keyboard.D.isDown) {
                inputVelocity.x = speed;
            }

            if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
                let newAttack = {
                    time: Date.now(),
                    pos: { x: Math.round(this.player1.x), y: Math.round(this.player1.y) },
                    velocity: inputVelocity
                };

                this.updates[`Games/${this.gameRoom}/Players/${this.playerID}/attack/`] = newAttack;

            }
            

            if (this.keyboard.W.isUp && this.keyboard.S.isUp) {
                inputVelocity.y = 0;
            }
            if (this.keyboard.A.isUp && this.keyboard.D.isUp) {
                inputVelocity.x = 0;
            }

            if (inputVelocity.x !== this.lastVelocity.x || inputVelocity.y !== this.lastVelocity.y) { //Don't want to update database if we don't have to 
                this.lastVelocity = { ...inputVelocity };
                this.player1.setVelocity(inputVelocity.x, inputVelocity.y);

                this.updates[`Games/${this.gameRoom}/Players/${this.playerID}/movementData/velocity`] = inputVelocity;
                this.updates[`Games/${this.gameRoom}/Players/${this.playerID}/movementData/pos`] = { x: Math.round(this.player1.x), y: Math.round(this.player1.y) };

            }


        }




        if(Object.keys(this.updates).length !== 0){ //If updates contains something then send it to the database. This is for future updates
            firebase.database().ref().update(this.updates);
        }



    }

    wonGame = () => {
        this.GameIsGoing = false;
        let countDownText = this.add.text(this.player1.x, this.player1.y, "You Won", { fontFamily: 'Arial', fontSize: 150, color: '#ffffff' });
        countDownText.setOrigin(0.5, 0.5);
    }



    towerDestroyed = (TowerID)=>{
        this.GameIsGoing = false;
        this.scene.remove(CST.SCENES.PLAYMULTIPLAYER);
        this.updates[`Games/${this.gameRoom}/Players/${this.playerID}/inGame/`] = false;
        this.scene.start(CST.SCENES.GAMEOVER, {
            playerID : this.playerID,
            roomkey : this.gameRoom,
            chartype: this.spritekey,
            score: this.score
        });
        this.databaseListners.forEach((path)=>{
            console.log(path);
            firebase.database().ref(path).off();
        });
    }
}