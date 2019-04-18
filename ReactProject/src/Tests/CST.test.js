import {CST} from '../PhaserGame/CST';

test('All scenes has been declared', ()=>{
    expect(CST.SCENES).toHaveProperty('LOAD','LOAD');
    expect(CST.SCENES).toHaveProperty('MENU','MENU');
    expect(CST.SCENES).toHaveProperty('PLAY','PLAY');
    expect(CST.SCENES).toHaveProperty('PLAYMULTIPLAYER','PLAYMULTIPLAYER');
});