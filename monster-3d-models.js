import { sculptMinor, sculptMajor } from './sculpted-monsters.js?v=20260908A1';
export const createMinorMonster = sculptMinor;
export const createMajorMonster = sculptMajor;
export const MONSTER_3D = {
  minor:{name:'Minor Monster',title:'Riftback',color:'#d37ec7',create:sculptMinor,camera:[4.5,3.0,6.5],target:[0,1.05,0]},
  major:{name:'Major Monster',title:'The Ruin Sovereign',color:'#c981ef',create:sculptMajor,camera:[6.5,4.8,9.6],target:[0,2.55,0]}
};
export function createMonsterPilot(id){return (MONSTER_3D[id]||MONSTER_3D.minor).create();}
