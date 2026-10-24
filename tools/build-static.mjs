// Reproducible, dependency-free static bundle for GitHub Pages.
import{cpSync,mkdirSync,rmSync,writeFileSync,statSync,readFileSync}from'node:fs';import{resolve,relative,sep}from'node:path';import{fileURLToPath}from'node:url';import{liveFiles}from'./live-files.mjs';import{createHash}from'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2),at=args.indexOf('--out'),out=resolve(root,at>=0?args[at+1]:'.pages'),rel=relative(root,out);
if(!/^\.pages(?:-[a-z0-9-]+)?$/.test(rel))throw Error('Output must be a generated child folder, not a source directory');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});let bytes=0;const files=liveFiles();
const version=createHash('sha256');for(const name of files.filter(n=>/\.(mjs|js|css|html)$/.test(n)&&!n.startsWith('vendor/')))version.update(readFileSync(resolve(root,'dist',name)));const release=version.digest('hex').slice(0,12);
for(const name of files){cpSync(resolve(root,'dist',name),resolve(out,name),{recursive:true});if(/\.(mjs|js|css|html)$/.test(name)&&!name.startsWith('vendor/')){const path=resolve(out,name),source=readFileSync(path,'utf8');writeFileSync(path,source.replace(/(['"])(\.\/[^'"]+\.(?:mjs|js|css))\1/g,(_,quote,path)=>quote+path+'?v='+release+quote));}bytes+=statSync(resolve(out,name)).size;}
writeFileSync(resolve(out,'.nojekyll'),'');console.log(JSON.stringify({files:files.length+1,bytes,release,output:out}));
