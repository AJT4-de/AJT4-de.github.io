// Extracted interaction logic from inline <script> in index.html
(function(){
  const scrollEl = document.getElementById('hscroll');
  const progressBar = document.getElementById('progressBar');
  const yearEl = document.getElementById('year');
  const brandLink = document.getElementById('brandLink');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- LIGHTWEIGHT HORIZONTAL SMOOTHING (wheel → horizontal) ----------
  let targetLeft = scrollEl.scrollLeft;  // desired x position
  let currentLeft = scrollEl.scrollLeft; // animated x position
  let rafId = null;
  const ease = 0.22;                     // smoothing factor (snappier, less jitter)

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const maxScroll = () => scrollEl.scrollWidth - scrollEl.clientWidth;

  function animate(){
    const delta = (targetLeft - currentLeft) * ease;
    if (Math.abs(delta) > 0.5) {
      currentLeft += delta;
      scrollEl.scrollLeft = currentLeft;
      setProgress();
      rafId = requestAnimationFrame(animate);
    } else {
      scrollEl.scrollLeft = targetLeft;
      currentLeft = targetLeft;
      setProgress();
      rafId = null;
    }
  }
  function requestTo(left){
    targetLeft = clamp(left, 0, maxScroll());
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  // Check if an inner element can scroll vertically in the event direction
  function verticalScrollableAncestor(start, deltaY){
    let el = start instanceof Element ? start : null;
    while (el && el !== scrollEl && el !== document.body) {
      const style = getComputedStyle(el);
      const canScrollY = el.scrollHeight > el.clientHeight && (/(auto|scroll)/).test(style.overflowY);
      if (canScrollY) {
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  // Wheel → horizontal; do not hijack if inner can scroll vertically
  scrollEl.addEventListener('wheel', (e) => {
    const { deltaX, deltaY } = e;
    if (verticalScrollableAncestor(e.target, deltaY)) return; // allow native vertical scroll inside panels
    const horiz = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    e.preventDefault();
    requestTo(scrollEl.scrollLeft + horiz);
  }, { passive: false });

  // Drag-to-scroll (with threshold and interactive skip)
  let isDown = false, isDragging = false, startX = 0, startLeft = 0, activePointer = null;
  const DRAG_THRESHOLD = 6; // pixels
  scrollEl.addEventListener('pointerdown', (e)=>{
    // On touch, use native scroll entirely to avoid fighting momentum
    if(e.pointerType === 'touch') return;
    // Skip drag when interacting with inputs/links/buttons
    if(e.target.closest('a, button, [role="button"], input, textarea, select, summary')) return;
    isDown = true; isDragging = false; activePointer = e.pointerId; startX = e.clientX; startLeft = scrollEl.scrollLeft; scrollEl.setPointerCapture(activePointer);
  });
  scrollEl.addEventListener('pointermove', (e)=>{
    if(e.pointerType === 'touch') return;
    if(!isDown) return;
    const dx = e.clientX - startX;
    if(!isDragging){ if(Math.abs(dx) < DRAG_THRESHOLD) return; isDragging = true; }
    requestTo(startLeft - dx);
  });
  const release = ()=>{ isDown = false; isDragging = false; if(activePointer!=null){ try{ scrollEl.releasePointerCapture(activePointer);}catch(_){} activePointer=null; } };
  scrollEl.addEventListener('pointerup', release);
  scrollEl.addEventListener('pointercancel', release);

  // Keyboard navigation
  window.addEventListener('keydown', (e)=>{
    if(['ArrowRight','PageDown'].includes(e.key)) { e.preventDefault(); goTo('next'); }
    if(['ArrowLeft','PageUp'].includes(e.key))   { e.preventDefault(); goTo('prev'); }
    if(e.key==='Home'){ e.preventDefault(); requestTo(0); }
    if(e.key==='End'){ e.preventDefault(); requestTo(maxScroll()); }
  });

  // Progress bar
  function setProgress(){
    const max = maxScroll();
    const pct = max > 0 ? (scrollEl.scrollLeft / max) * 100 : 0;
    progressBar.style.width = pct + '%';
  }
  scrollEl.addEventListener('scroll', setProgress, { passive: true });
  window.addEventListener('resize', ()=>{ requestTo(scrollEl.scrollLeft); setProgress(); });
  setProgress();

  // Active panel + nav highlight + arrow hide at ends
  const panels = [...document.querySelectorAll('.panel')];
  const navLinks = [...document.querySelectorAll('nav a, #mobileMenu a')];
  const idToLink = Object.fromEntries(navLinks.map(a => [a.getAttribute('data-target'), a]));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  function updateArrows(idx){
    if(!prevBtn || !nextBtn) return;
    // hide left arrow on first, right on last
    prevBtn.style.visibility = idx <= 0 ? 'hidden' : 'visible';
    nextBtn.style.visibility = idx >= panels.length - 1 ? 'hidden' : 'visible';
  }

  function currentIndex(){
    // pick the panel whose left is closest to scrollLeft
    const x = scrollEl.scrollLeft; let best = 0; let bestDist = Infinity;
    panels.forEach((p,i)=>{ const d = Math.abs(p.offsetLeft - x); if(d < bestDist){ best = i; bestDist = d; } });
    return best;
  }

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const el = entry.target; const id = el.id;
      if(entry.isIntersecting && entry.intersectionRatio >= 0.65){
        panels.forEach(p=>p.classList.remove('is-active'));
        el.classList.add('is-active');
        // update nav highlight
        Object.values(idToLink).forEach(a=>a.removeAttribute('aria-current'));
        if(idToLink[id]) idToLink[id].setAttribute('aria-current','true');
        updateArrows(panels.indexOf(el));
        // Toggle button discoverability on active panel
        try{ setButtonDiscoverability(el); }catch(_){ /* function in cursor block */ }
        // Theme body for arrow buttons
        if(el.classList.contains('theme-dark')){
          document.body.setAttribute('data-theme','dark');
        } else {
          document.body.setAttribute('data-theme','light');
        }
        // Brand text: show 'portfolio' on hero only; name otherwise
        const brandText = document.getElementById('brandText');
        if(brandText){ brandText.textContent = (id === 'hero') ? 'portfolio' : 'Aldrin\u00A0J\u00A0Thomas'; }
        // Toggle hero-transparent header mode
        document.body.setAttribute('data-hero', id === 'hero' ? 'true' : 'false');
        // FAB visible from section 2 onward
        const idx = panels.indexOf(el);
        document.body.setAttribute('data-show-fab', idx >= 1 ? 'true' : 'false');
        // Mobile swipe hint only on hero
        const swipeHint = document.getElementById('swipeHint');
        if(swipeHint){ swipeHint.style.display = (id === 'hero') ? 'flex' : 'none'; }
        // Desktop nudge for next button only on hero
        const nextBtn = document.getElementById('nextBtn');
        nextBtn?.classList.toggle('hero-nudge', id === 'hero');
      }
    });
  }, { root: scrollEl, threshold: [0.65] });
  panels.forEach(p=>io.observe(p));
  updateArrows(0); // init
  // Initialize theme and brand visibility based on the first active panel
  const firstActive = document.querySelector('.panel.is-active') || panels[0];
  if(firstActive){
    document.body.setAttribute('data-theme', firstActive.classList.contains('theme-dark') ? 'dark' : 'light');
    const brandText = document.getElementById('brandText');
    if(brandText){ brandText.textContent = (firstActive.id === 'hero') ? 'portfolio' : 'Aldrin\u00A0J\u00A0Thomas'; }
    // FAB visibility
    const idx = panels.indexOf(firstActive);
    document.body.setAttribute('data-show-fab', idx >= 1 ? 'true' : 'false');
    // Swipe hint and desktop nudge
    const swipeHint = document.getElementById('swipeHint');
    if(swipeHint){ swipeHint.style.display = (firstActive.id === 'hero') ? 'flex' : 'none'; }
    const nextBtnInit = document.getElementById('nextBtn');
    nextBtnInit?.classList.toggle('hero-nudge', firstActive.id === 'hero');
    // Initial hero-transparent header mode
    document.body.setAttribute('data-hero', firstActive.id === 'hero' ? 'true' : 'false');
  }

  // Nav clicks → horizontal snap to panel
  function scrollToPanel(id){
    const el = document.getElementById(id);
    if(!el) return;
    requestTo(el.offsetLeft);
  }
  navLinks.forEach(a=> a.addEventListener('click', (e)=>{ e.preventDefault(); const id = a.getAttribute('data-target'); scrollToPanel(id); closeMobile(); }));

  // Brand link fix (no error; go to hero)
  brandLink.addEventListener('click', (e)=>{ e.preventDefault(); scrollToPanel('hero'); });

  // Prev/Next buttons
  function goTo(dir){
    let idx = currentIndex();
    idx = dir==='next' ? Math.min(idx+1, panels.length-1) : Math.max(idx-1, 0);
    requestTo(panels[idx].offsetLeft);
  }
  prevBtn?.addEventListener('click', ()=>goTo('prev'));
  nextBtn?.addEventListener('click', ()=>goTo('next'));

  // Mobile menu toggle
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  function closeMobile(){ mobileMenu.setAttribute('data-open','false'); mobileMenu.style.display = 'none'; }
  function openMobile(){ mobileMenu.setAttribute('data-open','true'); mobileMenu.style.display = 'block'; }
  hamburger.addEventListener('click', ()=>{ const open = mobileMenu.getAttribute('data-open') === 'true'; open ? closeMobile() : openMobile(); });

  // Email single button dropdown behavior
  const emailBtn  = document.getElementById('emailButton');
  const emailMenu = document.getElementById('emailMenu');
  if(emailBtn && emailMenu){
    emailBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const open = !emailMenu.classList.contains('hidden');
      emailMenu.classList.toggle('hidden');
      emailBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    emailMenu.querySelectorAll('[data-mail]').forEach(btn=> btn.addEventListener('click', ()=>{
      const mailto = btn.getAttribute('data-mail');
      emailMenu.classList.add('hidden');
      window.location.href = mailto; // open immediately
    }));
    document.addEventListener('click', (e)=>{ if(!emailMenu.contains(e.target) && e.target !== emailBtn) emailMenu.classList.add('hidden'); });
    document.getElementById('copyEmails')?.addEventListener('click', async ()=>{
      try { await navigator.clipboard.writeText('aldrinjt@outlook.com; aldrinjthomas4@gmail.com'); alert('Emails copied to clipboard'); } catch(e){ alert('Copy failed — copy manually: aldrinjt@outlook.com, aldrinjthomas4@gmail.com'); }
      emailMenu.classList.add('hidden');
    });
  }

  // Reveal-on-scroll for elements marked .reveal
  const revealObserver = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('show'); revealObserver.unobserve(en.target); } });
  }, { root: null, threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

  // 3D tilt for cards/boxes
  document.querySelectorAll('.tilt').forEach(wrapper =>{
    const inner = wrapper.querySelector('.tilt-inner');
    if(!inner) return;
    const max = 6; // degrees
    function onMove(e){
      const rect = wrapper.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;   // 0..1
      const py = (e.clientY - rect.top) / rect.height;   // 0..1
      const ry = (px - 0.5) * 2 * max;  // -max..max
      const rx = -(py - 0.5) * 2 * max;
      inner.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      inner.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      // Update glare highlight position if enabled
      if(inner.hasAttribute('data-glare')){
        const gx = (e.clientX - rect.left);
        const gy = (e.clientY - rect.top);
        inner.style.setProperty('--gx', gx + 'px');
        inner.style.setProperty('--gy', gy + 'px');
      }
    }
    function reset(){ inner.style.setProperty('--rx','0deg'); inner.style.setProperty('--ry','0deg'); }
    wrapper.addEventListener('pointermove', onMove);
    wrapper.addEventListener('pointerleave', reset);
    wrapper.addEventListener('pointerdown', onMove);
    wrapper.addEventListener('pointerup', reset);
  });

  // Add bobbing animation to chips with slight variation
  (function(){
    const chips = document.querySelectorAll('.chip');
    chips.forEach((c, i)=>{
      const alt = i % 2 === 1;
      c.classList.add(alt ? 'bobbing-alt' : 'bobbing');
      const dur = (4 + Math.random()*1.2).toFixed(2) + 's';
      c.style.setProperty('--bobDur', dur);
    });
  })();

  // Button click ripple effect
  (function(){
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.2;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
        ripple.style.top  = (e.clientY - rect.top  - size/2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', ()=> ripple.remove());
      }, { passive: true });
    });
  })();

  // Custom cursor: centered ring + dot, dynamic contrast, and button magnifier
  (function(){
    const ring = document.getElementById('cursorRing');
    const dot  = document.getElementById('cursorDot');
    const lens = document.getElementById('cursorLens');
    if(!window.matchMedia || !matchMedia('(pointer:fine)').matches) { ring.style.display='none'; dot.style.display='none'; return; }
    // Force-hide native cursor across the document to prevent flicker on links/buttons
    document.documentElement.classList.add('cursor-none');

    // Position targets and lerp state
    let tx = window.innerWidth/2, ty = window.innerHeight/2; // target
    let x = tx, y = ty;                                      // current
    const followEase = 0.18;                                 // smooth delay for ring

    // Helpers: color parsing and luminance
    function parseRGBA(str){
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
      if(!m) return {r:250,g:244,b:211,a:1};
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4]!==undefined? +m[4] : 1 };
    }
    function relLum({r,g,b}){
      const srgb = [r,g,b].map(v=> v/255 <= 0.03928 ? v/255/12.92 : Math.pow((v/255+0.055)/1.055, 2.4));
      return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
    }
    function pickContrastColorAt(x,y){
      let el = document.elementFromPoint(x,y);
      let bg = 'rgba(250,244,211,1)'; // fallback to paper
      while(el && el !== document.documentElement){
        const cs = getComputedStyle(el);
        const c = cs.backgroundColor;
        const {a} = parseRGBA(c);
        if(a && a > 0){ bg = c; break; }
        el = el.parentElement;
      }
      const L = relLum(parseRGBA(bg));
      return L < 0.5 ? 'rgba(250,250,250,0.95)' : 'rgba(12,22,24,0.95)';
    }

    function applyCursorStyle(cx, cy){
      ring.style.left = cx + 'px';
      ring.style.top  = cy + 'px';
      dot.style.left  = cx + 'px';
      dot.style.top   = cy + 'px';

      const color = pickContrastColorAt(cx, cy);
      ring.style.borderColor = color;
      dot.style.backgroundColor = color;
    }

    function animateCursor(){
      // Ring lags smoothly; dot is instant
      x += (tx - x) * followEase;
      y += (ty - y) * followEase;
      applyCursorStyle(x, y);
      requestAnimationFrame(animateCursor);
    }
    window.addEventListener('mousemove', (e)=>{ tx = e.clientX; ty = e.clientY; }, { passive:true });

    // Scale ring on interactive elements except .btn (lens). No hover effects inside #contact.
    function grow(e){
      if(e && e.currentTarget && e.currentTarget.closest('#contact')) return;
      ring.classList.add('hover-anim');
      ring.style.width = '40px'; ring.style.height = '40px';
    }
    function shrink(){ ring.classList.remove('hover-anim'); ring.style.width = '32px'; ring.style.height = '32px'; }
    document.querySelectorAll('a, [role="button"], button').forEach(el=>{
      if(el.classList.contains('btn')) return; // handled by lens behavior
      el.addEventListener('mouseenter', grow);
      el.addEventListener('mouseleave', shrink);
    });

    // Lens effect on .btn and card surfaces
    const lensTargets = document.querySelectorAll('.btn, .tilt .tilt-inner');
    function relativePos(el, clientX, clientY){
      const r = el.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    }
    lensTargets.forEach(target=>{
      target.addEventListener('pointerenter', (e)=>{
        const inContact = !!target.closest('#contact');
        target.setAttribute('data-lens','on');
        if(lens){ lens.style.display = 'block'; }
        if(!inContact){
          ring.style.opacity = '0';
          dot.style.opacity = '0';
          if(target.classList.contains('btn')){
            target.classList.add('btn-bounce');
            setTimeout(()=>target.classList.remove('btn-bounce'), 260);
          }
        }
      });
      target.addEventListener('pointerleave', ()=>{
        target.removeAttribute('data-lens');
        if(lens){ lens.style.display = 'none'; }
        if(!target.closest('#contact')){
          ring.style.opacity = '.9';
          dot.style.opacity = '.9';
        }
        if(target.classList.contains('btn')){
          target.style.setProperty('--btnrx', '0deg');
          target.style.setProperty('--btnry', '0deg');
        }
      });
      target.addEventListener('pointermove', (e)=>{
        const p = relativePos(target, e.clientX, e.clientY);
        target.style.setProperty('--mx', p.x + 'px');
        target.style.setProperty('--my', p.y + 'px');
        if(lens){ lens.style.left = e.clientX + 'px'; lens.style.top = e.clientY + 'px'; }
        if(target.classList.contains('btn')){
          const rect = target.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;   // 0..1
          const py = (e.clientY - rect.top) / rect.height;   // 0..1
          const ry = (px - 0.5) * 10;  // degrees
          const rx = -(py - 0.5) * 10;
          target.style.setProperty('--btnrx', rx.toFixed(2) + 'deg');
          target.style.setProperty('--btnry', ry.toFixed(2) + 'deg');
        }
      });
    });

    document.addEventListener('mouseleave', ()=>{ ring.style.opacity = '0'; dot.style.opacity = '0'; });
    document.addEventListener('mouseenter', ()=>{ ring.style.opacity = '.9'; dot.style.opacity = '.9'; });

    function setButtonDiscoverability(activePanel){
      document.querySelectorAll('.panel .btn').forEach(b=> b.removeAttribute('data-animate'));
      if(activePanel && activePanel.id !== 'contact'){
        activePanel.querySelectorAll('.btn').forEach(b=> b.setAttribute('data-animate','on'));
      }
    }

    requestAnimationFrame(animateCursor);
  })();

  // Hero parallax dots
  (function(){
    const hero = document.getElementById('hero');
    if(!hero) return;
    const layer = document.createElement('div');
    layer.className = 'parallax-layer';
    hero.appendChild(layer);
    const dots = [];
    for(let i=0;i<22;i++){
      const d = document.createElement('span');
      d.className = 'p-dot';
      const depth = 0.12 + Math.random()*0.55;
      d.dataset.depth = depth.toFixed(3);
      d.style.left = Math.random()*100 + '%';
      d.style.top  = Math.random()*100 + '%';
      const size = 3 + Math.random()*6; d.style.width = d.style.height = size+'px';
      layer.appendChild(d);
      dots.push(d);
    }
    function updateParallax(e){
      if(!hero.classList.contains('is-active')) return;
      const cx = window.innerWidth/2, cy = window.innerHeight/2;
      const dx = (e.clientX - cx) / cx; // -1..1
      const dy = (e.clientY - cy) / cy; // -1..1
      dots.forEach(el=>{
        const depth = parseFloat(el.dataset.depth||'0.3');
        el.style.transform = `translate(${dx*depth*22}px, ${dy*depth*22}px)`;
      });
    }
    window.addEventListener('mousemove', updateParallax, { passive:true });
  })();
})();
