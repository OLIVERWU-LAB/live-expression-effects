// Ship the live entry and its dependencies, not past QA pages or unused material revisions.
import{readFileSync,readdirSync,statSync}from'node:fs';import{resolve,dirname,relative}from'node:path';import{fileURLToPath}from'node:url';
import{GIFT_ASSETS}from'../dist/reference-bursts.mjs';import{giftAssetPath}from'../dist/gift-shapes.mjs';import{GIFT_RANDOM_MATERIALS}from'../dist/gift-materials.mjs';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
export function liveFiles(){
 const files=new Set(['index.html','style.css','assets/favicon.svg','vision.worker.js','vision-config.js','vision-pack.js','vision-download.js']);
 function visit(rel){if(files.has(rel))return;files.add(rel);const source=readFileSync(resolve(root,rel),'utf8');for(const m of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))visit(relative(root,resolve(root,dirname(rel),m[1])));}
 visit('app.mjs');
 function walk(rel){for(const entry of readdirSync(resolve(root,rel),{withFileTypes:true})){const path=rel+'/'+entry.name;if(entry.isDirectory())walk(path);else files.add(path);}}
 walk('vendor');
 for(const finish of GIFT_RANDOM_MATERIALS)for(const[kind,colors]of Object.entries(GIFT_ASSETS))for(const color of colors)files.add(giftAssetPath(finish,kind,color).replace(/^\.\//,''));
 return [...files].sort().map(path=>{statSync(resolve(root,path));return path;});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(liveFiles()));
