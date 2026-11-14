(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,80483,e=>{"use strict";var t=e.i(43476),r=e.i(22016),a=e.i(71645),i=e.i(18566),n=e.i(46696),o=e.i(22266),l=e.i(63001),s=e.i(85279),d=e.i(81085),c=e.i(46370),m=e.i(37972),u=e.i(94194),h=e.i(55049);function p(e){return!(e.labelsPrinted<1)&&!!e.taggedAt&&(!e.lastPrintedAt||e.taggedAt>=e.lastPrintedAt)}var f=e.i(32474),b=e.i(38286);async function g(e,t,r){var a;let i=await fetch(`/api/barcodes/image?kind=png&fit=tag&value=${encodeURIComponent(t)}&format=${encodeURIComponent(r)}`);if(!i.ok)throw Error("The barcode from the generator could not be drawn.");let n=await (a=URL.createObjectURL(await i.blob()),new Promise((e,t)=>{let r=new Image;r.onload=()=>e(r),r.onerror=()=>t(Error("The barcode image could not be loaded.")),r.src=a})),o=document.createElement("canvas");o.width=150,o.height=300;let l=o.getContext("2d");if(!l)throw Error("The tag could not be drawn.");l.fillStyle="#ffffff",l.fillRect(0,0,150,300),l.imageSmoothingEnabled=!1;let s=150-n.width-8,d=Math.round((300-n.height)/2);l.drawImage(n,s,d);let c=Math.max(20,s-6);l.fillStyle="#000000",l.textAlign="left",l.textBaseline="middle";let m=26;for(;m>8&&(l.font=`${m}px Arial, Helvetica, sans-serif`,!(l.measureText(e).width<=264));)m-=1;return l.save(),l.translate(c/2,18),l.rotate(Math.PI/2),l.fillText(e,0,0),l.restore(),o.toDataURL("image/png").split(",")[1]??""}e.s(["PrintQueue",0,function({data:e,initialIds:x}){let y=(0,i.useRouter)(),[w,j]=(0,a.useState)("all"),[M,C]=(0,a.useState)("all"),[k,N]=(0,a.useState)("all"),[S,v]=(0,a.useState)(!1),[F,T]=(0,a.useState)(e.templates.find(e=>e.isDefault)?.id??e.templates[0]?.id??""),[O,L]=(0,a.useState)(e.presets.find(e=>e.isDefault)?.id??e.presets[0]?.id??""),A=(0,a.useMemo)(()=>e.variations.filter(e=>!e.isArchived&&e.barcodeValue),[e.variations]),[B,$]=(0,a.useState)(()=>{let e=new Set(A.map(e=>e.id));return Object.fromEntries(x.filter(t=>e.has(t)).map(e=>[e,1]))}),[I,R]=(0,a.useState)(!1),[D,P]=(0,a.useState)([]),[E,U]=(0,a.useState)(()=>(0,f.o)()??""),[z,V]=(0,a.useState)(null),Y=[...new Set(A.map(e=>e.material).filter(Boolean))],_=[...new Set(A.map(e=>e.categoryName||"Uncategorized"))].sort((e,t)=>e.localeCompare(t)),G=(0,a.useMemo)(()=>A.filter(e=>("all"===w||(e.categoryName||"Uncategorized")===w)&&("all"===M||e.material===M)&&(!S||!(e.labelsPrinted>0)||!!e.needsReprint)),[w,M,A,S]),H=G.map(e=>{var t;return{variationId:e.id,quantity:(t=e.id,e.stock,B[t]??0)}}).filter(e=>e.quantity>0),q=H.reduce((e,t)=>e+t.quantity,0),K=e.jobs.find(e=>"printed"===e.status)??e.jobs[0],X=new Map(K?.items.map(e=>[e.variationId,e.quantity])??[]),W=new Set(e.jobs.flatMap(e=>e.items.map(e=>e.variationId))),Q=A.filter(e=>!!W.has(e.id)&&!(e.labelsPrinted<1)&&(!p(e)||X.has(e.id))),J=Q.filter(e=>!p(e)),Z=e.templates.find(e=>e.id===F),ee=e.presets.find(e=>e.id===O);async function et(e,t){if(e.length&&!I){R(!0);try{await (0,o.p)("markTagged",{variationIds:e,tagged:t}),y.refresh()}catch(e){n.toast.error(e instanceof Error?e.message:"Could not update the tag check.")}finally{R(!1)}}}async function er(t,r){await (0,o.p)("recordJob",{method:t,status:r,templateId:F,presetId:O,items:H.map(t=>{let r=e.variations.find(e=>e.id===t.variationId);return{variationId:r.id,quantity:t.quantity,encodedValue:r.barcodeValue||"",productName:r.itemName,displayName:r.displayName||r.itemName}})}),y.refresh()}async function ea(){R(!0);try{await (0,o._)({quantities:H,templateId:F,presetId:O},"life-etc-labels.pdf"),n.toast.success("PDF downloaded. It is not marked printed until you confirm."),confirm("Mark these labels as printed? Downloading a PDF does not prove they printed.")&&(await er("pdf","printed"),n.toast.success("Print job recorded. Stock was not changed."))}catch(e){n.toast.error(e instanceof Error?e.message:"PDF failed.")}finally{R(!1)}}async function ei(){V("Looking for DYMO printers…");try{let e=await (0,f.I)();P(e.map(e=>e.name));let t=(0,f.b)(e,E||(0,f.o)());t&&U(t.name),V(e.length?`Found ${e.length} printer${1===e.length?"":"s"}.`:"DYMO Connect responded, but no printers were listed.")}catch(e){P([]),V(e instanceof Error?e.message:"DYMO lookup failed.")}}async function en(){if(Z&&ee&&!I){R(!0);try{let t=await (0,f.I)(),r=(0,f.b)(t,E||(0,f.o)());if(!r)throw Error(f.P);E||U(r.name);let a=H.flatMap(t=>{let r=e.variations.find(e=>e.id===t.variationId);if(!r?.barcodeValue)throw Error("A selected product has no barcode.");return Array.from({length:t.quantity},()=>r)}),i=Math.max(1,ee.columns||1),o="portrait"===ee.orientation?"portrait":"landscape",p=(0,c.f)(ee.widthMm,ee.heightMm),b=(0,d.z)(Z.elements,ee.widthMm,ee.heightMm),x=b.find(e=>"barcode"===e.type);for(let e of a){if(!e.barcodeValue)continue;let t=p?(0,l.V)(e.barcodeValue.trim(),e.barcodeFormat):(0,s.K)({text:e.barcodeValue.trim(),format:e.barcodeFormat,widthMm:x?.width??40,heightMm:x?.height??12,rotation:x?.rotation??0});if(!t.ok)throw Error(`${e.displayName||e.itemName}: ${t.reason??"This barcode will not scan."} Open the Barcode Generator and create a code that matches the Square SKU.`)}if(p){let t=Math.max(1,i);for(let i=0;i<a.length;i+=t){let n=a.slice(i,i+t),o=[];for(let t of n){let r=t.barcodeValue?.trim()??"",a=t.barcodeFormat||"code128",i=(0,m.jewelryLabelTitle)((0,h.Q)({...t,logo:e.logo}));o.push({title:i,imageBase64:await g(i,r,a)})}let l=(0,m.buildJewelryRowXml)({slots:o,columns:t,gapMm:ee.columnGapMm??2,labelWidthMm:ee.widthMm,labelHeightMm:ee.heightMm});await (0,f.h)(r.name,l,(0,u.dymoPrintParams)(1,ee.density,"Auto"),"Auto")}}else for(let t=0;t<a.length;t+=i){let n=a.slice(t,t+i),l=(0,u.dymoLabelXml)({widthMm:ee.widthMm,heightMm:ee.heightMm,orientation:o,columnCount:i,columnGapMm:ee.columnGapMm,elements:b,content:(0,h.Q)({...n[0],logo:e.logo}),format:n[0].barcodeFormat,slots:n.map(t=>({elements:b,content:(0,h.Q)({...t,logo:e.logo}),format:t.barcodeFormat}))});await (0,f.h)(r.name,l,(0,u.dymoPrintParams)(1,ee.density,"Auto"),"Auto")}await er("dymo","printed");let y=i>1?` (${Math.ceil(a.length/i)} row${1===Math.ceil(a.length/i)?"":"s"}, ${i} across)`:"";n.toast.success(`Sent ${q} labels to ${r.name}${y}.`)}catch(e){n.toast.error(e instanceof Error?e.message:"DYMO printing failed.")}finally{R(!1)}}}(0,a.useEffect)(()=>{ei()},[]);let eo=!!(E&&D.includes(E));return(0,t.jsxs)("div",{className:"space-y-5",children:[(0,t.jsxs)("div",{className:"rounded-lg border border-line bg-card px-4 py-4 text-sm leading-6",children:[(0,t.jsx)("p",{className:"font-medium",children:"Print straight to your DYMO from this studio"}),(0,t.jsxs)("p",{className:"mt-1 text-muted",children:["Yes—when DYMO Connect is running on ",(0,t.jsx)("span",{className:"text-ink",children:"this Mac"})," with the LabelWriter plugged in, you can print from"," ",(0,t.jsx)("span",{className:"text-ink",children:"Print queue"})," or after creating barcodes. The site talks to DYMO on your computer; nothing prints from the cloud by itself."]}),(0,t.jsxs)("ol",{className:"mt-3 list-decimal space-y-1 pl-5 text-muted",children:[(0,t.jsx)("li",{children:"Install and open DYMO Connect. Confirm the 450 appears in DYMO Connect."}),(0,t.jsxs)("li",{children:["In Chrome, allow ",(0,t.jsx)("span",{className:"text-ink",children:"Local network access"})," for this site (lock icon in the address bar)."]}),(0,t.jsxs)("li",{children:["Click ",(0,t.jsx)("span",{className:"text-ink",children:"Look for DYMO printers"})," below and choose your printer."]}),(0,t.jsxs)("li",{children:["Set quantities, then ",(0,t.jsx)("span",{className:"text-ink",children:"Print with DYMO"}),". Jewelry still prints two tags side by side. Each tag shows the product name and the same barcode as the Barcode Generator, kept fully on the sticker. Use"," ",(0,t.jsx)("span",{className:"text-ink",children:"Export PDF"})," if you prefer Preview."]})]}),(0,t.jsxs)("p",{className:"mt-3 text-muted",children:[(0,t.jsx)(r.default,{href:"/settings/printer",className:"underline decoration-line underline-offset-4",children:"Printer setup"})," · ",(0,t.jsx)(r.default,{href:"/settings/labels",className:"underline decoration-line underline-offset-4",children:"Label sizes"}),eo?(0,t.jsxs)("span",{className:"text-ok",children:[" · Ready: ",E]}):null]})]}),(0,t.jsxs)("div",{className:"grid gap-3 md:grid-cols-4",children:[(0,t.jsxs)(b.d,{value:w,onChange:e=>j(e.target.value),children:[(0,t.jsx)("option",{value:"all",children:"All categories"}),_.map(e=>(0,t.jsx)("option",{children:e},e))]}),(0,t.jsxs)(b.d,{value:M,onChange:e=>C(e.target.value),children:[(0,t.jsx)("option",{value:"all",children:"All materials"}),Y.map(e=>(0,t.jsx)("option",{children:e},e))]}),(0,t.jsxs)(b.d,{value:k,onChange:e=>N(e.target.value),children:[(0,t.jsx)("option",{value:"all",children:"All locations"}),e.locations.map(e=>(0,t.jsx)("option",{value:e.id,children:e.name},e.id))]}),(0,t.jsxs)("label",{className:"flex items-center gap-2 text-sm",children:[(0,t.jsx)("input",{type:"checkbox",checked:S,onChange:e=>v(e.target.checked)})," Only products without recorded labels"]})]}),(0,t.jsxs)("div",{className:"grid gap-3 md:grid-cols-2",children:[(0,t.jsx)(b.N,{label:"Template",children:(0,t.jsx)(b.d,{value:F,onChange:e=>T(e.target.value),children:e.templates.map(e=>(0,t.jsx)("option",{value:e.id,children:e.name},e.id))})}),(0,t.jsx)(b.N,{label:"Label stock",children:(0,t.jsx)(b.d,{value:O,onChange:e=>L(e.target.value),children:e.presets.map(e=>(0,t.jsxs)("option",{value:e.id,children:[e.name," · ",e.widthMm,"×",e.heightMm," mm"]},e.id))})})]}),(0,t.jsxs)("div",{className:"rounded-lg border border-line bg-card px-4 py-3 text-sm",children:[(0,t.jsxs)("div",{className:"flex flex-wrap items-end gap-3",children:[(0,t.jsx)("div",{className:"min-w-[16rem] flex-1",children:(0,t.jsx)(b.N,{label:"DYMO printer",children:(0,t.jsxs)(b.d,{value:E,onChange:e=>U(e.target.value),children:[(0,t.jsx)("option",{value:"",children:"Choose a printer…"}),D.map(e=>(0,t.jsx)("option",{value:e,children:e},e))]})})}),(0,t.jsx)(b.K,{type:"button",variant:"outline",disabled:I,onClick:()=>void ei(),children:"Look for DYMO printers"}),(0,t.jsx)(b.K,{type:"button",variant:"outline",disabled:I||!E,onClick:()=>{R(!0),(0,f.I)().then(e=>{let t=(0,f.b)(e,E);if(!t)throw Error(f.P);return(0,f.i)(t.name)}).then(()=>n.toast.success("Sent a test label to the DYMO. Check whether paper fed.")).catch(e=>n.toast.error(e instanceof Error?e.message:"Test print failed.")).finally(()=>R(!1))},children:"Print test label"})]}),(0,t.jsxs)("p",{className:"mt-2 text-xs leading-5 text-muted",children:["Jewelry tags print two across. Each one shows the product name and the same barcode as the Barcode Generator. DYMO Connect must be running on this Mac; allow"," ",(0,t.jsx)("span",{className:"font-medium",children:"Local network access"})," for this site.",z?` ${z}`:" Click Look for DYMO printers, choose a printer, then try Print test label."]})]}),(0,t.jsxs)("div",{className:"flex flex-wrap gap-2",children:[(0,t.jsx)(b.K,{variant:"outline",onClick:()=>$(Object.fromEntries(G.map(e=>[e.id,"all"===k?Math.max(0,Math.round(e.stock)):Math.max(0,Math.round(e.stockByLocation.find(e=>e.locationId===k)?.quantity??0))]))),children:"One label per unit in stock"}),(0,t.jsx)(b.K,{variant:"ghost",onClick:()=>$({}),children:"Clear quantities"})]}),(0,t.jsx)("div",{className:"overflow-x-auto rounded-lg border border-line bg-card",children:(0,t.jsxs)("table",{className:"w-full min-w-[720px] text-left text-sm",children:[(0,t.jsx)("thead",{className:"text-[11px] uppercase tracking-[0.14em] text-muted",children:(0,t.jsxs)("tr",{className:"border-b border-line",children:[(0,t.jsx)("th",{className:"px-4 py-3",children:"Product"}),(0,t.jsx)("th",{className:"px-4 py-3",children:"In stock"}),(0,t.jsx)("th",{className:"px-4 py-3",children:"Labels to print"}),(0,t.jsx)("th",{className:"px-4 py-3",children:"Recorded prints"})]})}),(0,t.jsxs)("tbody",{children:[0===G.length?(0,t.jsx)("tr",{children:(0,t.jsx)("td",{className:"px-4 py-6 text-muted",colSpan:4,children:0===A.length?"No barcodes have been created yet. Create them in the Barcode Generator before printing.":"No barcoded products match these filters."})}):null,G.map(e=>{let r="all"===k?e.stock:e.stockByLocation.find(e=>e.locationId===k)?.quantity??0;return(0,t.jsxs)("tr",{className:"border-b border-line last:border-0",children:[(0,t.jsxs)("td",{className:"px-4 py-3",children:[e.displayName||e.itemName,(0,t.jsx)("div",{className:"text-muted",children:e.variationName})]}),(0,t.jsx)("td",{className:"px-4 py-3",children:e.trackInventory?r:"—"}),(0,t.jsx)("td",{className:"px-4 py-3",children:(0,t.jsx)(b.e,{className:"w-24",type:"number",min:0,value:B[e.id]??0,onChange:t=>{var r,a;return r=e.id,a=Number(t.target.value),void $(e=>({...e,[r]:Math.max(0,a)}))}})}),(0,t.jsxs)("td",{className:"px-4 py-3 text-muted",children:[e.labelsPrinted,e.needsReprint?" · reprint price":""]})]},e.id)})]})]})}),(0,t.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[(0,t.jsxs)("div",{className:"text-sm",children:["Total: ",q," labels",(ee?.columns??1)>1?`, ${Math.ceil(q/(ee?.columns||1))} printer rows with ${ee?.columns} stickers each`:"",". This does not change inventory."]}),(0,t.jsxs)("div",{className:"flex gap-2",children:[(0,t.jsx)(b.K,{variant:"outline",disabled:I||0===q,onClick:ea,children:"Export PDF"}),(0,t.jsx)(b.K,{disabled:I||0===q,onClick:en,children:"Print with DYMO"})]})]}),(0,t.jsxs)("div",{className:"rounded-lg border border-line bg-card px-4 py-4",children:[(0,t.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("h2",{className:"text-sm font-medium",children:"Tagged"}),(0,t.jsx)("p",{className:"mt-1 text-sm leading-6 text-muted",children:"After the labels print, check off each product once those pieces have a tag on them. A new print clears the check."})]}),(0,t.jsx)(b.K,{type:"button",variant:"outline",disabled:I||0===J.length,onClick:()=>void et(J.map(e=>e.id),!0),children:"Check off all"})]}),0===Q.length?(0,t.jsx)("p",{className:"mt-4 text-sm text-muted",children:"Nothing is waiting. Printed products you have not checked off will show up here."}):(0,t.jsx)("ul",{className:"mt-4 max-h-80 space-y-2 overflow-y-auto text-sm",children:Q.map(e=>{let r=X.get(e.id),a=p(e);return(0,t.jsxs)("li",{className:"flex items-start gap-3 rounded-md border border-line px-3 py-2",children:[(0,t.jsx)("input",{type:"checkbox",className:"mt-1","aria-label":`Tagged ${e.displayName||e.itemName}`,disabled:I,checked:a,onChange:()=>void et([e.id],!a)}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{children:e.displayName||e.itemName}),(0,t.jsxs)("div",{className:"text-muted",children:[e.variationName,r?` \xb7 ${r} in the last print`:` \xb7 ${e.labelsPrinted} labels recorded`]})]})]},e.id)})})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("h2",{className:"text-sm font-medium",children:"Recent jobs"}),(0,t.jsxs)("div",{className:"mt-3 space-y-2 text-sm",children:[0===e.jobs.length?(0,t.jsx)("p",{className:"text-muted",children:"No print jobs yet."}):null,e.jobs.map(e=>(0,t.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2",children:[(0,t.jsxs)("span",{children:[e.totalLabels," labels · ",e.method," · ",e.status]}),(0,t.jsx)("button",{className:"underline",onClick:()=>{let t=new Set(A.map(e=>e.id));$(Object.fromEntries(e.items.filter(e=>t.has(e.variationId)).map(e=>[e.variationId,e.quantity])))},children:"Load quantities"})]},e.id))]})]})]})}],80483)},63001,e=>{"use strict";var t=e.i(85279),r=e.i(46370),a=e.i(68322);function i(e,a){return(0,t.h)({text:e,format:a,widthMm:r.a.width,heightMm:r.a.height,rotation:90,quietMm:1,minModuleMm:.15,minAcrossMm:6})}e.s(["V",0,i,"e",0,function(e,t,r){let n=e.sku?.trim()??"",o=e.gtin?.trim()??"",l=e.barcodeValue?.trim()??"",s=n||null;if("qrcode"===t)return{value:"",format:t,action:"blocked",previousSku:s,reason:"A QR code does not fit on a jewelry tag at a size Square can scan. Use Code 128."};if("ean13"===t||"upca"===t){if(!o)return{value:"",format:t,action:"blocked",previousSku:s,reason:"This variation has no GTIN. One was not created."};let r=i(o,t);if(!r.ok)return{value:o,format:t,action:"blocked",previousSku:s,reason:r.reason??"That GTIN will not scan on a jewelry tag."};let a=l===o&&(e.barcodeFormat??t)===t;return{value:o,format:t,action:a?"ready":"encode-gtin",previousSku:s,reason:a?void 0:"The bars encode the Square GTIN."}}let d="code39"===t&&n&&i(n,"code39").ok?"code39":"code128";if(n&&i(n,d).ok){let r=l===n&&(e.barcodeFormat??d)===d,a="code39"===t&&"code128"===d;return{value:n,format:d,action:r?"ready":"encode-sku",previousSku:s,reason:r?void 0:a?"Code 39 is too wide for a jewelry tag. The bars are Code 128 of this Square SKU.":"The bars encode this Square SKU."}}if(l&&(0,a.g)(l)&&i(l,"code128").ok&&(!n?.trim()||n.trim()!==l))return{value:l.toUpperCase(),format:"code128",action:"replace-sku",previousSku:s,reason:n?`Square SKU ${n} will not scan on a jewelry tag. Square will use ${l.toUpperCase()} instead, which is the code already on this variation.`:`Square has no SKU yet. It will be set to ${l.toUpperCase()} so a scan finds this product.`};let c=function(e){let t=new Set([...e].map(e=>e.trim().toUpperCase()).filter(Boolean));for(let e=1;e<=9999;e+=1){let r=`LE${String(e).padStart(4,"0")}`;if(!t.has(r))return r}throw Error("Could not find an unused short SKU.")}(r);return r.add(c),{value:c,format:"code128",action:"replace-sku",previousSku:s,reason:n?`Square SKU ${n} is too long to scan on a jewelry tag. Square will use ${c} so a scan finds this product.`:`This variation has no SKU. Square will use ${c} so a scan finds this product.`}},"r",0,function(e){let t=new Set;for(let r of e)r.sku?.trim()&&t.add(r.sku.trim().toUpperCase()),r.barcodeValue?.trim()&&t.add(r.barcodeValue.trim().toUpperCase());return t}])},68322,e=>{"use strict";let t=[[/bracelet/i,"BR"],[/necklace/i,"NK"],[/earring/i,"ER"],[/hand\s*chain/i,"HC"],[/keychain|key chain/i,"KC"],[/ring/i,"RG"],[/charm/i,"CH"]],r=[[/gold\s*filled|\bgf\b/i,"GF"],[/sterling|\b925\b/i,"SS"],[/silver/i,"SV"],[/rose/i,"RS"],[/14k|18k|\bgold\b/i,"GD"]],a=/^[A-Z0-9][A-Z0-9._+/-]{1,39}$/i;e.s(["g",0,function(e){return a.test(e.trim())},"K",0,function(e,a){var i,n,o;let l=new Set([...a].map(e=>e.trim().toUpperCase()).filter(Boolean)),s=(i=`${e.itemName} ${e.variationName??""}`,t.find(([e])=>e.test(i))?.[1]??"OT"),d=(n=`${e.material??""} ${e.itemName} ${e.variationName??""}`,r.find(([e])=>e.test(n))?.[1]??"UN");for(let e=1;e<=9999;e+=1){let t=(o=e,`LE-${s}-${d}-${String(o).padStart(3,"0")}`);if(!l.has(t))return t}throw Error("Could not find an unused SKU. Edit one manually.")}])},22266,e=>{"use strict";async function t(e,r={}){let a=await fetch("/api/catalog",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:e,...r})}),i=await a.json().catch(()=>({}));if(!a.ok)throw Error(i.error||"Request failed.");return i}async function r(e,t){let r=await fetch("/api/labels/pdf",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)});if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||"The PDF could not be created.");let a=await r.blob(),i=URL.createObjectURL(a),n=document.createElement("a");n.href=i,n.download=t,n.click(),URL.revokeObjectURL(i)}e.s(["p",0,t,"_",0,r])},37972,e=>{"use strict";let t=`<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Portrait</PaperOrientation>
  <Id>Address</Id>
  <PaperName>30252 Address</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="720" Height="1440" Rx="270" Ry="270"> </RoundRectangle>
  </DrawCommands>
  <ObjectInfo>
    <TextObject>
      <Name>BRAND</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"> </BackColor>
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <GroupID>-1</GroupID>
      <IsOutlined>False</IsOutlined>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>__BRAND__</String>
          <Attributes>
            <Font Family="Arial" Size="6" Bold="True" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0" HueScale="100"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="40" Y="12" Width="640" Height="80"> </Bounds>
  </ObjectInfo>
  <ObjectInfo>
    <TextObject>
      <Name>TITLE</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"> </BackColor>
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <GroupID>-1</GroupID>
      <IsOutlined>False</IsOutlined>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>__TITLE__</String>
          <Attributes>
            <Font Family="Arial" Size="7" Bold="True" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0" HueScale="100"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="40" Y="100" Width="640" Height="140"> </Bounds>
  </ObjectInfo>
  <ObjectInfo>
    <BarcodeObject>
      <Name>BARCODE</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"> </BackColor>
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation90</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <Text>__BARCODE__</Text>
      <Type>Code128Auto</Type>
      <Size>Large</Size>
      <TextPosition>None</TextPosition>
      <TextFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"> </TextFont>
      <CheckSumFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"> </CheckSumFont>
      <TextEmbedding>None</TextEmbedding>
      <ECLevel>0</ECLevel>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <QuietZonesPadding>4</QuietZonesPadding>
    </BarcodeObject>
    <Bounds X="150" Y="250" Width="420" Height="1080"> </Bounds>
  </ObjectInfo>
  <ObjectInfo>
    <TextObject>
      <Name>SKU</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"> </BackColor>
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <GroupID>-1</GroupID>
      <IsOutlined>False</IsOutlined>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>__SKU__</String>
          <Attributes>
            <Font Family="Arial" Size="5" Bold="False" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0" HueScale="100"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="40" Y="1340" Width="640" Height="90"> </Bounds>
  </ObjectInfo>
</DieCutLabel>`;var r=e.i(94194);function a(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function i(e){return e.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim()}function n(e){let t=i(e.displayName||e.productName),r=i(e.variation);return!r||/^regular$/i.test(r)||t.toLowerCase().includes(r.toLowerCase())?t:`${t} ${r}`.trim()}function o(e){return(e/25.4).toFixed(4)}let l=`<Brushes>
            <BackgroundBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"></Color></SolidColorBrush></BackgroundBrush>
            <BorderBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></BorderBrush>
            <StrokeBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></StrokeBrush>
            <FillBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"></Color></SolidColorBrush></FillBrush>
          </Brushes>`;e.s(["buildJewelryLabelXml",0,function(e){let o=a(i(e.brand||"LIFE & ETC.")),l=a(n(e)),s=a(e.barcodeValue||e.sku||""),d=a(i(e.sku||e.barcodeValue||"")),c=t.replace("__BRAND__",o).replace("__TITLE__",l).replace("__BARCODE__",s).replace("__SKU__",d);return(0,r.fixDymoConnectLabelXml)(c)},"buildJewelryRowXml",0,function(e){let t=e.labelWidthMm??12.7,a=e.labelHeightMm??25.4,i=e.gapMm??2,n=Math.max(1,e.columns??e.slots.length),s=e.slots.slice(0,n).map((e,r)=>{var n,s,d;return n=`TAG_${r+1}`,s=e.imageBase64,d=r*(t+i),`<ImageObject>
          <Name>${n}</Name>
          ${l}
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>0</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <Margin><DYMOThickness Left="0" Top="0" Right="0" Bottom="0" /></Margin>
          <Data>${s.replace(/\s/g,"")}</Data>
          <ScaleMode>Uniform</ScaleMode>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <ObjectLayout>
            <DYMOPoint><X>${o(d)}</X><Y>${o(0)}</Y></DYMOPoint>
            <Size><Width>${o(t)}</Width><Height>${o(a)}</Height></Size>
          </ObjectLayout>
        </ImageObject>`}),d=`<?xml version="1.0" encoding="utf-8"?>
<LabelFile version="1">
  <DYMOLabel>
    <Description>Jewelry</Description>
    <Orientation>Portrait</Orientation>
    <LabelName>Address</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint><X>0</X><Y>0</Y></DYMOPoint>
      <Size><Width>${o(t*n+i*(n-1))}</Width><Height>${o(a)}</Height></Size>
    </DYMORect>
    <BorderColor><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></BorderColor>
    <BorderThickness>0</BorderThickness>
    <Show_Border>False</Show_Border>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        ${s.join("")}
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
</LabelFile>`;return(0,r.fixDymoConnectLabelXml)(d)},"jewelryLabelTitle",0,n],37972)},94194,81085,e=>{"use strict";var t=e.i(85279),r=e.i(46370);function a(e,t=12.7,i=25.4){let n=(0,r.f)(t,i);return e.map(e=>{if(!n){if("barcode"===e.type&&e.visible){if(90===e.rotation||270===e.rotation){let t=e.height,r=e.width;return{...e,rotation:0,x:Math.max(.4,e.x+(e.width-t)/2),y:e.y,width:t,height:r}}if(0!==e.rotation)return{...e,rotation:0}}return e}let t=r.G[e.id];return t&&e.visible?{...e,rotation:0,x:t.x,y:t.y,width:t.width,height:t.height,fontSize:t.fontSize??e.fontSize,bold:t.bold??e.bold}:"barcode"===e.type&&e.visible?{...e,rotation:90,...r.a}:e})}function i(e,r,a,n,o=!1){if(o)return"Large";let l=(0,t.K)({text:r,format:e,widthMm:a,heightMm:n});return!l.ok||l.moduleMm<.28?"Large":l.moduleMm<.4?"Medium":"Small"}e.s(["o",0,i,"z",0,a],81085);var n=e.i(46295),o=e.i(55049);let l={code128:"Code128Auto",code39:"Code39",ean13:"Ean13",upca:"UpcA",qrcode:"QRCode"},s=["ForeColor","BackColor","Font","TextFont","CheckSumFont","Color","RoundRectangle","Bounds"];function d(e,t,r,a,i){return m(e,` Alpha="${t}" Red="${r}" Green="${a}" Blue="${i}"`)}function c(e,t,r,a){return m(e,` Family="${t}" Size="${r}" Bold="${a?"True":"False"}" Italic="False" Underline="False" Strikeout="False"`)}function m(e,t=""){return`<${e}${t}> </${e}>`}function u(e){let t=e;for(let e of s)t=t.replace(RegExp(`<${e}([^>]*?)\\s*/>`,"gi"),`<${e}$1> </${e}>`);return t.replace(/<LinkedObjectName\s*\/>/gi,"<LinkedObjectName> </LinkedObjectName>").replace(/<LinkedObjectName><\/LinkedObjectName>/gi,"<LinkedObjectName> </LinkedObjectName>")}function h(e){return"left"===e?"Left":"right"===e?"Right":"Center"}function p(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}e.s(["dymoLabelXml",0,function(e){var t,s;let f=Math.max(1,Math.round(e.columnCount??1)),b=e.columnGapMm??0,g=(0,r.f)(e.widthMm,e.heightMm),x=a(e.elements,e.widthMm,e.heightMm),y=e.slots?.map(t=>({...t,elements:a(t.elements,e.widthMm,e.heightMm)}))??[{elements:x,content:e.content,format:e.format}],w=(0,n.L)(function(e,t=1,r=0){let a=Math.max(1,Math.round(t));return e*a+Math.max(0,r)*(a-1)}(e.widthMm,f,b)),j=(0,n.L)(e.heightMm),M=y.slice(0,f).flatMap((t,r)=>t.elements.filter(e=>e.visible).map(a=>{let s={...a,x:a.x+r*(e.widthMm+b)},u=f>1?`${a.id}_${r+1}`:a.id;return function(e,t,r,a,s=!1){let u=m("Bounds",` X="${(0,n.L)(e.x)}" Y="${(0,n.L)(e.y)}" Width="${(0,n.L)(e.width)}" Height="${(0,n.L)(e.height)}"`);if("logo"===e.type)return"";if("barcode"===e.type){let n=(t.barcodeValue||t.sku||"").trim();if(!n)return"";let o=i(r,n,e.width,e.height,s);return`<ObjectInfo>
      <BarcodeObject>
        <Name>${p(a)}</Name>
        ${d("ForeColor",255,0,0,0)}
        ${d("BackColor",0,255,255,255)}
        <LinkedObjectName> </LinkedObjectName>
        <Rotation>Rotation${e.rotation}</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <Text>${p(n)}</Text>
        <Type>${l[r]??"Code128Auto"}</Type>
        <Size>${o}</Size>
        <TextPosition>None</TextPosition>
        ${c("TextFont","Arial",8,!1)}
        ${c("CheckSumFont","Arial",8,!1)}
        <TextEmbedding>None</TextEmbedding>
        <ECLevel>0</ECLevel>
        <HorizontalAlignment>${h(e.align)}</HorizontalAlignment>
        <QuietZonesPadding>${s?4:10}</QuietZonesPadding>
      </BarcodeObject>
      ${u}
    </ObjectInfo>`}let f=(0,o.Z)(e,t);if(!f)return"";let b="Georgia"===e.fontFamily?"Georgia":"Arial";return`<ObjectInfo>
    <TextObject>
      <Name>${p(a)}</Name>
      ${d("ForeColor",255,0,0,0)}
      ${d("BackColor",0,255,255,255)}
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation${e.rotation}</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <HorizontalAlignment>${h(e.align)}</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>${e.autoSize?"ShrinkToFit":"None"}</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>${p(f)}</String>
          <Attributes>
            ${c("Font",b,e.fontSize,e.bold)}
            ${d("ForeColor",255,0,0,0)}
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    ${u}
  </ObjectInfo>`}(s,t.content,t.format,u,g)})).filter(Boolean).join(""),C=(t=e.widthMm,s=e.heightMm,{id:"Address",name:"30252 Address"}),k=g?f>1?(0,r.g)(e.widthMm,e.heightMm,f,b):(0,r.b)(e.widthMm,e.heightMm):`<DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${w}" Height="${j}" Rx="270" Ry="270"> </RoundRectangle>
  </DrawCommands>`;return u(`<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>${"portrait"===e.orientation?"Portrait":"Landscape"}</PaperOrientation>
  <Id>${C.id}</Id>
  <PaperName>${C.name}</PaperName>
  ${k}
  ${M}
</DieCutLabel>`)},"dymoPrintParams",0,function(e,t,r="Auto"){let a=Math.max(1,Math.min(e,200));return`<LabelWriterPrintParams><Copies>${a}</Copies><TwinTurboRoll>${r}</TwinTurboRoll></LabelWriterPrintParams>`},"fixDymoConnectLabelXml",0,u],94194)},55049,e=>{"use strict";var t=e.i(75379);e.s(["Z",0,function(e,t){switch(e.type){case"brand":return e.customText?.trim()||t.brand;case"productName":return t.productName;case"displayName":return t.displayName;case"variation":return t.variation;case"price":return t.price;case"barcodeText":return t.barcodeValue;case"sku":return t.sku;case"customText":return e.customText?.trim()||t.customText;case"material":return t.material;case"details":return t.details;default:return""}},"L",0,function(e,t,r,a,i,n=100,o=!1){if(!i||!e)return t;let l=a?.22:.2,s=t;for(;s>3.5;){let t=Math.max(1,Math.floor(r/(s*l))),a=o?Math.ceil(e.length/t):1,i=o||e.length<=t,d=a*s*.42<=n;if(i&&d)return s;s-=.5}return 3.5},"Q",0,function(e){let r=e.productName||e.itemName||"";return{brand:"LIFE & ETC.",productName:r,displayName:e.displayName?.trim()||r,variation:e.variationName,price:e.showPrice?(0,t.i)(e.priceAmount,e.currency??"USD"):"",sku:e.sku??"",barcodeValue:e.barcodeValue??"",customText:e.customText?.trim()??"",material:e.material?.trim()??"",details:e.details?.trim()??"",logo:e.logo??null}}])},85279,46370,e=>{"use strict";function t(e){let t=90===e.rotation||270===e.rotation,r=t?e.heightMm:e.widthMm,a=t?e.widthMm:e.heightMm;if(!e.text.trim())return{ok:!1,reason:"This label has no barcode value yet.",moduleMm:0};if("qrcode"===e.format){let t=e.widthMm>=12&&e.heightMm>=12;return{ok:t,moduleMm:Math.min(e.widthMm,e.heightMm)/25,reason:t?void 0:"A QR code on this label would be under 12 mm. That is too small to trust."}}let i=e.quietMm??5,n=e.minModuleMm??.25,o=e.minAcrossMm??6,l="code39"===e.format?16*e.text.length+30:11*Math.max(e.text.length,1)+35,s=r-i,d=l>0?s/l:0;return a<o?{ok:!1,moduleMm:d,reason:`Barcode height is under ${o} mm, which is too short to scan reliably.`}:s<=0||d<n?{ok:!1,moduleMm:d,reason:`The bars would be about ${Math.max(d,0).toFixed(3)} mm wide. Keep them at least ${n} mm, including quiet space.`}:{ok:!0,moduleMm:d}}e.s(["h",0,t,"K",0,function(e){return t({quietMm:1,minModuleMm:.15,minAcrossMm:6,rotation:0,...e})}],85279);var r=e.i(46295);function a(e){return e/r.I*r.K}let i={x:a(150),y:a(250),width:a(420),height:a(1080)},n={brand:{x:a(40),y:a(12),width:a(640),height:a(80),fontSize:6,bold:!0},name:{x:a(40),y:a(100),width:a(640),height:a(140),fontSize:7,bold:!0},sku:{x:a(40),y:a(1340),width:a(640),height:a(90),fontSize:5,bold:!1}};function o(e,t,a,i){let n=(0,r.L)(e),o=(0,r.L)(t),l=(0,r.L)(i),s=Array.from({length:Math.max(1,Math.round(a))},(e,t)=>`<RoundRectangle X="${t*(n+l)}" Y="0" Width="${n}" Height="${o}" Rx="270" Ry="270"> </RoundRectangle>`);return`<DrawCommands>
${s.join("\n")}
</DrawCommands>`}e.s(["a",0,i,"G",0,n,"f",0,function(e,t){return .2>Math.abs(e-12.7)&&.2>Math.abs(t-25.4)},"g",0,o,"b",0,function(e,t){return o(e,t,1,0)}],46370)},46295,e=>{"use strict";e.s(["x",0,{brand:"Brand",productName:"Square product name",displayName:"Label name",variation:"Variation",price:"Price",barcode:"Barcode",barcodeText:"Barcode number",sku:"SKU",customText:"Custom text",logo:"Logo",material:"Material",details:"Details"},"K",0,25.4,"I",0,1440,"L",0,function(e){return Math.round(e/25.4*1440)}])},32474,e=>{"use strict";var t=e.i(94194);let r="lifeEtcDymoPrinter";function a(){let e=window.dymo?.xml;if(!e?.serialize||e.__lifeEtcPatched)return;let r=e.serialize.bind(e);e.serialize=e=>(0,t.fixDymoConnectLabelXml)(r(e)),e.__lifeEtcPatched=!0}function i(e){return Array.isArray(e)?e.map(e=>e&&"object"==typeof e&&("string"==typeof e.name?e.name.trim():"")?e:null).filter(Boolean):[]}function n(e){window.localStorage.setItem(r,e)}async function o(e){if(e.getPrintersByTypeAsync)try{let t=i(await e.getPrintersByTypeAsync("LabelWriterPrinter"));if(t.length)return t}catch{}if(e.getPrintersAsync)for(let t of[0,1200,2500]){t&&await function(e){return new Promise(t=>window.setTimeout(t,e))}(t);try{let t=i(await e.getPrintersAsync());if(t.length)return t}catch(t){let e=t instanceof Error?t.message:"";if(!/discovery is in progress/i.test(e))throw t}}return i(e.getPrinters?.()??[])}async function l(){await (window.dymo?.label?.framework?(a(),Promise.resolve()):new Promise((e,t)=>{let r=document.querySelector("script[data-dymo-framework]");if(r){let i=()=>{a(),e()};return window.dymo?.label?.framework?void i():(r.addEventListener("load",i,{once:!0}),void r.addEventListener("error",()=>t(Error("The DYMO framework file failed to load.")),{once:!0}))}let i=document.createElement("script");i.src="/vendor/dymo.connect.framework.js?v=lifeetc-3",i.async=!0,i.dataset.dymoFramework="true",i.onload=()=>{a(),e()},i.onerror=()=>t(Error("DYMO Connect Framework is not available in this app build. Use the PDF and print it from this Mac.")),document.body.appendChild(i)}));let e=window.dymo?.label?.framework;if(!e)throw Error("DYMO Connect is not available in this browser. Install DYMO Connect on this Mac, then allow local network access for this site in Chrome (lock icon → Local Network).");await new Promise(t=>{try{e.init(()=>t())}catch{t()}}),a();let t=e.checkEnvironment?.();if(t&&!1===t.isWebServicePresent)throw Error(t.errorDetails||"DYMO Connect software is not running on this Mac. Open DYMO Connect and try again.");return o(e)}function s(e,t,r,a){return new Promise((i,n)=>{try{let o=e=>n(e instanceof Error?e:Error(String(e)));if(!e.printLabelAsync){e.printLabel(t,r,a,""),i();return}let l=e.printLabelAsync(t,r,a,"");if(null==l)return void i();if("function"==typeof l.then){let e=l.then(()=>i(),o);e&&"function"==typeof e.thenCatch&&e.thenCatch?.(o);return}Promise.resolve(l).then(()=>i()).catch(o)}catch(e){n(e instanceof Error?e:Error(String(e)))}})}async function d(e,r,i,o="Auto"){let l=window.dymo?.label?.framework;if(!l)throw Error("DYMO is not connected in this browser.");a();let c=(0,t.fixDymoConnectLabelXml)(r);if(c.includes("<ImageObject>")){await s(l,e,i,c),n(e);return}let m=l.openLabelXml?.(c);if(m?.isValidLabel&&!m.isValidLabel())throw Error("DYMO Connect rejected this label size or layout. Adjust the stock size, or print the PDF instead.");let u=m?.getLabelXml?(0,t.fixDymoConnectLabelXml)(m.getLabelXml()):c;if(!u.includes("<BarcodeObject>")&&!u.includes("<TextObject>"))throw Error("DYMO opened an empty label. Try Print test label, then retry.");await s(l,e,i,u),n(e)}async function c(t){let{buildJewelryLabelXml:r}=await e.A(63273),{dymoPrintParams:a}=await e.A(36984),i=r({brand:"LIFE & ETC.",productName:"Test",displayName:"DYMO test",variation:"Regular",price:"",sku:"TEST",barcodeValue:"TEST",customText:"",material:"",details:"",logo:null});await d(t,i,a(1,"barcode","Auto"))}e.s(["P",0,"DYMO Connect is running, but no LabelWriter was listed. Open DYMO Connect and confirm your printer appears there. In Chrome, allow Local network access for this site. Unplug and replug the USB cable, then try Settings → Printer setup → Look for DYMO printers.","I",0,l,"b",0,function(e,t){if(!e.length)return null;if(t){let r=e.find(e=>e.name===t);if(r)return r}let r=e.filter(e=>"LabelWriterPrinter"===e.printerType||/dymo|labelwriter/i.test(e.name)),a=r.length?r:e;return a.find(e=>/450/i.test(e.name))??a[0]},"h",0,d,"i",0,c,"o",0,function(){return window.localStorage.getItem(r)}])}]);