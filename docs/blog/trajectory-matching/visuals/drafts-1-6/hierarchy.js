/* The recorded empirical-results sample has independent playback. */
(() => {
  const figure = document.getElementById('results-growth');
  if (!figure || !window.hierarchyFrames) return;
  const data = window.hierarchyFrames, host = document.getElementById('results-hierarchy');
  const play = document.getElementById('hierarchy-play'), replay = document.getElementById('hierarchy-replay');
  const scrub = document.getElementById('hierarchy-progress');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startHold = 1000, growth = 14000, duration = startHold + growth + 3000;
  let elapsed = reduced ? duration : 0, playing = !reduced, visible = false, last = null, index = -1, layer = 0;
  const layers = [document.createElement('div'), document.createElement('div')];
  layers.forEach(el => { el.className = 'molecular-frame'; host.appendChild(el); });
  function drawing(frame, previous, final) {
    const oldNodes = new Set(previous.nodes), oldEdges = new Set(previous.edges.map(e => e.join(',')));
    let halo = '', edges = '', nodes = '';
    const edge = (a, b, color, width) => {
      const [x1,y1] = data.positions[a], [x2,y2] = data.positions[b];
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
    };
    for (const e of frame.edges) {
      edges += edge(...e, '#17191d', 2.2);
      if (!final && !oldEdges.has(e.join(','))) {
        // Trim the halo at the existing parent so the root stays unmarked.
        const [px,py] = data.positions[e[0]], [x,y] = data.positions[e[1]];
        const length = Math.hypot(x-px,y-py), trim = Math.min(11,length/2);
        halo += `<line x1="${px+(x-px)*trim/length}" y1="${py+(y-py)*trim/length}" x2="${x}" y2="${y}" stroke="#b7cbea" stroke-width="13" stroke-linecap="round"/>`;
      }
    }
    for (const n of frame.nodes) {
      const [x,y] = data.positions[n];
      if (!final && !oldNodes.has(n)) halo += `<circle cx="${x}" cy="${y}" r="11" fill="#b7cbea"/>`;
      nodes += `<circle cx="${x}" cy="${y}" r="5" fill="#17191d"/>`;
    }
    return `<svg viewBox="${data.viewBox}" aria-hidden="true"><g class="molecular-halo">${halo}</g>${edges}${nodes}</svg>`;
  }
  function render(instant = false) {
    const fraction = Math.max(0, Math.min(1, (elapsed - startHold) / growth));
    // The extra final index removes the last action highlight for the hold.
    const nextIndex = Math.min(data.frames.length, Math.floor(fraction * data.frames.length));
    if (nextIndex !== index) {
      const i = Math.min(data.frames.length - 1, nextIndex), next = 1 - layer;
      layers[next].innerHTML = drawing(data.frames[i], data.frames[Math.max(0, i-1)], nextIndex === data.frames.length);
      layers.forEach((el,k) => { el.style.transitionDuration = instant || reduced ? '0ms' : '150ms'; el.style.opacity = k === next ? '1' : '0'; });
      const count = data.frames[i].nodes.length;
      host.setAttribute('aria-label', `GrowHierarchy generated tree: ${count} ${count === 1 ? 'node' : 'nodes'}.`);
      index = nextIndex; layer = next;
    }
    play.textContent = playing ? 'Pause' : 'Play';
    scrub.value = String(Math.round(elapsed / duration * 1000));
    figure.classList.toggle('molecular-paused', !playing);
  }
  function tick(now) {
    if (last !== null && visible && playing && !document.hidden) {
      elapsed += Math.min(now-last,100);
      if (elapsed > duration) elapsed = 0;
      render();
    }
    last = now; requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => { if (!playing && elapsed >= duration) elapsed = 0; playing = !playing; render(); });
  replay.addEventListener('click', () => { elapsed = 0; playing = true; render(true); });
  scrub.addEventListener('input', () => { elapsed = Number(scrub.value)/1000*duration; playing = false; render(true); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; last = null; }, {threshold:0.15}).observe(figure);
  render(true); requestAnimationFrame(tick);
})();
