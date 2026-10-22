/* Local KaTeX typesetting shared by the article and figure gallery. */
'use strict';
const mathCache=new Map();
function mathHTML(tex,display=false){
  const key=(display?'D':'I')+tex;
  if(mathCache.has(key))return mathCache.get(key);
  const html=katex.renderToString(tex,{displayMode:display,throwOnError:true,strict:'error',trust:false,output:'htmlAndMathml'});
  if(mathCache.size>512)mathCache.clear();
  mathCache.set(key,html);return html;
}
function setMath(element,tex){element.innerHTML=mathHTML(tex);}
function svgMath(x,y,tex,color='#17191d',size=13,width=160,align='center'){
  const left=align==='start'?x:align==='end'?x-width:x-width/2;
  return `<foreignObject x="${left}" y="${y-24}" width="${width}" height="48" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" class="svg-math" style="display:flex;align-items:center;justify-content:${align==='start'?'flex-start':align==='end'?'flex-end':'center'};height:48px;line-height:1;font-size:${size}px;color:${color};white-space:nowrap">${mathHTML(tex)}</div></foreignObject>`;
}
for(const element of document.querySelectorAll('[data-tex]'))element.innerHTML=mathHTML(element.dataset.tex,element.dataset.display==='true');
