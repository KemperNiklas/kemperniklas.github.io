'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const BLUE='#b7cbea', BLUEINK='#50729f', INK='#17191d', GHOST='#d4d8de';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const line=(x1,y1,x2,y2,color=INK,width=1.8,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
const circle=(x,y,r,fill=INK,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const text=(x,y,s,color=INK,size=16,extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" text-anchor="middle" ${extra}>${s}</text>`;
const fresh=s=>s;
const svgSetup=(svg,w=340,h=250)=>svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
// 1. Resolution-independent SVG; the initial structures never receive a halo.
// Cyclizine frames are generated and chemically validated by build_molecule.py.
// Ring fragments expand existing attachment atoms; their connecting bonds
// have already appeared in an earlier frame.
// A larger, uneven hierarchy for the opener only. The teaching tree stays small.
const openerTree=[[260,28,null],[145,95,0],[375,95,0],
 [85,162,1],[205,162,1],[375,162,2],
 [50,229,3],[120,229,3],[175,229,4],[235,229,4],[335,229,5],[415,229,5],
 [120,296,7],[215,296,9],[255,296,9],[415,296,11]];
const openerTreeBatches=[[],[1],[2,3],[4,6,7],[5,8,12],[9,10,11],[13,14,15]];
function openerHierarchy(step,emphasis){
 const present=new Set([0,...openerTreeBatches.slice(0,step+1).flat()]),added=new Set(openerTreeBatches[step]);
 let halo='',ink='';
 for(const i of present){
  const [x,y,parent]=openerTree[i];
  if(parent!==null){
   const [px,py]=openerTree[parent],len=Math.hypot(x-px,y-py),trim=parent===0?12:0;
   if(added.has(i))halo+=line(px+(x-px)*trim/len,py+(y-py)*trim/len,x,y,BLUE,13)+circle(x,y,12,BLUE);
   ink+=line(px,py,x,y,INK,1.9);
  }
  ink+=circle(x,y,5.5,INK);
 }
 return `<g opacity="${emphasis}">${halo}</g>${ink}`;
}
let openerPlayers=[], openerTime=200, openerPlaying=!reduced;
function openerMolecule(step,emphasis=0){
  const frame=moleculeFrames[step];
  return `<g opacity="${emphasis}">${frame.halo}</g>${frame.ink}`;
}
function initOpener(){
  for(const kind of ['molecule','tree']){
    const button=document.createElement('button');button.type='button';
    button.setAttribute('aria-label',`Pause or play ${kind} growth animation`);
    const svg=makeSVG(`${kind} growth`);svgSetup(svg,520,360);
    button.append(svg);$('opener').append(button);button.onclick=toggleOpener;
    openerPlayers.push({svg,kind});
  }
  if(reduced)openerTime=11000;
  drawOpener();$('opener-play').textContent=openerPlaying?'Pause both':'Play both';
}
function toggleOpener(){openerPlaying=!openerPlaying;$('opener-play').textContent=openerPlaying?'Pause both':'Play both';}
function drawOpener(){
  const fade=1-smooth((openerTime-12550)/400);
  for(const p of openerPlayers){
    const count=p.kind==='molecule'?moleculeFrames.length:openerTreeBatches.length;
    const interval=10500/count,i=Math.min(count-1,Math.floor(openerTime/interval)),age=openerTime-i*interval;
    const reveal=smooth(age/180),emphasis=1-smooth((age-260)/(interval-300));
    const state=(k,e)=>{
      if(p.kind==='molecule')return openerMolecule(k,e);
      return openerHierarchy(k,e);
    };
    // Crossfade complete vector states while keeping the established geometry fixed.
    p.svg.innerHTML=`<g opacity="${fade}"><g opacity="${1-reveal}">${state(Math.max(0,i-1),0)}</g><g opacity="${reveal}">${state(i,emphasis)}</g></g>`;
  }
}
if($('opener')){
  $('opener-play').onclick=toggleOpener;
  $('opener-restart').onclick=()=>{openerTime=200;openerPlaying=true;$('opener-play').textContent='Pause both';drawOpener();};
}

// Molecule drawings for 2 and 3. A saturated morpholine ring is joined at an
// existing N. Every bond is explicit, and scaffold coordinates remain fixed.
function moleculeModel(kind){
  if(kind==='small')return {atoms:[[160,120,'N'],[194,86,'C'],[228,120,'C'],[194,154,'C'],[112,120,'C']],bonds:[[0,4,1,null]],ring:[[0,1,1,null],[1,2,1,null],[2,3,1,null],[3,0,1,null]],scaffoldStart:4};
  const atoms=[[180,130,'N'],[204,88.4,'C'],[252,88.4,'C'],[276,130,'O'],[252,171.6,'C'],[204,171.6,'C'],[124,130,'C']];
  const bonds=[[0,6,1,null]];
  if(kind==='branched'){
    atoms.push([96,81.5,'C'],[40,81.5,'C'],[124,33,'C']);
    bonds.push([6,7,1,null],[7,8,1,null],[7,9,1,null]);
  }
  if(kind==='phenol'){
    atoms.push([100,88.4,'C'],[52,88.4,'C'],[28,130,'C'],[52,171.6,'C'],[100,171.6,'C']);
    for(let j=0;j<6;j++)bonds.push([6+j,6+(j+1)%6,j%2===0?2:1,[76,130]]);
    atoms.push([24,40,'O']);bonds.push([8,12,1,null]);
  }
  return {atoms,bonds,ring:[[0,1,1,null],[1,2,1,null],[2,3,1,null],[3,4,1,null],[4,5,1,null],[5,0,1,null]]};
}
function moleculeSVG(svg,kind,ringCount=0,closed=false,{newAtoms=[],newBonds=[],site=false}={}){
  svgSetup(svg);const m=moleculeModel(kind), present=new Set([0,...m.atoms.map((_,i)=>i).filter(i=>i>=(m.scaffoldStart||6)),...Array.from({length:ringCount},(_,i)=>i+1)]);
  const atomSet=new Set(newAtoms),edgeSet=new Set(newBonds);
  let halos='',existing='',added='';
  const edges=m.bonds.map(b=>({b,id:-1})).concat(m.ring.slice(0,ringCount).map((b,i)=>({b,id:i})));
  if(closed)edges.push({b:m.ring[m.ring.length-1],id:m.ring.length-1});
  for(const {b:[a,b,order,center],id} of edges){
    const p=m.atoms[a],q=m.atoms[b],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy),newEdge=edgeSet.has(id);
    if(newEdge)halos+=line(p[0],p[1],q[0],q[1],BLUE,12);
    const trimA=p[2]==='C'?0:10,trimB=q[2]==='C'?0:10;
    let drawing=line(p[0]+dx*trimA/length,p[1]+dy*trimA/length,q[0]-dx*trimB/length,q[1]-dy*trimB/length);
    if(order===2){
      const tx=center[0]-(p[0]+q[0])/2,ty=center[1]-(p[1]+q[1])/2,norm=Math.hypot(tx,ty),ox=tx*5/norm,oy=ty*5/norm;
      drawing+=line(p[0]+dx*.2+ox,p[1]+dy*.2+oy,q[0]-dx*.2+ox,q[1]-dy*.2+oy);
    }
    if(newEdge)added+=drawing;else existing+=drawing;
  }
  for(const i of present){
    const [x,y,element]=m.atoms[i];
    if(atomSet.has(i))halos+=circle(x,y,11,BLUE);
    if(element!=='C'){
      const t=text(x,y+6,element,element==='N'?'#0000d8':'#e00000',20);
      if(atomSet.has(i))added+=t;else existing+=t;
    }
  }
  if(site)existing+=circle(180,130,15,'none',`stroke="${BLUEINK}" stroke-width="1.5" stroke-dasharray="3 3"`);
  svg.innerHTML=fresh(halos)+existing+fresh(added);
}

// 2–3 are static: no timers, step controls, or reveal animation.
function makeSVG(label){
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('role','img');svg.setAttribute('aria-label',label);return svg;
}
function stateFigure(svg,caption=''){
  const figure=document.createElement('figure');figure.className='state';figure.append(svg);
  if(caption){const c=document.createElement('figcaption');c.textContent=caption;figure.append(c);}
  return figure;
}
function actionArrow(label=''){
  const arrow=document.createElement('div');arrow.className='action-arrow';
  if(label){const t=document.createElement('span');t.className='arrow-label';
    const match=label.match(/^(AddFrag|AddAtom|AddBond|AddChild)(?:\((.*)\))?$/);
    if(/^a_\d+$/.test(label))setMath(t,label);
    else if(match)setMath(t,`\\operatorname{${match[1]}}${match[2]?`(\\text{${match[2]}})`:''}`);else t.textContent=label;
    arrow.append(t);
  }
  const shaft=document.createElement('span');shaft.className='shaft';shaft.setAttribute('aria-hidden','true');arrow.append(shaft);return arrow;
}
for(const kind of ['branched','phenol']){
  const row=document.createElement('div');row.className='reaction';
  const before=makeSVG('Starting molecule. The ring marks the attachment nitrogen.');
  moleculeSVG(before,kind,0,false,{site:true});
  before.innerHTML=`<g transform="translate(54 0)">${before.innerHTML}</g>`;before.setAttribute('viewBox','0 5 340 205');
  const after=makeSVG('The same molecule after a morpholine fragment insertion. New atoms and bonds are blue.');
  moleculeSVG(after,kind,5,true,{newAtoms:[1,2,3,4,5],newBonds:[0,1,2,3,4,5]});after.setAttribute('viewBox','0 5 340 205');
  row.append(before,actionArrow('AddFrag(N1CCOCC1)'),after);$('reuse-molecules').append(row);
}
function moleculeState(k,fragment=false){
  const svg=makeSVG(k===0?'Initial molecule':fragment?'Final molecule after one fragment insertion':`Intermediate molecule after ${k} actions`);
  const count=fragment?3:Math.min(k,3),closed=fragment||k===4;
  moleculeSVG(svg,'small',count,closed,{
    newAtoms:fragment?[1,2,3]:k>0&&k<4?[k]:[],
    newBonds:fragment?[0,1,2,3]:k?[k-1]:[]
  });
  svg.setAttribute('viewBox','100 69 142 105');return stateFigure(svg);
}
$('fragment-trajectory').append(moleculeState(0),actionArrow('AddFrag'),moleculeState(4,true));
for(let k=0;k<=4;k++){
  if(k)$('atom-trajectory').append(actionArrow(k===4?'AddBond':'AddAtom'));
  $('atom-trajectory').append(moleculeState(k));
}

// One uneven target tree reused throughout: equal level spacing, centered
// child fans, but different branch sizes and depths. No visible node names.
const tree=[[165,25,null],[90,100,0],[240,100,0],
            [50,175,1],[130,175,1],[130,250,4],[240,175,2]];
const children=tree.map(()=>[]);tree.forEach((n,i)=>{if(i)children[n[2]].push(i);});
const depth=i=>i===0?0:1+depth(tree[i][2]);
const ready=present=>tree.map((_,i)=>i).filter(i=>i&&!present.has(i)&&present.has(tree[i][2]));
const rateWidth=rate=>1+2.2*Math.log1p(rate); // Monotone compression keeps large rates legible.
function treeMarkup(present,{highlight=null,next=null,blocked=null,ghost=[],rate=null,mini=false,emphasis=1}={}){
  const visible=new Set([...present,...ghost]);
  for(const i of [next,blocked])if(i!==null){visible.add(i);visible.add(tree[i][2]);}
  let bg='',edges='',nodes='',value='';
  for(const i of [...visible].sort((a,b)=>a-b)){
    if(i===0)continue;
    const [x,y,parent]=tree[i],[px,py]=tree[parent],exists=present.has(i),isNext=i===next,isBlocked=i===blocked;
    if((Array.isArray(highlight)?highlight.includes(i):i===highlight)&&i!==0){
      const len=Math.hypot(x-px,y-py),trim=parent===0?10:0;
      bg+=line(px+(x-px)*trim/len,py+(y-py)*trim/len,x,y,BLUE,mini?16:12)+circle(x,y,mini?14:12,BLUE);
    }
    const color=exists?INK:isNext?BLUEINK:isBlocked?'#aa7544':GHOST;
    const width=isNext&&rate!==null?rateWidth(rate):mini?3.3:1.8;
    edges+=line(px,py,x,y,color,width,exists||isNext&&rate!==null?'':'stroke-dasharray="4 5"');

  }
  for(const i of visible){
    const [x,y]=tree[i],exists=present.has(i),isNext=i===next,isBlocked=i===blocked;
    const color=exists?INK:isNext?BLUEINK:isBlocked?'#aa7544':GHOST;
    nodes+=circle(x,y,mini?7.3:5.4,exists?INK:'white',exists?'':`stroke="${color}" stroke-width="${mini?2.5:1.6}"`);
  }
  return `<g opacity="${emphasis}">${bg}</g>`+edges+nodes+value;
}
function drawTree(svg,present,options={}){svgSetup(svg,320,285);svg.innerHTML=treeMarkup(present,options);}

// 4. One partial state. All target actions are visible, including those
// whose parents do not yet exist. Color distinguishes availability.
function drawPrerequisites(){
  const present=new Set([0,1]),available=new Set(ready(present));
  const svg=makeSVG('Partial tree. Blue dashed additions are available; gray dashed additions require a missing parent.');
  svgSetup(svg,320,285);let edges='',nodes='';
  tree.forEach(([x,y,parent],i)=>{
    const exists=present.has(i),color=exists?INK:available.has(i)?BLUEINK:'#b4bac3';
    if(i){const [px,py]=tree[parent];edges+=line(px,py,x,y,color,exists?1.8:2,exists?'':'stroke-dasharray="4 5"');}
    nodes+=circle(x,y,5.4,exists?INK:'white',exists?'':`stroke="${color}" stroke-width="1.6"`);
  });
  svg.innerHTML=edges+nodes;$('dependency-diagram').append(svg);
}
drawPrerequisites();

// 5. BFS samples ties within a level. DFS samples sibling orders. Uniform
// sampling weights currently available actions by their subtree sizes.
function shuffle(values){
  const result=values.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
const size=i=>1+children[i].reduce((sum,j)=>sum+size(j),0);
function sampleOrder(policy){
  if(policy==='dfs'){
    const result=[];const visit=i=>{if(i)result.push(i);shuffle(children[i]).forEach(visit);};visit(0);return result;
  }
  const seen=new Set([0]),result=[];
  while(result.length<tree.length-1){
    let options=ready(seen),chosen;
    if(policy==='bfs'){
      const shallowest=Math.min(...options.map(depth));options=options.filter(i=>depth(i)===shallowest);
      chosen=options[Math.floor(Math.random()*options.length)];
    }else{
      let pick=Math.random()*options.reduce((n,i)=>n+size(i),0);chosen=options[options.length-1];
      for(const i of options){pick-=size(i);if(pick<0){chosen=i;break;}}
    }
    result.push(chosen);seen.add(chosen);
  }
  return result;
}
let currentOrder=sampleOrder('uniform');
function drawTrajectory(){
  const row=$('tree-trajectory');row.innerHTML='';
  for(let k=0;k<=currentOrder.length;k++){
    if(k)row.append(actionArrow());
    const svg=makeSVG(`Tree after ${k} of ${currentOrder.length} insertions`);
    drawTree(svg,new Set([0,...currentOrder.slice(0,k)]),{highlight:k?currentOrder[k-1]:null,mini:true});
    row.append(stateFigure(svg));
  }
}
function resampleOrder(){currentOrder=sampleOrder($('trajectory-policy').value);flowPlaying=false;drawTrajectory();drawFlow();}
$('trajectory-policy').onchange=resampleOrder;$('trajectory-sample').onclick=resampleOrder;drawTrajectory();

// 6. Only the next action has a positive conditional rate. Existing structure
// stays black; no previously performed action is highlighted.
let flowTrajectoryKey='';
let eventTimes=[.12,.25,.44,.62,.77,.91],flowTime=.38,flowPlaying=false,dragging=null;
function flowState(){
  const k=eventTimes.filter(t=>t<=flowTime).length;
  return {k,next:k<currentOrder.length?currentOrder[k]:null,rate:k<currentOrder.length?(currentOrder.length-k)/(1-flowTime):0};
}
function drawTimeline(k){
  const svg=$('flow-timeline'),w=Math.max(280,svg.getBoundingClientRect().width),left=32,right=w-32,y=43;
  svgSetup(svg,w,144);const x=t=>left+t*(right-left);
  let s=`<rect width="${w}" height="144" fill="transparent"/>`;
  s+=line(left,y,right,y,GHOST,2)+line(left,y,x(flowTime),y,BLUEINK,2);
  // Compact endpoint labels sit on ticks; action names use collision-aware rows.
  s+=line(left,y-6,left,y+6,INK,1)+line(right,y-6,right,y+6,INK,1);
  s+=text(left,y-16,'0',INK,13)+text(right,y-16,'1',INK,13);
  const lanes=[[],[],[]];
  eventTimes.forEach((t,i)=>{
    const xx=x(t),labelX=Math.max(left+15,Math.min(right-15,xx));
    let row=lanes.findIndex(lane=>lane.every(item=>Math.abs(labelX-item.labelX)>62));
    if(row<0)row=i%3;
    lanes[row].push({xx,labelX,i});
  });
  lanes.forEach((lane,row)=>{
    // Pack labels even for tightly clustered event times, retaining leaders.
    lane.sort((a,b)=>a.xx-b.xx);
    lane.forEach((item,j)=>{item.labelX=Math.max(item.labelX,j?lane[j-1].labelX+62:left+15);});
    for(let j=lane.length-1;j>=0;j--)lane[j].labelX=Math.min(lane[j].labelX,j<lane.length-1?lane[j+1].labelX-62:right-15);
    for(const {xx,labelX,i} of lane){
      const labelY=76+row*21;
      s+=circle(xx,y,3.5,i<k?BLUEINK:'white',`stroke="${BLUEINK}" stroke-width="1.2"`);
      s+=line(xx,y+6,labelX,labelY-13,GHOST,.7);
      s+=svgMath(labelX,labelY-4,`a_${i+1}`,BLUEINK,13,40);
    }
  });
  s+=line(x(flowTime),y-9,x(flowTime),y+9,INK,1.3)+circle(x(flowTime),y,6,'white',`stroke="${INK}" stroke-width="1.5"`);
  s+=svgMath(w/2,137,`t = ${flowTime.toFixed(2)}`,INK,13);
  svg.innerHTML=s;svg.setAttribute('aria-valuenow',flowTime.toFixed(3));
  svg.setAttribute('aria-valuetext',`Time ${flowTime.toFixed(3)}; ${k} of ${currentOrder.length} actions complete`);
}
function drawFlow(){
  const {k,next,rate}=flowState();
  const [mantissa,exponent]=rate.toExponential(1).split('e');
  const rateTex=rate<1000?rate.toFixed(2):`${mantissa}\\times 10^{${Number(exponent)}}`;
  const key=currentOrder.join(',')+':'+k;
  if(key!==flowTrajectoryKey){
    flowTrajectoryKey=key;const row=$('flow-trajectory');row.innerHTML='';
    for(let j=0;j<=currentOrder.length;j++){
      if(j)row.append(actionArrow(`a_${j}`));
      const svg=makeSVG(`State s${j} of the fixed trajectory`);
      drawTree(svg,new Set([0,...currentOrder.slice(0,j)]),{mini:true});
      const state=stateFigure(svg);if(j===k)state.className+=' chosen';row.append(state);
    }
  }
  drawTree($('flow-tree'),new Set([0,...currentOrder.slice(0,k)]),{next,rate});
  $('flow-tree').setAttribute('viewBox','-65 0 450 285');
  const rateLabel=$('flow-rate-label');rateLabel.hidden=next===null;
  if(next!==null){
    const [x,y,parent]=tree[next],[px,py]=tree[parent],dx=x-px,dy=y-py,length=Math.hypot(dx,dy),side=dx<0?-1:1;
    const tx=(px+x)/2+side*dy/length*25,ty=(py+y)/2-side*dx/length*25;
    setMath(rateLabel,`u_t=${rateTex}`);
    rateLabel.setAttribute('style',`left:${(tx+65)/450*100}%;top:${ty/285*100}%;transform:translate(${side<0?'-100%':'0'},-50%)`);
  }
  $('flow-tree').setAttribute('aria-label',next===null?'Completed tree. All rates are zero.':`Current tree. The blue pending edge is the next action, with rate ${rate.toFixed(2)}. Its thickness increases with the rate. All other rates are zero.`);
  const roundedTime=Number(flowTime.toFixed(4));
  const timeLabel=(roundedTime===1&&flowTime<1?flowTime:roundedTime).toString();
  setMath($('flow-computation'),next===null
    ? `u_t(a\\mid s_${k},\\tau)=0`
    : `u_t(a_${k+1}\\mid s_${k},\\tau)=\\frac{n-k}{1-t}=\\frac{${currentOrder.length}-${k}}{1-${timeLabel}}\\approx ${rateTex}`);
  $('flow-note').textContent=next===null?'All rates are 0.':'All other rates are 0.';
  drawTimeline(k);$('flow-play').textContent=flowPlaying?'Pause':flowTime===1?'Replay':'Play';
}
function timeFromPointer(event){
  const rect=$('flow-timeline').getBoundingClientRect(),w=Math.max(280,rect.width);
  const local=(event.clientX-rect.left)/rect.width*w;
  return Math.max(0,Math.min(1,(local-32)/(w-64)));
}
function scrub(event){flowTime=timeFromPointer(event);flowPlaying=false;drawFlow();}
const timeline=$('flow-timeline');
timeline.onpointerdown=event=>{
  if(event.button!==0&&event.button!==undefined)return;
  event.preventDefault();dragging=event.pointerId;timeline.setPointerCapture(event.pointerId);scrub(event);
};
timeline.onpointermove=event=>{if(dragging===event.pointerId)scrub(event);};
timeline.onpointerup=event=>{
  if(dragging!==event.pointerId)return;scrub(event);
  if(timeline.hasPointerCapture(event.pointerId))timeline.releasePointerCapture(event.pointerId);dragging=null;
};
timeline.onpointercancel=()=>{dragging=null;};
timeline.onlostpointercapture=()=>{dragging=null;};
timeline.onkeydown=event=>{
  const increment=event.shiftKey ? 0.1 : 0.01;
  if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(event.key)){
    event.preventDefault();flowPlaying=false;
    flowTime=event.key==='Home'?0:event.key==='End'?1:Math.max(0,Math.min(1,flowTime+(['ArrowRight','ArrowUp'].includes(event.key)?increment:-increment)));drawFlow();
  }
};
$('flow-play').onclick=()=>{if(flowTime===1)flowTime=0;flowPlaying=!flowPlaying;drawFlow();};
$('flow-resample').onclick=()=>{eventTimes=Array.from({length:currentOrder.length},()=>Math.random()).sort((a,b)=>a-b);drawFlow();};
new ResizeObserver(()=>drawTimeline(flowState().k)).observe(timeline);drawFlow();

// 7–8. The model below supplies illustrative rates only; no trained checkpoint
// is bundled. It sees the current graph and time, never a target or trajectory.
const actionName=id=>String.fromCharCode(65+id);
function illustrativeRates(nodes,t){
  const level=id=>nodes[id].parent===null?0:1+level(nodes[id].parent);
  return nodes.map(n=>{
    const count=nodes.filter(v=>v.parent===n.id).length;
    const rate=8*(1-.8*t)*Math.exp(-1.1*count)/(1+.55*level(n.id))*Math.min(1,8/nodes.length);
    return {parent:n.id,rate};
  });
}
function rateBars(container,rows,{paired=false,selected=[],nextAction=null}={}){
  // HTML keeps KaTeX labels and bars on the same baseline, including when
  // a chart is centered in a taller panel (SVG foreignObject differs in Safari).
  const max=Math.max(1,...rows.map(r=>Math.max(r.rate,r.target||0)));
  const cell=(value,target=false,chosen=false)=>`<div class="rate-cell ${paired&&target&&chosen?'next-target':''}"><span class="rate-track"><span class="rate-fill ${target?'target-fill':''}" style="width:${100*value/max}%"></span></span><span class="rate-number">${value.toFixed(2)}</span>${paired?'':`<span class="rate-check">${chosen?'✓':''}</span>`}</div>`;
  let markup=paired?`<span></span><div class="rate-heading predicted-heading"><span>Predicted</span><span>${mathHTML(String.raw`u_t^\theta`)}</span></div><div class="rate-heading target-heading"><span>Target</span><span>${mathHTML(String.raw`u_t^\tau`)}</span></div>`:'';
  for(const r of rows){
    markup+=`<div class="rate-action">${mathHTML(`\\operatorname{AddChild}_{${actionName(r.parent)}}`)}</div>`+cell(r.rate,false,selected.includes(r.parent));
    if(paired)markup+=cell(r.target,true,r.parent===nextAction);
  }
  if(paired)markup+=`<div class="loss-comparison"><svg viewBox="0 0 240 40" aria-hidden="true"><path d="M 60 2 V 16 H 120" fill="none" stroke="${BLUEINK}" stroke-width="1.2"/><path d="M 180 2 V 16 H 120" fill="none" stroke="#ad5932" stroke-width="1.2"/><path d="M 120 16 V 36 M 115 30 L 120 36 L 125 30" fill="none" stroke="#929aa4" stroke-width="1.2"/></svg><div class="loss-box">${mathHTML(String.raw`\text{Loss }D(u_t^\tau,u_t^\theta)`)}</div></div>`;
  container.innerHTML=`<div class="rate-grid ${paired?'paired':''}">${markup}</div>`;
}
function candidateMarkup(nodes,positions,actions,{selected=[],after=false,candidateColor=BLUEINK}={}){
  let halos='',edges='',dots='',labels='';
  const byId=new Map(nodes.map(n=>[n.id,n]));
  for(const n of nodes){
    const [x,y]=positions[n.id];
    if(n.parent!==null){const [px,py]=positions[n.parent];edges+=line(px,py,x,y,INK,1.8);}
    dots+=circle(x,y,5.4,INK);
  }
  for(const a of actions){
    const [px,py]=positions[a.parent],[x,y]=a.point,chosen=selected.includes(a.parent);
    if(after&&!chosen)continue;
    if(after){
      const len=Math.hypot(x-px,y-py),trim=byId.get(a.parent).parent===null?10:0;
      halos+=line(px+(x-px)*trim/len,py+(y-py)*trim/len,x,y,BLUE,12)+circle(x,y,12,BLUE);
      edges+=line(px,py,x,y,INK,1.8);dots+=circle(x,y,5.4,INK);
    }else{
      edges+=line(px,py,x,y,candidateColor,chosen?3:1.2,chosen?'':'stroke-dasharray="3 4" opacity=".6"');
      dots+=circle(x,y,5,'white',`stroke="${candidateColor}" stroke-width="1.4"`);
      const dx=x-px,dy=y-py,len=Math.hypot(dx,dy),mx=(px+x)/2,my=(py+y)/2;
      const distance=(q,p,r)=>{const vx=r[0]-p[0],vy=r[1]-p[1],u=Math.max(0,Math.min(1,((q[0]-p[0])*vx+(q[1]-p[1])*vy)/(vx*vx+vy*vy||1)));return Math.hypot(q[0]-p[0]-u*vx,q[1]-p[1]-u*vy);};
      const candidates=[-1,1].map(sign=>[mx+sign*dy/len*13,my-sign*dx/len*13]);
      const obstacles=nodes.filter(n=>n.parent!==null).map(n=>[positions[n.parent],positions[n.id]]).concat(actions.filter(b=>b!==a).map(b=>[positions[b.parent],b.point]));
      const clearance=p=>Math.min(100,...obstacles.map(([u,v])=>distance(p,u,v)));
      const [xx,yy]=candidates.sort((a,b)=>clearance(b)-clearance(a))[0];
      labels+=circle(xx,yy,8,'white')+text(xx,yy+3.5,actionName(a.parent),candidateColor,10);
    }
  }
  return halos+edges+dots+labels;
}
// A small illustrative collection of distinct target shapes; other figures
// keep their original tree. The source distribution is a single root.
const trainingTrees=[tree,
  [[160,25,null],[160,100,0],[90,175,1],[230,175,1],[50,250,2],[130,250,2],[230,250,3]],
  [[160,25,null],[160,100,0],[160,175,1],[90,250,2],[230,250,2],[90,325,3],[230,325,4]],
  [[160,25,null],[90,100,0],[230,100,0],[90,175,1],[190,175,2],[270,175,2],[90,250,3]],
  [[160,25,null],[90,100,0],[230,100,0],[90,175,1],[230,175,2],[90,250,3],[90,325,5]]
];
let trainingTargetIndex=0,trainingTree=trainingTrees[0];
let trainingChildren=trainingTree.map(()=>[]);
function sampleTrainingOrder(){
  trainingChildren=trainingTree.map(()=>[]);
  trainingTree.forEach((node,i)=>{if(i)trainingChildren[node[2]].push(i);});
  const subtree=i=>1+trainingChildren[i].reduce((sum,j)=>sum+subtree(j),0);
  const seen=new Set([0]),order=[];
  while(order.length<trainingTree.length-1){
    const available=trainingTree.map((_,i)=>i).filter(i=>i&&!seen.has(i)&&seen.has(trainingTree[i][2]));
    let pick=Math.random()*available.reduce((sum,i)=>sum+subtree(i),0),chosen=available[available.length-1];
    for(const i of available){pick-=subtree(i);if(pick<0){chosen=i;break;}}
    order.push(chosen);seen.add(chosen);
  }
  return order;
}
function drawTrainingTree(svg,present,highlight=null){
  const height=Math.max(...trainingTree.map(n=>n[1]))+35;
  svgSetup(svg,320,height);
  let edges='',nodes='';
  for(const i of present){
    const [x,y,parent]=trainingTree[i];
    const color=i===highlight?'#ad5932':INK;
    if(parent!==null){const [px,py]=trainingTree[parent];edges+=line(px,py,x,y,color,i===highlight?4.5:3.3);}
    nodes+=circle(x,y,7.3,color);
  }
  svg.innerHTML=edges+nodes;
}
let trainingTime=.38,trainingK=2,trainingOrder=sampleTrainingOrder();
function drawTraining(){
  const ids=[0,...trainingOrder.slice(0,trainingK)].sort((a,b)=>a-b),seen=new Set(ids);
  const next=trainingK<6?ids.indexOf(trainingTree[trainingOrder[trainingK]][2]):null;
  const row=$('training-trajectory');row.innerHTML='';
  for(let k=0;k<=trainingOrder.length;k++){
    if(k){
      const arrow=actionArrow();
      if(k===trainingK+1){
        arrow.className+=' training-next-action';
        const label=document.createElement('span');label.className='arrow-label';
        setMath(label,`\\operatorname{AddChild}_{${actionName(next)}}`);arrow.append(label);
        arrow.setAttribute('aria-label',`Next action: AddChild ${actionName(next)}. Matches the highlighted target rate.`);
      }
      row.append(arrow);
    }
    const svg=makeSVG(`Training trajectory state ${k}${k===trainingK?', selected':''}`);
    drawTrainingTree(svg,new Set([0,...trainingOrder.slice(0,k)]),k===trainingK+1?trainingOrder[k-1]:null);
    const f=stateFigure(svg);if(k===trainingK)f.className+=' chosen';
    const caption=document.createElement('figcaption');caption.className='training-state-label';
    if(k===trainingK)setMath(caption,`s_${k}`);
    else if(k===0||k===trainingOrder.length)setMath(caption,k===0?'s_I':'s_F');
    f.append(caption);row.append(f);
  }
  $('training-draw').innerHTML=`<span class="sample-time">${mathHTML(`t\\sim\\mathcal U(0,1)\\;\\longrightarrow\\;${trainingTime.toFixed(2)}`)}</span><span class="sample-distribution">${mathHTML(`K_t\\sim\\operatorname{Binomial}(6,t)\\;\\longrightarrow\\; k=${trainingK}`)}</span>`;
  setMath($('training-time'),`s_{${trainingK}},\\quad t=${trainingTime.toFixed(2)}`);
  // Use local indices for the model. The mapping preserves which existing
  // parent an AddChild action acts on, including parents absent from the target's frontier.
  const nodes=ids.map((id,i)=>({id:i,parent:id===0?null:ids.indexOf(trainingTree[id][2])}));
  const positions=ids.map(id=>trainingTree[id].slice(0,2));
  const actions=nodes.map(n=>{
    const original=ids[n.id],missing=trainingChildren[original].find(j=>!seen.has(j));
    let point;
    if(missing!==undefined)point=trainingTree[missing].slice(0,2);
    else{
      const [x,y]=positions[n.id],count=nodes.filter(v=>v.parent===n.id).length;
      // With two existing branches, show the extra action between them.
      point=[x+(count===1?32:0),y+75];
    }
    return {parent:n.id,point};
  });
  const rows=illustrativeRates(nodes,trainingTime).map(r=>({...r,target:r.parent===next?(6-trainingK)/(1-trainingTime):0}));
  svgSetup($('training-state'),320,Math.max(220,...actions.map(a=>a.point[1]+25)));
  $('training-state').innerHTML=candidateMarkup(nodes,positions,actions,{candidateColor:'#9299a3'});
  rateBars($('training-rates'),rows,{paired:true,nextAction:next});
  $('training-rates').setAttribute('aria-label',`Model and target rates. ${next===null?'All target rates are zero.':`Only AddChild ${actionName(next)} has positive target rate ${(6-trainingK)/(1-trainingTime)}.`}`);
}
$('training-sample').onclick=()=>{
  trainingTargetIndex=(trainingTargetIndex+1+Math.floor(Math.random()*(trainingTrees.length-1)))%trainingTrees.length;
  trainingTree=trainingTrees[trainingTargetIndex];
  trainingOrder=sampleTrainingOrder();
  trainingTime=Math.floor(Math.random()*100)/100;trainingK=Array.from({length:6},()=>Math.random()<trainingTime).filter(Boolean).length;drawTraining();
};
drawTraining();

const generationStepSize=.2,generationSteps=Math.round(1/generationStepSize);

// 8. Euler sampling from a root. Available actions are AddChild(parent) for
// every existing parent, not a preselected set of edges in a target tree.
function seededRandom(seed){let n=seed>>>0;return ()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
function generationRollout(seed){
  const random=seededRandom(seed),frames=[];let nodes=[{id:0,parent:null}];
  for(let step=0;step<generationSteps;step++){
    const t=step*generationStepSize,rates=illustrativeRates(nodes,t);
    const selected=rates.filter(r=>random()<Math.min(generationStepSize*r.rate,1)).map(r=>r.parent);
    const next=nodes.map(n=>({...n}));
    for(const parent of selected)next.push({id:next.length,parent});
    frames.push({t,nodes: nodes.map(n=>({...n})),rates,selected,next});nodes=next;
  }
  return frames;
}
// Select a reproducible draft example containing a parallel update. Sampling
// itself is unchanged; this only picks an illustrative seed for the first view.
let initialSeed=1,generationFrames;
for(;initialSeed<2000;initialSeed++){
  generationFrames=generationRollout(initialSeed);
  if(generationFrames[0].selected.length&&generationFrames[generationSteps-1].next.length>=6&&generationFrames[generationSteps-1].next.length<=10&&generationFrames.some(f=>f.selected.filter(i=>i!==0).length>=2))break;
}
let generationIndex=0,generationPlaying=false,generationElapsed=0;
function generationLayout(nodes,withCandidates=true){
  const virtual=nodes.map(n=>({...n})),actions=[];
  if(withCandidates)for(const n of nodes){actions.push({parent:n.id,id:virtual.length});virtual.push({id:virtual.length,parent:n.id});}
  const kids=virtual.map(()=>[]);virtual.forEach(n=>{if(n.parent!==null)kids[n.parent].push(n.id);});
  const widths=[];const measure=i=>widths[i]=Math.max(1,kids[i].reduce((s,c)=>s+measure(c),0));measure(0);
  const raw=[];const place=(i,left,depth)=>{
    raw[i]=[left+widths[i]/2,depth];let x=left;
    kids[i].forEach(c=>{place(c,x,depth+1);x+=widths[c];});
    if(kids[i].length)raw[i][0]=(raw[kids[i][0]][0]+raw[kids[i][kids[i].length-1]][0])/2;
  };place(0,0,0);
  const maxDepth=Math.max(...raw.map(p=>p[1])),minX=Math.min(...raw.map(p=>p[0])),maxX=Math.max(...raw.map(p=>p[0]));
  const sx=Math.min(70,260/Math.max(1,maxX-minX)),sy=Math.min(65,255/Math.max(1,maxDepth));
  const positions=raw.map(([x,y])=>[160+(x-(minX+maxX)/2)*sx,25+y*sy]);
  return {positions,actions:actions.map(a=>({...a,point:positions[a.id]}))};
}
function drawGeneration(){
  const f=generationFrames[Math.min(generationSteps-1,generationIndex)],done=generationIndex===generationSteps;
  $('generation-layout').classList.toggle('complete',done);
  setMath($('generation-time'),done?'t=1':`t=${f.t.toFixed(2)}\\;\\longrightarrow\\;${(f.t+generationStepSize).toFixed(2)}`);
  $('generation-progress').innerHTML=`<span style="width:${generationIndex/generationSteps*100}%"></span>`;
  svgSetup($('generation-before'),320,310);svgSetup($('generation-after'),320,310);
  const {positions,actions}=generationLayout(f.nodes);
  $('generation-before').innerHTML=candidateMarkup(f.nodes,positions,actions,{selected:f.selected});
  $('generation-after').innerHTML=candidateMarkup(f.nodes,positions,actions,{selected:f.selected,after:true});
  rateBars($('generation-rates'),f.rates,{selected:f.selected});
  $('generation-selection').textContent=f.selected.length===0?'No action sampled':f.selected.length===1?'✓ 1 action sampled':`✓ ${f.selected.length} actions sampled together`;
  $('generation-after-title').textContent=done?'Generated tree':'Next state';
  if(done){const finalLayout=generationLayout(f.next,false);$('generation-after').innerHTML=candidateMarkup(f.next,finalLayout.positions,[]);}
  $('generation-play').textContent=generationPlaying?'Pause':done?'Replay':'Play';
  $('generation-step').disabled=done;
  $('generation-after').setAttribute('aria-label',`Tree after this Euler step: ${f.next.length} nodes. ${f.selected.length} sampled additions.`);
}
$('generation-play').onclick=()=>{
  if(generationIndex===generationSteps)generationIndex=0;
  generationElapsed=0;generationPlaying=!generationPlaying;drawGeneration();
};
$('generation-step').onclick=()=>{generationPlaying=false;generationIndex=Math.min(generationSteps,generationIndex+1);generationElapsed=0;drawGeneration();};
$('generation-resample').onclick=()=>{
  generationFrames=generationRollout(Math.floor(Math.random()*4294967296));generationIndex=0;generationPlaying=false;generationElapsed=0;drawGeneration();
};
function tickGeneration(delta){
  if(!generationPlaying)return;
  generationElapsed+=delta;
  const duration=generationIndex<3?2600:1300;
  if(generationElapsed>=duration){generationElapsed=0;generationIndex++;if(generationIndex>=generationSteps){generationIndex=generationSteps;generationPlaying=false;}drawGeneration();}
}
drawGeneration();

const onScreen=new Set();
const observer=new IntersectionObserver(entries=>entries.forEach(e=>e.isIntersecting?onScreen.add(e.target.id):onScreen.delete(e.target.id)),{threshold:.05});
['v1','v6','v8'].forEach(id=>{if($(id))observer.observe($(id));});
let last=performance.now();
function tick(now){
  const delta=document.hidden?0:Math.min(now-last,80);last=now;
  if(openerPlayers.length&&openerPlaying&&onScreen.has('v1')){openerTime=(openerTime+delta)%13000;drawOpener();}
  if(flowPlaying&&onScreen.has('v6')){flowTime=Math.min(1,flowTime+delta/9000);if(flowTime===1)flowPlaying=false;drawFlow();}
  if(onScreen.has('v8'))tickGeneration(delta);
  requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange',()=>{last=performance.now();});
if($('opener'))initOpener();
requestAnimationFrame(tick);
