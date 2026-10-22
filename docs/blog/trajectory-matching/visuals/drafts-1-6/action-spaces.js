/* Recorded molecular trajectories, shown with a shared display clock. */
(() => {
  const figure = document.getElementById('v9');
  if (!figure || !window.actionSpaceFrames) return;
  const play = document.getElementById('action-spaces-play');
  const replay = document.getElementById('action-spaces-replay');
  const scrub = document.getElementById('action-spaces-progress');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startHold = 900, growth = 16000, finalHold = 3200;
  const duration = startHold + growth + finalHold;
  let elapsed = reduced ? duration : 0, playing = !reduced, visible = false, last = null;
  const panels = window.actionSpaceFrames.map(sample => {
    const host = document.getElementById(`action-space-${sample.name}`);
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
      const frame = frames[index];
      const next = 1 - panel.layer;
      panel.layers[next].innerHTML = `<svg viewBox="0 0 960 480" aria-hidden="true"><g class="molecular-halo">${frame.halo}</g>${frame.ink}</svg>`;
      panel.layers.forEach((layer, i) => {
        layer.style.transitionDuration = instant || reduced ? '0ms' : '140ms';
        layer.style.opacity = i === next ? '1' : '0';
      });
      panel.host.setAttribute('aria-label', `${panel.sample.name}, ${index === 0 ? 'initial state' : index === frames.length - 1 ? 'final molecule' : frame.action}`);
      panel.host.closest('.action-space-panel').querySelectorAll('[data-action]').forEach(label => {
        label.classList.toggle('current-action', label.dataset.action === frame.action);
      });
      panel.index = index; panel.layer = next;
    });
    scrub.value = String(Math.round(elapsed / duration * 1000));
    play.textContent = playing ? 'Pause' : 'Play';
    figure.classList.toggle('molecular-paused', !playing);
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
