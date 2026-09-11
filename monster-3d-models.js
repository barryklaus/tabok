import { sculptMinor, sculptMajor } from './sculpted-monsters.js?v=20260911VK1';
export const createMinorMonster = sculptMinor;
export const createMajorMonster = sculptMajor;
export const MONSTER_3D = {
  minor:{name:'Minor Monster',title:'Riftback',color:'#d37ec7',create:sculptMinor,camera:[4.5,3.0,6.5],target:[0,1.05,0]},
  major:{name:'Major Monster',title:'The Void Keeper',color:'#ee47ff',create:sculptMajor,camera:[.6,3.3,10.8],target:[0,2.85,0]}
};
export function createMonsterPilot(id){return (MONSTER_3D[id]||MONSTER_3D.minor).create();}
