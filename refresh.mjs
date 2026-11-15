import {mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {fetchSnapshot} from './core.mjs';
const directory=new URL('./data/',import.meta.url);
const target=new URL('./data/nea-snapshot.json',import.meta.url);
const temporary=new URL('./data/nea-snapshot.'+process.pid+'.tmp',import.meta.url);
try{
 const snapshot=await fetchSnapshot();
 await mkdir(directory,{recursive:true});
 await mkdir(new URL('./data/archive/',import.meta.url),{recursive:true});
 const archiveName=snapshot.captured_at.replace(/[:.]/g,'-')+'.json';
 await writeFile(new URL('./data/archive/'+archiveName,import.meta.url),JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});
 await writeFile(temporary,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});
 await rename(temporary,target);
 console.log('Saved a validated NEA snapshot at '+snapshot.captured_at+'. Run node build.mjs to update the globe pack.');
}catch(error){
 await rm(temporary,{force:true});
 console.error('Refresh failed. Previous snapshot retained. '+error.message);
 process.exitCode=1;
}
