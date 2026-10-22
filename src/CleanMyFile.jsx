import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileSearch, Image as ImageIcon, LockKeyhole, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';

const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
const tags = { 0x010F:'Camera make',0x0110:'Camera model',0x0131:'Software',0x0132:'Date/time',0x013B:'Author',0x8298:'Copyright',0x9003:'Original date/time',0x9004:'Digitized date/time',0x9286:'User comment' };
function readExif(buffer) {
 const v=new DataView(buffer), b=new Uint8Array(buffer), out=[];
 if(b.length<4||b[0]!==255||b[1]!==216)return out;
 let p=2;
 while(p+4<b.length){
  if(b[p]!==255)break; const marker=b[p+1]; if(marker===218||marker===217)break;
  const len=v.getUint16(p+2); if(len<2||p+2+len>b.length)break;
  if(marker===225&&b[p+4]===69&&b[p+5]===120&&b[p+6]===105&&b[p+7]===102){
   const t=p+10,le=v.getUint16(t)===0x4949,u16=o=>v.getUint16(o,le),u32=o=>v.getUint32(o,le);
   if(u16(t+2)!==42)break; const ifd=t+u32(t+4),count=Math.min(u16(ifd),256);
   for(let i=0;i<count;i++){const e=ifd+2+i*12,tag=u16(e),type=u16(e+2),n=u32(e+4);if(!tags[tag]||n>2048)continue;
    const size=({1:1,2:1,3:2,4:4,7:1})[type];if(!size)continue;
    const pos=n*size<=4?e+8:t+u32(e+8);if(pos<t||pos+Math.min(n*size,2048)>b.length)continue;
    let value='';if(type===2||type===7)value=Array.from(b.slice(pos,pos+Math.min(n,200))).map(c=>c>=32&&c<127?String.fromCharCode(c):'').join('').trim();else if(type===3)value=String(u16(pos));else if(type===4)value=String(u32(pos));
    if(value)out.push({name:tags[tag],value});
   } break;
  } p+=2+len;
 } return out;
}
export default function CleanMyFile(){
 const [file,setFile]=useState(null),[details,setDetails]=useState(null),[exif,setExif]=useState([]),[preview,setPreview]=useState(''),[cleanUrl,setCleanUrl]=useState(''),[cleanName,setCleanName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);if(cleanUrl)URL.revokeObjectURL(cleanUrl)},[preview,cleanUrl]);
 async function inspect(f){
  if(!f)return;setFile(f);setError('');setBusy(true);if(preview)URL.revokeObjectURL(preview);if(cleanUrl)URL.revokeObjectURL(cleanUrl);setCleanUrl('');setCleanName('');setExif([]);
  const url=URL.createObjectURL(f);setPreview(url);
  const base={name:f.name,size:f.size,type:f.type||'Unknown / not supplied',modified:f.lastModified?new Date(f.lastModified).toLocaleString():'Not provided',extension:f.name.includes('.')?f.name.split('.').pop().toUpperCase():'None'};
  try{
   let width=null,height=null,metadata=[];
   if(f.type.startsWith('image/')){const bmp=await createImageBitmap(f);width=bmp.width;height=bmp.height;bmp.close();if(f.type==='image/jpeg')metadata=readExif(await f.arrayBuffer())}
   const sig=Array.from(new Uint8Array(await f.slice(0,12).arrayBuffer())).map(n=>n.toString(16).padStart(2,'0')).join(' ').toUpperCase();
   setExif(metadata);setDetails({...base,width,height,image:f.type.startsWith('image/'),signature:sig||'Empty file'});
  }catch(e){setDetails({...base,image:false,width:null,height:null,signature:'Could not read file header'});setError('The browser could not decode this file as an image. Basic file details are shown where available.')}
  finally{setBusy(false)}
 }
 async function cleanImage(){
  if(!file||!details?.image)return;setBusy(true);setError('');
  try{const bmp=await createImageBitmap(file),canvas=document.createElement('canvas');canvas.width=bmp.width;canvas.height=bmp.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is unavailable.');ctx.drawImage(bmp,0,0);bmp.close();
   const mime=file.type==='image/jpeg'?'image/jpeg':'image/png';const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not create cleaned image.')),mime,.92));const url=URL.createObjectURL(blob);if(cleanUrl)URL.revokeObjectURL(cleanUrl);setCleanUrl(url);setCleanName((file.name.replace(/\.[^.]+$/,'')||'image')+'-cleaned.'+(mime==='image/jpeg'?'jpg':'png'));
  }catch(e){setError(e.message||'Could not clean this image.')}finally{setBusy(false)}
 }
 return <div className="clean-shell">
  <header className="clean-top"><a className="clean-back" href="/"><ArrowLeft size={16}/> FreeInfo</a><span className="clean-brand"><span className="clean-brand-icon"><Trash2 size={18}/></span>CleanMyFile</span><span className="clean-private"><LockKeyhole size={14}/> Local processing</span></header>
  <main className="clean-main"><div className="clean-kicker"><span/> FILE PRIVACY TOOL</div><h1>What's inside <em>this file?</em></h1><p className="clean-intro">Inspect file details and image metadata, then create a fresh image copy with embedded metadata stripped out before you share it.</p>
   <label className="clean-drop" htmlFor="clean-file"><UploadCloud size={30}/><strong>{file?file.name:'Choose a file to inspect'}</strong><span>{file?'Choose another file':'Drop a file here or browse from your device'}</span><small>File analysis happens in this browser. This tool does not upload files to a server.</small><input id="clean-file" type="file" onChange={e=>inspect(e.target.files?.[0])}/></label>
   {error&&<div className="clean-error" role="status">{error}</div>}{busy&&<div className="clean-status">Inspecting file…</div>}
   {details&&!busy&&<section className="clean-results"><div className="clean-results-head"><div><div className="clean-kicker">INSPECTION REPORT</div><h2><FileSearch size={22}/> File details</h2></div><span className="clean-chip">{details.image?'Image decoded':'Basic inspection'}</span></div>
    <div className="clean-grid">{[['File name',details.name],['File size',fmtSize(details.size)],['MIME type',details.type],['Extension',details.extension],['Last modified (file picker)',details.modified],['File signature',details.signature],...(details.width?[['Dimensions',details.width+' × '+details.height+' px']]:[]),['Readable EXIF fields',String(exif.length)]].map(([label,value])=><article className="clean-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    {preview&&details.image&&<div className="clean-preview"><img src={preview} alt="Selected image preview"/><div><ImageIcon size={18}/><span>Image preview · {details.width} × {details.height}px</span></div></div>}
    <div className="clean-metadata"><h3><FileSearch size={18}/> Readable EXIF metadata</h3>{exif.length?<ul>{exif.map((x,i)=><li key={x.name+i}><span>{x.name}</span><strong>{x.value}</strong></li>)}</ul>:<p>No supported readable EXIF fields were found. This does not prove the file contains no other metadata.</p>}</div>
    <div className="clean-cleaner"><div className="clean-cleaner-icon"><ShieldCheck size={23}/></div><div className="clean-cleaner-copy"><h3>Remove image metadata</h3><p>Re-encode an image through the browser canvas to create a copy without metadata carried over by the browser. The image encoding or file size may change.</p>{details.image?<button type="button" onClick={cleanImage} disabled={busy}><Trash2 size={16}/> Create cleaned copy</button>:<p className="clean-note">Metadata removal is currently available for images your browser can decode. Other file types are inspected only.</p>}</div></div>
    {cleanUrl&&<div className="clean-success"><CheckCircle2 size={20}/><div><strong>Cleaned copy is ready</strong><p>{cleanName}</p></div><a href={cleanUrl} download={cleanName}><Download size={16}/> Download</a></div>}
   </section>}
   <section className="clean-footnotes"><div><LockKeyhole size={18}/><div><strong>Private by design</strong><p>Files are processed in your browser and are not sent to a FreeInfo server by this tool.</p></div></div><div><ShieldCheck size={18}/><div><strong>Know the limits</strong><p>This version reads basic file details and common JPEG EXIF fields. It does not fully parse every file structure or strip metadata from PDFs and Office documents.</p></div></div></section>
  </main><footer className="clean-footer">FreeInfo · CleanMyFile <span>Inspect before you share.</span></footer>
 </div>;
}
