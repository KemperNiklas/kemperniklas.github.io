'use strict';
(() => {
  document.documentElement.classList.toggle('embedded',new URLSearchParams(location.search).has('embed'));
  const $ = id => document.getElementById(id);
  const ink = '#202630', highlight = '#b7d5ec';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let progress = reduced ? 1 : 0, playing = !reduced, last = null, lastFrame = '', visible = true, example = 0;
  let domain = 'molecules';
  const line = (a,b,color=ink,width=2.3,extra='') => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
  const dot = (p,r=5.5,color=ink) => `<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="${color}"/>`;
  const svg = (content,viewBox='0 0 420 260') => `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${content}</svg>`;
  const edgeKey = ([a,b]) => [a,b].sort((x,y)=>x-y).join('-');
  function absentEdges(nodes,edges){
    const existing=new Set(edges.map(edgeKey));
    let drawing='';
    for(let a=0;a<nodes.length;a++){
      for(let b=a+1;b<nodes.length;b++){
        if(!existing.has(edgeKey([a,b])))drawing+=line(nodes[a],nodes[b],'#eceef0',1,'class="absent-edge"');
      }
    }
    return drawing;
  }
  const setPanel = (id,content,status) => {
    const host=$(id+'-stage');host.innerHTML=content;host.setAttribute('aria-label',status);
  };

  // Distinct illustrative targets for the structured and factorized rows.
  const parentSets = [
    [-1,0,0,0,1,1,2,3,3,4,5,5,6,8,8,10,12,12,14],
    [-1,0,0,1,1,1,2,2,3,4,6,6,7,8,10,10,12,12]
  ];
  function makeTree(parents){
    const children=parents.map(()=>[]),depth=parents.map(()=>0),nodes=parents.map(()=>null);
    parents.forEach((p,i)=>{if(p>=0){children[p].push(i);depth[i]=depth[p]+1;}});
    let leaf=0;
    function place(i){
      const x=children[i].length?children[i].map(place).reduce((a,b)=>a+b)/children[i].length:leaf++;
      nodes[i]=[x,depth[i]];return x;
    }
    place(0);
    const maxDepth=Math.max(...depth);
    nodes.forEach(p=>{p[0]=25+p[0]/(leaf-1)*370;p[1]=18+p[1]/maxDepth*222;});
    const target=parents.slice(1).map((p,i)=>[p,i+1]);
    const targetKeys=new Set(target.map(edgeKey));
    const extras=[];
    // A few noisy same-level edges, distinct from the target adjacency entries.
    for(let a=1;a<parents.length&&extras.length<3;a++){
      for(let b=a+1;b<parents.length&&extras.length<3;b++){
        if(depth[a]===depth[b]&&!targetKeys.has(edgeKey([a,b])))extras.push([a,b]);
      }
    }
    const initial=[...target.filter((_,i)=>i%3===0),...extras];
    const missing=target.filter((_,i)=>i%3!==0);
    const operations=[];
    for(let i=0;i<Math.max(extras.length,missing.length);i++){
      if(i<extras.length)operations.push(['remove',extras[i]]);
      if(i<missing.length)operations.push(['add',missing[i]]);
    }
    const edgeBatches=[],widths=[1,1,2,1,1];
    for(let i=0;i<operations.length;){
      const count=widths[edgeBatches.length%widths.length];
      edgeBatches.push(operations.slice(i,i+count));i+=count;
    }
    const growthBatches=[],present=new Set([0]),sizes=[1,1,2,1,1];
    while(present.size<parents.length){
      // Availability is checked BEFORE the batch: newly added children cannot
      // act as attachment sites until the next sampling step.
      const available=parents.map((_,i)=>i).filter(i=>!present.has(i)&&present.has(parents[i]));
      const batch=[],attachmentSites=new Set();
      const count=sizes[growthBatches.length%sizes.length];
      for(const child of available){
        if(attachmentSites.has(parents[child]))continue;
        batch.push(child);attachmentSites.add(parents[child]);
        if(batch.length===count)break;
      }
      if(!batch.length)throw new Error('No valid growth action');
      growthBatches.push(batch);batch.forEach(i=>present.add(i));
    }
    return {parents,nodes,target,initial,growthBatches,edgeBatches};
  }
  const trees=parentSets.map(makeTree);
  function treeState(tree,kind,index){
    let present,edges,changed,added=[];
    if(kind==='growth'){
      present=[0,...tree.growthBatches.slice(0,index).flat()];
      edges=present.slice(1).map(i=>[tree.parents[i],i]);
      added=index?tree.growthBatches[index-1]:[];
      changed=added.map(i=>[tree.parents[i],i]);
    }else{
      present=tree.nodes.map((_,i)=>i);
      const existing=new Map(tree.initial.map(e=>[edgeKey(e),e]));
      tree.edgeBatches.slice(0,index).flat().forEach(([op,e])=>{
        if(op==='add')existing.set(edgeKey(e),e);else existing.delete(edgeKey(e));
      });
      edges=[...existing.values()];
      changed=index?tree.edgeBatches[index-1].map(([,e])=>e):[];
    }
    return {present,edges,changed,added};
  }
  function sequenceTree(tree,kind,index){
    const state=treeState(tree,kind,index),{present,edges,changed,added}=state;
    const background=kind==='edge'?absentEdges(tree.nodes,edges):'';
    let halo='',drawing='';
    changed.forEach(([a,b])=>halo+=line(tree.nodes[a],tree.nodes[b],highlight,11));
    added.forEach(i=>halo+=dot(tree.nodes[i],10,highlight));
    edges.forEach(([a,b])=>drawing+=line(tree.nodes[a],tree.nodes[b],ink,1.8));
    present.forEach(i=>drawing+=dot(tree.nodes[i],4.6));
    const status=index?`${changed.length} ${kind==='growth'?'child additions':'edge edits'} in this sampling step`:'Initial state';
    return {image:svg(halo+background+drawing),status:`${status}. ${present.length} nodes.`};
  }

  const samples=Object.fromEntries(window.actionSpaceFrames.map(s=>[s.name,s]));
  // Preserve recorded sampler-step groups, then occasionally combine neighboring
  // single-action groups for display. Display grouping does not imply that the
  // recorded actions occurred simultaneously.
  function groupFrames(frames){
    const groups=[];
    frames.forEach((f,i)=>{
      const previous=groups[groups.length-1];
      if(f.action&&previous&&previous.step===f.step&&previous.actionCount){
        previous.indices.push(i);previous.actionCount++;
      }else groups.push({step:f.step,indices:[i],actionCount:f.action?1:0});
    });
    const condensed=[];
    for(let i=0;i<groups.length;i++){
      const current=groups[i],next=groups[i+1];
      if(condensed.length%5===3&&current.actionCount===1&&next?.actionCount===1){
        condensed.push({step:current.step,indices:[...current.indices,...next.indices],actionCount:2});
        i++;
      }else condensed.push(current);
    }
    return condensed;
  }
  const groups={FragGrow:groupFrames(samples.FragGrow.frames),BondEdit:groupFrames(samples.BondEdit.frames)};
  function repairBondPaths(drawing,index){
    const corrections=window.bondPairFrames[index].pathCorrections||{};
    return drawing.replace(/\bd=(['"])(.*?)\1/g,(attribute,quote,path)=>
      Object.hasOwn(corrections,path)?`d=${quote}${corrections[path]}${quote}`:attribute);
  }
  function recorded(name,index){
    const sample=samples[name],group=groups[name][index];
    const first=group.indices[0],end=group.indices[group.indices.length-1],frame=sample.frames[end];
    const pairs=name==='BondEdit'?window.bondPairFrames[end]:null;
    let halo=group.indices.map(i=>name==='BondEdit'?repairBondPaths(sample.frames[i].halo,i):sample.frames[i].halo).join('');
    const ink=pairs?repairBondPaths(frame.ink,end):frame.ink;
    if(pairs&&first>0&&group.actionCount){
      const current=new Set(pairs.edges.map(edgeKey));
      window.bondPairFrames[first-1].edges.filter(e=>!current.has(edgeKey(e))).forEach(([a,b])=>{
        halo+=line(pairs.nodes[a],pairs.nodes[b],highlight,13);
      });
    }
    const background=pairs?absentEdges(pairs.nodes,pairs.edges):'';
    const status=index===0?'Initial molecule':index===groups[name].length-1?'Final molecule':`${group.actionCount} molecular updates shown together`;
    return {image:svg(halo+background+ink,'0 0 960 480'),status};
  }
  function draw(force=false){
    const fraction=Math.max(0,Math.min(1,(progress-.05)/.81));
    const index=count=>Math.min(count-1,Math.floor(fraction*count));
    const growthTree=trees[example],edgeTree=trees[(example+1)%trees.length];
    const fi=index(groups.FragGrow.length),bi=index(groups.BondEdit.length);
    const gi=index(growthTree.growthBatches.length+1),ei=index(edgeTree.edgeBatches.length+1);
    const key=[domain,example,fi,bi,gi,ei].join(':');
    if(force||key!==lastFrame){
      const structured=domain==='molecules'?recorded('FragGrow',fi):sequenceTree(growthTree,'growth',gi);
      const component=domain==='molecules'?recorded('BondEdit',bi):sequenceTree(edgeTree,'edge',ei);
      setPanel('structured',structured.image,structured.status);
      setPanel('component',component.image,component.status);
      lastFrame=key;
    }
    $('progress').value=String(Math.round(progress*1000));
    $('progress').setAttribute('aria-valuetext',`${Math.round(fraction*100)}% of sequence`);
    $('play').textContent=playing?'Pause':'Play';
  }
  function nextExample(){example=(example+1)%trees.length;progress=0;last=null;}
  $('domain').onchange=e=>{
    domain=e.target.value;progress=0;last=null;
    draw(true);
  };
  $('play').onclick=()=>{if(progress>=1)nextExample();playing=!playing;last=null;draw();};
  $('restart').onclick=()=>{nextExample();playing=!reduced;draw(true);};
  $('progress').oninput=e=>{progress=Number(e.target.value)/1000;playing=false;draw();};
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=null;}).observe($('comparison'));
  function tick(now){
    if(last!==null&&playing&&visible&&!document.hidden){
      progress+=Math.min(100,now-last)/22000;
      if(progress>=1)nextExample();
      draw();
    }
    last=now;requestAnimationFrame(tick);
  }
  draw(true);requestAnimationFrame(tick);
})();
