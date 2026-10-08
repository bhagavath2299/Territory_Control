// Builds index.html from the parts in src/ (sorted by file name).
//   node build.js                         -> index.html (served by server.js)
//   node build.js --server=none --out=x   -> standalone copy with no server (practice and local replays only)
const fs=require('fs'),path=require('path');
const arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.slice(k.length+3):null};
const dir=path.join(__dirname,'src'),out=arg('out')||path.join(__dirname,'index.html'),server=arg('server');
let s=fs.readdirSync(dir).filter(f=>/\.(js|html)$/.test(f)).sort().map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('');
if(server!==null){const n=s.split("SERVER=''").length-1;if(n!==1)throw new Error("expected exactly one SERVER='' in the source, found "+n);s=s.replace("SERVER=''","SERVER="+JSON.stringify(server))
 // a single file has no neighbours to load the icon or manifest from: embed the icon and drop the manifest link
 const ic='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'icon-192.png')).toString('base64');
 s=s.replace('<link rel="icon" href="icon-192.png">','<link rel="icon" href="'+ic+'">').replace('<link rel="apple-touch-icon" href="icon-192.png">','<link rel="apple-touch-icon" href="'+ic+'">').replace('<link rel="manifest" href="manifest.webmanifest">','')}
fs.writeFileSync(out,s);console.log('built',path.relative(process.cwd(),out),s.length,'bytes')
