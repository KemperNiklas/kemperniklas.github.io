'use strict';
(() => {
const $=id=>document.getElementById(id);
const BLUEINK='#50729f', INK='#17191d', GHOST='#d4d8de';
// The same teaching hierarchy as the fixed-order example. Here the node set
// is fixed: each undirected adjacency entry is an independent component.
const tree=[[165,25,null],[90,100,0],[240,100,0],[50,175,1],[130,175,1],[130,250,4],[240,175,2]];
const targetEdges=tree.slice(1).map(([x,y,parent],i)=>[parent,i+1]);
// As in Figure 1: keep a subset of target edges and add noisy same-level edges.
const edges=[...targetEdges,[1,2],[3,4]];
const sourceState=edges.map((_,i)=>i<6?i%3===0:true);
const targetState=edges.map((_,i)=>i<6);
const edits=edges.map((edge,i)=>({edge,index:i,add:targetState[i]})).filter(edit=>sourceState[edit.index]!==targetState[edit.index]);
// These times belong to edge identities, not positions in a sorted sequence.
let eventTimes=[.56,.16,.83,.69,.28,.92];
let flowTime=.38,dragging=null;
const line=(x1,y1,x2,y2,color=INK,width=1.8,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
const circle=(x,y,r,fill=INK,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const text=(x,y,s,color=INK,size=13)=>`<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" text-anchor="middle">${s}</text>`;
function flowState(t=flowTime,times=eventTimes) {
 const present=[...sourceState];let k=0;
 edits.forEach((edit,i)=>{if(times[i]<=t){present[edit.index]=edit.add;k++;}});
 return {present,k};
}
function drawGraph(svg,present) {
 svg.setAttribute('viewBox','15 0 270 280');
 let ink='';
 // Show absent adjacency entries faintly, as in the opening figure.
 for(let a=0;a<tree.length;a++)for(let b=a+1;b<tree.length;b++){
  const index=edges.findIndex(([u,v])=>u===a&&v===b);
  if(index<0||!present[index])ink+=line(...tree[a].slice(0,2),...tree[b].slice(0,2),'#eceef0',1);
 }
 edges.forEach(([a,b],i)=>{
  if(present[i])ink+=line(...tree[a].slice(0,2),...tree[b].slice(0,2));
 });
 for(const [x,y] of tree)ink+=circle(x,y,5.4);
 svg.innerHTML=ink;
}
function drawTimeline(k) {
 const svg=$('factorized-timeline'),w=Math.max(280,svg.getBoundingClientRect().width),left=32,right=w-32,y=30;
 svg.setAttribute('viewBox',`0 0 ${w} 86`);const x=t=>left+t*(right-left);
 let s=`<rect width="${w}" height="86" fill="transparent"/>`;
 s+=line(left,y,right,y,GHOST,2)+line(left,y,x(flowTime),y,BLUEINK,2);
 s+=line(left,y-6,left,y+6,INK,1)+line(right,y-6,right,y+6,INK,1);
 s+=text(left,y-16,'0')+text(right,y-16,'1');
 eventTimes.forEach(t=>{
  s+=circle(x(t),y,3.5,t<=flowTime?BLUEINK:'white',`stroke="${BLUEINK}" stroke-width="1.2"`);
 });
 s+=line(x(flowTime),y-9,x(flowTime),y+9,INK,1.3)+circle(x(flowTime),y,6,'white',`stroke="${INK}" stroke-width="1.5"`);
 s+=svgMath(w/2,70,`t = ${flowTime.toFixed(2)}`,INK,13);
 svg.innerHTML=s;svg.setAttribute('aria-valuenow',flowTime.toFixed(3));
 svg.setAttribute('aria-valuetext',`Time ${flowTime.toFixed(3)}; ${k} of ${edits.length} edits complete`);
}
function draw() {
 const {present,k}=flowState();
 drawGraph($('factorized-current'),present);drawTimeline(k);
 $('factorized-current').setAttribute('aria-label',`Sampled graph at time ${flowTime.toFixed(2)}: seven fixed nodes and ${present.filter(Boolean).length} edges. ${k} of ${edits.length} edits complete.`);
}
$('factorized-resample').onclick=()=>{eventTimes=edits.map(()=>Math.max(Number.EPSILON,Math.random()));draw();};
const timeline=$('factorized-timeline');
function scrub(event){
 const rect=timeline.getBoundingClientRect(),w=Math.max(280,rect.width);
 flowTime=Math.max(0,Math.min(1,((event.clientX-rect.left)/rect.width*w-32)/(w-64)));draw();
}
timeline.onpointerdown=event=>{
 if(event.button!==0&&event.button!==undefined)return;
 event.preventDefault();dragging=event.pointerId;timeline.setPointerCapture(event.pointerId);scrub(event);
};
timeline.onpointermove=event=>{if(dragging===event.pointerId)scrub(event);};
timeline.onpointerup=event=>{
 if(dragging!==event.pointerId)return;scrub(event);
 if(timeline.hasPointerCapture(event.pointerId))timeline.releasePointerCapture(event.pointerId);dragging=null;
};
timeline.onpointercancel=timeline.onlostpointercapture=()=>{dragging=null;};
timeline.onkeydown=event=>{
 if(!['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(event.key))return;
 event.preventDefault();const increment=event.shiftKey?.1:.01;
 flowTime=event.key==='Home'?0:event.key==='End'?1:Math.max(0,Math.min(1,flowTime+(['ArrowRight','ArrowUp'].includes(event.key)?increment:-increment)));draw();
};
drawGraph($('factorized-source'),sourceState);drawGraph($('factorized-target'),targetState);
new ResizeObserver(()=>drawTimeline(flowState().k)).observe(timeline);draw();
})();
