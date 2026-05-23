import './style.css';
import { initChatbot } from './chatbot.js';

document.addEventListener('DOMContentLoaded', () => {
  
  /* ─── WebGL Burning Reveal ─────────────────────────── */
  const initBurnReveal = () => {
    const canvas = document.getElementById('burn-canvas');
    if (!canvas) return;

    if (window.innerWidth < 768) {
      canvas.style.display = 'none';
      return;
    }

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      canvas.style.display = 'none';
      return;
    }

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Shaders
    const vsSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_progress;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 4; ++i) {
          v += a * noise(p);
          p = rot * p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        float dist = (uv.x + uv.y) * 0.5;
        float n = fbm(uv * 8.0);
        float edgeValue = dist + n * 0.2;
        float threshold = -0.3 + u_progress * 1.6;

        vec4 paperColor = vec4(0.96, 0.96, 0.86, 1.0); // #F5F5DC cream
        float burnBorder = 0.08;

        if (edgeValue < threshold) {
          discard;
        } else if (edgeValue < threshold + burnBorder) {
          float t = (edgeValue - threshold) / burnBorder;
          vec3 flame = mix(vec3(1.0, 0.25, 0.0), vec3(1.0, 0.75, 0.0), t);
          gl_FragColor = vec4(flame, 1.0);
        } else if (edgeValue < threshold + burnBorder + 0.02) {
          float t = (edgeValue - (threshold + burnBorder)) / 0.02;
          gl_FragColor = mix(vec4(0.08, 0.08, 0.08, 1.0), paperColor, t);
        } else {
          gl_FragColor = paperColor;
        }
      }
    `;

    // Compile helper
    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) {
      canvas.style.display = 'none';
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      canvas.style.display = 'none';
      return;
    }

    gl.useProgram(program);

    // Quad geometry
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const progressLoc = gl.getUniformLocation(program, 'u_progress');

    let startTime = null;
    const duration = 2800; // 2.8 seconds

    const render = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Ease progress (ease-in-out cubic)
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(progressLoc, ease);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (progress < 1.0) {
        requestAnimationFrame(render);
      } else {
        canvas.style.display = 'none';
        window.removeEventListener('resize', resizeCanvas);
      }
    };

    requestAnimationFrame(render);
  };

  initBurnReveal();

  /* ─── Chatbot ──────────────────────────────────────── */
  initChatbot();

  /* ─── Scroll Progress Bar ─────────────────────────── */

  const progressBar = document.getElementById('scroll-progress');
  if (progressBar) {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = pct + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  /* ─── Custom Cursor ───────────────────────────────── */
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (dot && ring) {
    let mx = -100, my = -100;
    let rx = -100, ry = -100;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    });

    // Ring follows with smooth lag
    const animateRing = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(animateRing);
    };
    animateRing();

    // Hide on leave, show on enter
    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    });

    // Expand ring on interactive elements
    document.querySelectorAll('a, button, .glass-card, .svc-card, .process-card').forEach(el => {
      el.addEventListener('mouseenter', () => {
        ring.style.width = '56px';
        ring.style.height = '56px';
        ring.style.borderColor = 'rgba(245, 245, 220, 0.8)';
        ring.style.background = 'rgba(245, 245, 220, 0.05)';
      });
      el.addEventListener('mouseleave', () => {
        ring.style.width = '36px';
        ring.style.height = '36px';
        ring.style.borderColor = 'rgba(245, 245, 220, 0.4)';
        ring.style.background = '';
      });
    });
  }

  /* ─── Navbar scroll ───────────────────────────────── */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ─── Mobile Hamburger Menu ────────────────────────── */
  const hamburger = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-drawer');
  if (hamburger && drawer) {
    const toggleDrawer = (open) => {
      hamburger.classList.toggle('is-open', open);
      drawer.classList.toggle('is-open', open);
      hamburger.setAttribute('aria-expanded', open);
      drawer.setAttribute('aria-hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
    };

    hamburger.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('is-open');
      toggleDrawer(!isOpen);
    });

    // Close on any drawer link click
    drawer.querySelectorAll('[data-drawer-close]').forEach(link => {
      link.addEventListener('click', () => toggleDrawer(false));
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) toggleDrawer(false);
    });
  }

  /* ─── Scroll Reveal ───────────────────────────────── */
  const revealEls = document.querySelectorAll('[data-reveal]');

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.revealDelay || '0', 10);
      setTimeout(() => el.classList.add('is-visible'), delay);
      io.unobserve(el);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => {
    if (el.closest('#hero')) {
      el.classList.add('is-visible');
    } else {
      io.observe(el);
    }
  });

  document.querySelectorAll(
    '.process-card, .svc-card, .metric-card, .feature, .sec__head'
  ).forEach(el => io.observe(el));


  /* ─── Number counter animation ────────────────────── */
  const counters = document.querySelectorAll('[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const isFloat = String(target).includes('.');
      let start = 0;
      const duration = 1800;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = eased * target;
        el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.floor(current)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = prefix + target + suffix;
      };
      requestAnimationFrame(step);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => counterObserver.observe(el));

  /* ─── Style Chips ─────────────────────────────────── */
  document.querySelectorAll('.style-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.style-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  /* ─── 3D Tilt on cards ────────────────────────────── */
  document.querySelectorAll('.process-card, .svc-card, .metric-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-10px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) scale(1.02)`;

      // Dynamic highlight spot
      card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ─── Mouse-spotlight on glass-cards ─────────────── */
  document.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.background = `radial-gradient(260px circle at ${x}px ${y}px, rgba(139,92,246,0.08) 0%, rgba(255,255,255,0.03) 100%)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = '';
    });
  });

  /* ─── Magnetic Buttons ────────────────────────────── */
  document.querySelectorAll('.btn--primary').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
      btn.style.transform = `translateY(-3px) translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  /* ─── Demo Form ───────────────────────────────────── */
  const form = document.getElementById('demo-form');
  const success = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');

  if (form && success && submitBtn) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(el => {
        el.style.borderColor = '';
        if (!el.value.trim()) {
          el.style.borderColor = '#f87171';
          el.style.boxShadow = '0 0 0 3px rgba(248,113,113,0.2)';
          valid = false;
        }
      });
      if (!valid) return;

      // Ripple on submit
      createRipple(submitBtn);

      submitBtn.textContent = 'Sending…';
      submitBtn.disabled = true;

      setTimeout(() => {
        form.hidden = true;
        success.hidden = false;
      }, 1500);
    });
  }

  /* ─── Ripple helper ───────────────────────────────── */
  function createRipple(btn) {
    const ripple = document.createElement('span');
    const size = Math.max(btn.offsetWidth, btn.offsetHeight);
    ripple.style.cssText = `
      position:absolute;
      width:${size}px; height:${size}px;
      border-radius:50%;
      background:rgba(255,255,255,0.25);
      transform:translate(-50%,-50%) scale(0);
      animation:ripple-expand 0.6s ease-out forwards;
      left:50%; top:50%;
      pointer-events:none;
    `;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }

  // Add ripple keyframe to document if not present
  if (!document.getElementById('ripple-style')) {
    const s = document.createElement('style');
    s.id = 'ripple-style';
    s.textContent = `@keyframes ripple-expand { to { transform: translate(-50%,-50%) scale(2); opacity: 0; } }`;
    document.head.appendChild(s);
  }

  /* ─── Active nav link on scroll ──────────────────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link');

  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle(
            'nav__link--active',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      }
    });
  }, { threshold: 0.35 });

  sections.forEach(sec => sectionObserver.observe(sec));

  /* ─── Particle burst on CTA click ────────────────── */
  document.querySelectorAll('.btn--primary').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const colors = ['#F5F5DC', '#ffffff', '#FF7800', 'rgba(245,245,220,0.6)', 'rgba(255,120,0,0.4)'];
      for (let i = 0; i < 18; i++) {
        const p = document.createElement('span');
        const size = 4 + Math.random() * 8;
        p.style.cssText = `
          position:fixed;
          left:${rect.left + rect.width / 2}px;
          top:${rect.top + rect.height / 2}px;
          width:${size}px; height:${size}px;
          border-radius:50%;
          background:${colors[i % colors.length]};
          pointer-events:none;
          z-index:9999;
          transform:translate(-50%,-50%);
          animation: particle-burst 0.8s ease-out forwards;
          --dx:${(Math.random() - 0.5) * 160}px;
          --dy:${(Math.random() - 0.5) * 160}px;
        `;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 900);
      }
    });
  });

  /* ─── Typewriter effect on hero badge text ────────── */
  const badge = document.querySelector('.hero__left .badge');
  if (badge) {
    const originalText = badge.textContent.trim();
    badge.textContent = '';
    const dotEl = badge.querySelector?.('.badge__dot');
    // reconstruct: dot + text
    const dotSpan = document.createElement('span');
    dotSpan.className = 'badge__dot';
    badge.appendChild(dotSpan);
    const textNode = document.createTextNode('');
    badge.appendChild(textNode);
    let i = 0;
    const typeInterval = setInterval(() => {
      textNode.textContent = originalText.slice(0, ++i);
      if (i >= originalText.length) clearInterval(typeInterval);
    }, 60);
  }

  /* ─── Staggered footer brand animate ─────────────── */
  const footerBrand = document.querySelector('.footer__brand');
  if (footerBrand) {
    const footerObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        footerBrand.style.animation = 'hero-title-in 0.8s var(--ease) both';
        footerObserver.unobserve(footerBrand);
      }
    }, { threshold: 0.3 });
    footerObserver.observe(footerBrand);
  }

  /* ─── Scroll-triggered parallax and dynamic stretching ─── */
  const orbPurple = document.querySelector('.bg__orb--purple');
  const orbViolet = document.querySelector('.bg__orb--violet');
  const watermark = document.querySelector('.footer__watermark');
  const missionSpans = document.querySelectorAll('.mission-img-span');

  const onScroll = () => {
    const y = window.scrollY;
    
    // Parallax on bg elements
    if (orbPurple) orbPurple.style.transform = `translateY(${y * 0.08}px)`;
    if (orbViolet) orbViolet.style.transform = `translateY(${-y * 0.05}px)`;

    // Footer stretch text
    if (watermark) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPct = docHeight > 0 ? (y / docHeight) : 0;
      // Stretches from 1.0 at top of page to 2.5 at bottom of page
      const stretch = 1.0 + scrollPct * 1.5;
      watermark.style.setProperty('--footer-stretch', stretch);
    }

    // Parallax on mission image spans
    if (missionSpans.length > 0) {
      missionSpans.forEach(span => {
        const rect = span.getBoundingClientRect();
        const elementTop = rect.top + y;
        const elementHeight = rect.height;
        const windowHeight = window.innerHeight;
        
        const visibleStart = elementTop - windowHeight;
        const visibleEnd = elementTop + elementHeight;
        const totalRange = visibleEnd - visibleStart;
        
        if (y >= visibleStart && y <= visibleEnd) {
          const progress = (y - visibleStart) / totalRange;
          // Scale width / transform smoothly based on progress
          const scale = 0.8 + progress * 0.4;
          span.style.setProperty('--mission-scale', scale);
          span.style.transform = `scaleX(${scale})`;
        }
      });
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Run initially

});
