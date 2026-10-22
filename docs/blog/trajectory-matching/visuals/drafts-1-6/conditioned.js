/* AtomGrow conditioned on a supplied substructure or pair of substructures. */
(() => {
  const figure = document.getElementById('v10');
  if (!figure || !window.conditionedFrames) return;
  const play = document.getElementById('conditioned-play');
  const replay = document.getElementById('conditioned-replay');
  const scrub = document.getElementById('conditioned-progress');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startHold = 1200, growth = 10000, finalHold = 3000;
  const duration = startHold + growth + finalHold;
  let elapsed = reduced ? duration : 0, playing = !reduced, visible = false, last = null;
  const panels = window.conditionedFrames.map(sample => {
    document.getElementById(`conditioned-source-${sample.name}`).innerHTML = `<svg viewBox="${sample.initialViewBox}" aria-hidden="true">${sample.initialInk}</svg>`;
    const host = document.getElementById(`conditioned-${sample.name}`);
    const layers = [document.createElement('div'), document.createElement('div')];
    layers.forEach(layer => { layer.className = 'molecular-frame'; host.appendChild(layer); });
    return {sample, host, layers, index: -1, layer: 0};
  });
  function render(instant = false) {
    const fraction = Math.max(0, Math.min(1, (elapsed - startHold) / growth));
    panels.forEach(panel => {
      const frames = panel.sample.frames;
      const index = fraction >= 1 ? frames.length - 1 : Math.floor(fraction * (frames.length - 1));
      if (index === panel.index) return;
      const frame = frames[index], next = 1 - panel.layer;
      panel.layers[next].innerHTML = `<svg viewBox="0 0 960 480" aria-hidden="true"><g opacity="0.7">${frame.generated}</g>${frame.ink}</svg>`;
      panel.layers.forEach((layer, i) => {
        layer.style.transitionDuration = instant || reduced ? '0ms' : '180ms';
        layer.style.opacity = i === next ? '1' : '0';
      });
      panel.host.setAttribute('aria-label', `${panel.sample.name}: ${index === 0 ? 'supplied starting structure' : index === frames.length - 1 ? 'completed molecule' : `state ${index}`}. Generated additions highlighted blue.`);
      panel.index = index; panel.layer = next;
    });
    scrub.value = String(Math.round(elapsed / duration * 1000));
    play.textContent = playing ? 'Pause' : 'Play';
  }
  function tick(now) {
    if (last !== null && visible && playing && !document.hidden) {
      elapsed += Math.min(now - last, 100);
      if (elapsed > duration) elapsed = 0;
      render();
    }
    last = now;
    requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => {
    if (!playing && elapsed >= duration) elapsed = 0;
    playing = !playing; render();
  });
  replay.addEventListener('click', () => { elapsed = 0; playing = true; render(true); });
  scrub.addEventListener('input', () => { elapsed = Number(scrub.value) / 1000 * duration; playing = false; render(true); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; last = null; }, {threshold: 0.15}).observe(figure);
  render(true);
  requestAnimationFrame(tick);
})();
