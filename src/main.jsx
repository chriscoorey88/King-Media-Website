import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothTouch: false,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });
    window.__lenis = lenis;

    // Velocity tracker via Lenis scroll event (not native scroll)
    let lastScrollY = 0, lastT = Date.now(), fastTimer;
    lenis.on('scroll', ({ scroll }) => {
      const now = Date.now(), dy = Math.abs(scroll - lastScrollY), dt = now - lastT || 1;
      if (dy / dt > 1.2) {
        document.body.classList.add('king-fast-scroll');
        clearTimeout(fastTimer);
        fastTimer = setTimeout(() => document.body.classList.remove('king-fast-scroll'), 200);
      }
      lastScrollY = scroll; lastT = now;
    });

    let raf;
    function loop(time) { lenis.raf(time); raf = requestAnimationFrame(loop); }
    raf = requestAnimationFrame(loop);
    const clickHandler = (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -80, lerp: 0.05 });
    };
    document.addEventListener('click', clickHandler);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('click', clickHandler);
      lenis.destroy();
    };
  }, []);
}

function Reveal({ children, delay = 0, as: Tag = 'div', style, className = '', ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => el.classList.add('in'), delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <Tag ref={ref} className={`king-reveal ${className}`} style={style} {...rest}>{children}</Tag>;
}

function ImageReveal({ children, style, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => el.classList.add('in'), delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref} className="king-img-reveal" style={style}>{children}</div>;
}

function SplitReveal({ text, accentWord, accent, style, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const words = el.querySelectorAll('.king-word');
          const fast = document.body.classList.contains('king-fast-scroll');
          words.forEach((w, i) => {
            setTimeout(() => w.classList.add('in'), fast ? 0 : delay + i * 60);
          });
          io.unobserve(el);
        }
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  const words = text.split(' ');
  return (
    <span ref={ref} style={style}>
      {words.map((word, wi) => {
        const isAccent = accentWord && word.toLowerCase().replace(/[.,]/g,'') === accentWord.toLowerCase();
        return (
          <React.Fragment key={wi}>
            <span className="king-word" style={{ color: isAccent ? accent : 'inherit', whiteSpace: 'nowrap' }}>
              {word}
            </span>
            {wi < words.length - 1 && ' '}
          </React.Fragment>
        );
      })}
    </span>
  );
}

function Marquee({ T, accent }) {
  const items = ['SHORT-FORM VIDEO', 'VIRAL SCRIPTING', 'PERFORMANCE CREATIVE', 'CONTENT STRATEGY', 'EDITING', 'HOOKS', 'GROWTH'];
  const strip = items.map((item, i) => (
    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 40, paddingRight: 40 }}>
      <span>{item}</span>
      <span style={{ color: accent, fontSize: 7 }}>●</span>
    </span>
  ));
  return (
    <div style={{
      borderTop: `1px solid ${T.border}`,
      borderBottom: `1px solid ${T.border}`,
      padding: '14px 0',
      overflow: 'hidden',
      opacity: 0.45,
    }}>
      <div style={{
        display: 'inline-flex',
        whiteSpace: 'nowrap',
        animation: 'marquee 24s linear infinite',
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: T.fg,
      }}>
        {strip}{strip}
      </div>
    </div>
  );
}

function parseFigure(str) {
  const m = String(str).match(/^([^\d\-\.]*)(-?\d[\d,\.]*)(.*)$/);
  if (!m) return { prefix: '', value: 0, suffix: str, decimals: 0 };
  const prefix = m[1];
  const raw = m[2];
  const suffix = m[3];
  const decimals = (raw.split('.')[1] || '').length;
  const value = parseFloat(raw.replace(/,/g, ''));
  return { prefix, value, suffix, decimals };
}

function CountUp({ target, duration = 2000, delay = 0, style, className }) {
  const { prefix, value, suffix, decimals } = useMemo(() => parseFigure(target), [target]);
  const ref = useRef(null);
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let rafId = 0;
    let startTime = 0;
    let started = false;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min(1, (ts - startTime) / duration);
      const v = value * easeOutCubic(p);
      setDisplay(v.toFixed(decimals));
      if (p < 1) rafId = requestAnimationFrame(tick);
      else setDisplay(value.toFixed(decimals));
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !started) {
          started = true;
          setTimeout(() => { rafId = requestAnimationFrame(tick); }, delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(rafId); };
  }, [value, duration, delay, decimals]);
  const parts = display.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const pretty = decimals > 0 ? `${intPart}.${parts[1] || ''.padEnd(decimals, '0')}` : intPart;
  return (
    <span ref={ref} className={className} style={style}>
      {prefix}{pretty}{suffix}
    </span>
  );
}

const TOKENS = {
  dark: {
    bg: '#0B0A0F',
    bgAlt: '#100E17',
    bgElev: '#141220',
    bgCard: '#18151F',
    fg: '#F3F0EA',
    fgMuted: '#8A86A0',
    fgFaint: '#4A4656',
    border: 'rgba(243,240,234,0.08)',
    borderStrong: 'rgba(243,240,234,0.18)',
  },
  light: {
    bg: '#F3F0EA',
    bgAlt: '#EEEAE0',
    bgElev: '#EBE7DE',
    bgCard: '#FFFFFF',
    fg: '#0B0A0F',
    fgMuted: '#6B6778',
    fgFaint: '#B5B1BF',
    border: 'rgba(11,10,15,0.08)',
    borderStrong: 'rgba(11,10,15,0.18)',
  },
};

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const DISPLAY = '"Instrument Sans", sans-serif';

function KingDot({ size = 28, color, dot, kern = -0.045, weight = 600 }) {
  const ds = Math.round(size * 0.18);
  const dg = Math.round(size * 0.06);
  const db = Math.round(size * 0.06);
  return (
    <span style={{
      fontFamily: DISPLAY, fontWeight: weight, fontSize: size,
      letterSpacing: `${kern}em`, color, lineHeight: 1,
      display: 'inline-flex', alignItems: 'flex-end',
    }}>
      <span>king</span>
      <span style={{
        width: ds, height: ds, borderRadius: '50%',
        background: dot, marginLeft: dg, marginBottom: db, flexShrink: 0,
      }}/>
    </span>
  );
}

function Button({ children, primary = true, onClick, href, accent, fg, small }) {
  const [hover, setHover] = useState(false);
  const style = primary ? {
    background: hover ? '#F3F0EA' : accent,
    color: hover ? '#0B0A0F' : '#F3F0EA',
    padding: small ? '11px 18px' : '15px 26px',
    minHeight: small ? 44 : undefined,
    fontSize: small ? 12 : 13,
    fontFamily: DISPLAY, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 10,
    transition: 'background 200ms ease, color 200ms ease, transform 160ms ease, box-shadow 160ms ease',
    transform: hover ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hover
      ? '0 4px 16px rgba(243,240,234,0.12), inset 0 1px 0 rgba(255,255,255,0.6)'
      : `0 14px 30px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.15)`,
  } : {
    background: 'transparent', color: fg,
    padding: small ? '10px 17px' : '14px 25px',
    fontSize: small ? 12 : 13,
    fontFamily: DISPLAY, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase',
    border: `1px solid ${hover ? fg : 'rgba(255,255,255,0.22)'}`,
    borderRadius: 6, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 10,
    transition: 'border-color 160ms ease',
  };
  const Tag = href ? 'a' : 'button';
  const isExternal = href && !href.startsWith('#');
  return (
    <Tag href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}
         onClick={onClick} style={style}
         onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {children}
    </Tag>
  );
}

function ArrowUpRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SectionLabel({ children, accent }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          el.classList.add('sl-in');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="king-section-label" style={{
      fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase',
      color: accent, display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20,
    }}>
      <span className="sl-bar" style={{ width: 24, height: 1, background: accent, opacity: 0.5, transformOrigin: 'left center' }}/>
      <span className="sl-txt">{children}</span>
    </div>
  );
}

const HEADLINES = {
  dominate: {
    label: 'top experts dominate social media',
    render: (accent) => (<>We help <span style={{color: accent}}>top experts</span> dominate social media.</>),
  },
  king: {
    label: 'kings of your category',
    render: (accent) => (<>We make founders <span style={{color: accent}}>kings</span> of their category.</>),
  },
  rule: {
    label: 'rule the feed',
    render: (accent) => (<>We help experts <span style={{color: accent}}>rule</span> the feed.</>),
  },
  growth: {
    label: 'serious growth',
    render: (accent) => (<>Serious accounts. <span style={{color: accent}}>Serious growth.</span></>),
  },
};

function Ambient({ theme, accent }) {
  const dotColor = theme === 'dark' ? 'rgba(243,240,234,0.035)' : 'rgba(11,10,15,0.05)';
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(${dotColor} 1px, transparent 1px)`,
        backgroundSize: '22px 22px',
        maskImage: 'radial-gradient(ellipse at center top, #000 30%, transparent 70%)',
      }}/>
      <div style={{
        position: 'absolute', left: '50%', top: -200, transform: 'translateX(-50%)',
        width: 1200, height: 800, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}28 0%, transparent 60%)`,
        pointerEvents: 'none', opacity: 0.7,
      }}/>
    </>
  );
}

function ScrollProgress({ accent }) {
  const barRef = useRef(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let raf;
    const tick = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const y = window.scrollY || 0;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 3,
      zIndex: 1000, pointerEvents: 'none',
    }}>
      <div ref={barRef} style={{ height: '100%', width: '0%', background: accent }}/>
    </div>
  );
}

function ScrollIndicator({ T, accent }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onScroll = () => setHidden((window.scrollY || 0) > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 40,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: MONO, fontSize: 9, color: T.fgMuted,
      letterSpacing: 3, textTransform: 'uppercase',
      opacity: hidden ? 0 : 1, transition: 'opacity 300ms ease',
      animation: 'kingRise 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1s both',
    }}>
      <span>Scroll</span>
      <span style={{
        position: 'relative', display: 'inline-block',
        width: 1, height: 48, background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}>
        <span style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          background: accent,
          animation: 'kingScrollLine 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        }}/>
      </span>
    </div>
  );
}

function Nav({ T, accent, theme }) {
  return (
    <header className="king-nav" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      transform: 'translateZ(0)',
      background: theme === 'dark' ? 'rgba(11,10,15,0.92)' : 'rgba(243,240,234,0.92)',
      borderBottom: `1px solid ${T.border}`,
    }}>
      <a href="#top" style={{ display: 'inline-flex', alignItems: 'center', marginTop: -6, marginBottom: -6 }}>
        <KingDot size={46} color={T.fg} dot={accent}/>
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Button small primary accent={accent} href="#book">
          Book Consultation <ArrowUpRight/>
        </Button>
      </div>
    </header>
  );
}

function Hero({ T, accent, headlineMode }) {
  const headline = HEADLINES[headlineMode] || HEADLINES.dominate;
  return (
    <section id="top" className="king-hero" style={{
      position: 'relative',
      minHeight: '100svh',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{ position: 'relative', maxWidth: 1100, width: '100%', paddingTop: 20 }}>
        <Reveal>
          <SectionLabel accent={accent}>Social Media Branding Agency</SectionLabel>
        </Reveal>

        <Reveal delay={120}>
          <h1 style={{
            fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(38px, 5.5vw, 72px)',
            letterSpacing: '-0.03em', lineHeight: 1.02, margin: 0,
            color: T.fg, textWrap: 'balance',
          }}>
            {headline.render(accent)}
          </h1>
        </Reveal>

        <Reveal delay={260} style={{
          display: 'flex', alignItems: 'center', gap: 20, marginTop: 44, flexWrap: 'wrap',
        }}>
          <Button primary accent={accent} href="#book">
            Book a free consultation <ArrowUpRight/>
          </Button>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: T.fgMuted }}>
            Free &amp; online
          </span>
        </Reveal>
      </div>

      <ScrollIndicator T={T} accent={accent}/>
    </section>
  );
}

function Credibility({ T, accent }) {
  const items = [
    { n: '14.2M', l: 'Views in 90 days · one client' },
    { n: '6.2M', l: 'Views · single reel' },
    { n: '+39.2k', l: 'Followers · Dec–Feb window' },
    { n: '$75k+', l: 'Revenue driven for brands' },
  ];
  return (
    <section style={{
      padding: '44px 44px',
      borderTop: `1px solid ${T.border}`,
      borderBottom: `1px solid ${T.border}`,
      background: T.bgAlt,
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, alignItems: 'center',
      }}>
        {items.map((it, i) => (
          <Reveal key={it.n} delay={i * 90} style={{
            borderLeft: i === 0 ? 'none' : `1px solid ${T.border}`,
            paddingLeft: i === 0 ? 0 : 20,
          }}>
            <CountUp target={it.n} duration={1800} delay={i * 90} style={{
              fontFamily: DISPLAY, fontWeight: 600, fontSize: 32,
              letterSpacing: '-0.02em', color: T.fg, lineHeight: 1, display: 'block',
            }}/>
            <div style={{
              fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.4,
              textTransform: 'uppercase', color: T.fgMuted, marginTop: 8,
            }}>
              {it.l}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CaseStudy({ T, accent }) {
  return (
    <section id="case" className="king-case-section" style={{
      position: 'relative',
      borderTop: `1px solid ${T.border}`,
      background: T.bgAlt,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionLabel accent={accent}>About Us</SectionLabel>
        <h2 style={{
          fontFamily: DISPLAY, fontWeight: 600,
          fontSize: 'clamp(30px, 3.5vw, 48px)', letterSpacing: '-0.025em',
          lineHeight: 1.02, color: T.fg, margin: '16px 0 0', textWrap: 'balance',
        }}>
          For those who are <span style={{ color: accent }}>already winning</span> offline.
        </h2>
        <div className="king-case-grid">
          <p style={{
            fontFamily: DISPLAY, fontSize: 17, color: T.fgMuted, lineHeight: 1.7, margin: 0,
          }}>
            In today's world, a personal brand is the most valuable asset you can own as an entrepreneur. We help industry leaders dominate the social media space. We understand its dynamics and help entrepreneurs turn their know-how into a strong, authentic brand and subsequent monetization.
          </p>
          <div className="king-case-stats">
            {[
              { value: '20M', suffix: '+', label: 'Total views driven' },
              { value: '$100K', suffix: '+', label: 'Revenue generated' },
              { value: '3', suffix: 'x', suffixCenter: true, label: 'Average reach growth' },
              { value: '4', suffix: '+', label: 'Years of content experience' },
            ].map(({ value, suffix, suffixCenter, label }) => (
              <div key={label}>
                <div style={{ display: 'flex', alignItems: suffixCenter ? 'center' : 'baseline', gap: 1 }}>
                  <CountUp target={value} duration={2000} style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(28px, 3vw, 40px)', letterSpacing: '-0.03em', color: T.fg, lineHeight: 1 }}/>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(28px, 3vw, 40px)', color: accent, lineHeight: 1 }}>
                    {suffix}
                  </span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.fgMuted, marginTop: 6 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pill({ T, accent, children }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
      color: accent, padding: '7px 12px', borderRadius: 4,
      background: `${accent}12`, border: `1px solid ${accent}30`,
    }}>
      {children}
    </span>
  );
}

function GrowthCard({ T, accent, handle, name, niche, from, to, days, rebuild }) {
  const delta = to - from;
  const deltaPct = from > 0 ? Math.round((delta / from) * 100) : null;
  const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'k' : n;

  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const wiggle = Math.sin(i * 1.3) * 0.015;
      pts.push([i, from + (to - from) * (eased + wiggle)]);
    }
    return pts;
  }, [from, to]);

  const W = 560, H = 200, PAD_L = 8, PAD_B = 24, PAD_T = 10;
  const minY = Math.min(from, to);
  const maxY = Math.max(from, to);
  const scale = (x, y) => [
    PAD_L + (x / 30) * (W - PAD_L - 8),
    PAD_T + (1 - (y - minY) / (maxY - minY || 1)) * (H - PAD_T - PAD_B),
  ];
  const pathD = points.map(([x, y], i) => {
    const [sx, sy] = scale(x, y);
    return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
  }).join(' ');
  const areaD = pathD + ` L${scale(30, minY)[0]},${H - PAD_B} L${scale(0, minY)[0]},${H - PAD_B} Z`;

  return (
    <div style={{
      background: T.bgCard,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {rebuild && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
          background: `${accent}22`, color: accent,
          padding: '4px 10px', borderRadius: 4, border: `1px solid ${accent}44`,
        }}>
          Rebuild run
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#F3F0EA', fontFamily: DISPLAY, fontWeight: 600, fontSize: 17,
          flexShrink: 0,
        }}>
          {name[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16, color: T.fg }}>
            {name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: T.fgMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>
            {handle} · {niche}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 22, color: T.fgMuted }}>
          {fmt(from)}
        </div>
        <div style={{ width: 22, height: 1, background: T.fgFaint }}/>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 38, color: T.fg, letterSpacing: '-0.02em' }}>
          {fmt(to)}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 12, fontWeight: 600, color: accent,
          padding: '3px 9px', borderRadius: 4, background: `${accent}18`, border: `1px solid ${accent}33`,
        }}>
          {deltaPct !== null ? `+${deltaPct}%` : `+${fmt(to)}`}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 11, color: T.fgMuted, letterSpacing: 1, textTransform: 'uppercase',
          marginLeft: 'auto',
        }}>
          {days} days
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`grad-${handle}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1="0" x2={W} y1={PAD_T + f * (H - PAD_T - PAD_B)} y2={PAD_T + f * (H - PAD_T - PAD_B)}
                stroke={T.border} strokeDasharray="2 4"/>
        ))}
        <path d={areaD} fill={`url(#grad-${handle})`}/>
        <path d={pathD} stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={scale(30, to)[0]} cy={scale(30, to)[1]} r="5" fill={accent}/>
        <circle cx={scale(30, to)[0]} cy={scale(30, to)[1]} r="9" fill={accent} opacity="0.3"/>
      </svg>
    </div>
  );
}

function TestimonialEmbed({ accent }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: `0 8px 20px rgba(0,0,0,0.4), 0 32px 80px rgba(0,0,0,0.65), inset 0 0 0 1px ${accent}22`,
      background: '#000',
      aspectRatio: '9/16',
      isolation: 'isolate',
      zIndex: 0,
    }}>
      <iframe
        src="https://iframe.mediadelivery.net/embed/641209/9a2a1e11-22fd-4242-877f-f654adc805f1?autoplay=false&loop=false&muted=false&preload=false&responsive=true&playsinline=true&v=2"
        title="Soren testimonial"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        loading="lazy"
        frameBorder="0"
        playsInline
        webkit-playsinline="true"
        style={{ width: '100%', height: '100%', display: 'block', border: 'none' }}
      />
    </div>
  );
}

function SorenTestimonial({ T, accent }) {
  const shots = [
    {
      src: 'assets/soren-profile.webp',
      stat: '59.5K',
      label: 'Followers today · @yngsoren',
      sub: 'Growing',
    },
    {
      src: 'assets/analytics-reel-6m.webp',
      stat: '6.2M',
      label: 'Views · single reel',
      sub: '99.7% non-followers · pure reach',
    },
    {
      src: 'assets/analytics-followers.webp',
      stat: '+39.2k',
      label: 'Followers · rebuilt from zero',
      sub: 'Dec 18 – Feb 10',
    },
  ];

  return (
    <section style={{
      borderTop: `1px solid ${T.border}`,
      background: T.bg,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-50%)',
        width: 700, height: 500, borderRadius: '50%',
        background: `radial-gradient(ellipse, ${accent}12 0%, transparent 70%)`,
        opacity: 0.5, pointerEvents: 'none',
      }}/>

      {/* Top: video left → text right */}
      <div className="king-soren-top">
        <div className="king-soren-grid">

          {/* Left — heading, blurb, stats, quote */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <SectionLabel accent={accent}>Case Study</SectionLabel>
            <h2 style={{
              fontFamily: DISPLAY, fontWeight: 600,
              fontSize: 'clamp(28px, 3vw, 44px)', letterSpacing: '-0.025em',
              lineHeight: 1.05, color: T.fg, margin: '16px 0 0', textWrap: 'balance',
            }}>
              From 18k to 34k — then <span style={{ color: accent }}>rebuilt from zero</span> in 30 days.
            </h2>
            <p style={{
              fontFamily: DISPLAY, fontSize: 16, color: T.fgMuted, lineHeight: 1.7,
              marginTop: 20, marginBottom: 48, maxWidth: 460,
            }}>
              Soren came to us with a growing personal brand. We scaled it then rebuilt it from scratch. Here's what he has to say.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div style={{ borderLeft: `2px solid ${accent}44`, paddingLeft: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 34, letterSpacing: '-0.03em', color: T.fg, lineHeight: 1 }}>18K</span>
                  <span style={{ fontFamily: MONO, fontSize: 22, color: accent, opacity: 0.8, lineHeight: 1, alignSelf: 'center' }}>→</span>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 34, letterSpacing: '-0.03em', color: accent, lineHeight: 1 }}>34K</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.fgMuted, marginTop: 6 }}>
                  Followers · first run
                </div>
              </div>

              <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 500, color: T.fg }}>
                Then in one month:
              </div>

              <div style={{ borderLeft: `2px solid ${accent}44`, paddingLeft: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 34, letterSpacing: '-0.03em', color: T.fg, lineHeight: 1 }}>0</span>
                  <span style={{ fontFamily: MONO, fontSize: 22, color: accent, opacity: 0.8, lineHeight: 1, alignSelf: 'center' }}>→</span>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 34, letterSpacing: '-0.03em', color: accent, lineHeight: 1 }}>30K</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.fgMuted, marginTop: 6 }}>
                  Followers · rebuilt from ban
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 40, padding: '22px 26px',
              background: `${accent}0d`, border: `1px solid ${accent}22`, borderRadius: 10,
              fontFamily: DISPLAY, fontSize: 15, color: T.fgMuted, lineHeight: 1.7, fontStyle: 'italic',
            }}>
              "The revenue has exponentially grown."
              <div style={{ marginTop: 10, fontStyle: 'normal', fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: accent }}>
                — Soren Skarsgard
              </div>
            </div>
          </div>

          {/* Right — vertical video */}
          <div style={{ position: 'relative' }}>
            <div aria-hidden style={{
              position: 'absolute', inset: -40, borderRadius: '50%',
              background: `radial-gradient(ellipse, ${accent}33 0%, transparent 70%)`,
              opacity: 0.6, pointerEvents: 'none',
            }}/>
            <TestimonialEmbed accent={accent}/>
          </div>
        </div>
      </div>

      {/* Bottom: analytics screenshots */}
      <div className="king-soren-bottom">
        <div style={{
          marginBottom: 36, paddingTop: 56, borderTop: `1px solid ${T.border}`,
          fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.fgMuted,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }}/>
          Receipts — pulled from @yngsoren
        </div>
        <div className="king-phone-grid">
          {shots.map((s, i) => (
            <ImageReveal key={i} delay={i * 100}>
              <PhoneCard T={T} accent={accent} {...s}/>
            </ImageReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Bridge({ T, accent }) {
  return (
    <section style={{
      padding: '180px 60px',
      background: T.bg,
      borderTop: `1px solid ${T.border}`,
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto 0 0' }}>
        <h2 style={{
          fontFamily: DISPLAY, fontWeight: 600,
          fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-0.025em',
          lineHeight: 1.04, color: T.fg, margin: 0, textWrap: 'balance',
        }}>
          You built something great.<br/>Nobody's finding it.
        </h2>
        <p style={{
          fontFamily: DISPLAY, fontSize: 'clamp(16px, 1.5vw, 20px)', fontStyle: 'italic',
          color: accent, lineHeight: 1.5, margin: '24px 0 0',
        }}>
          That's not your failure — it's a skill problem. And it's mine.
        </p>
        <p style={{
          fontFamily: DISPLAY, fontSize: 17, color: T.fgMuted, lineHeight: 1.75,
          margin: '40px 0 0',
        }}>
          You mastered your craft. The product works. Your customers prove it. But short-form changes every month, and you already have a full-time job — running the business you built.
        </p>
        <p style={{
          fontFamily: DISPLAY, fontSize: 17, color: T.fgMuted, lineHeight: 1.75,
          margin: '24px 0 0',
        }}>
          You stay the expert on your work. I'll make sure the right people see it.
        </p>
      </div>
    </section>
  );
}

function Receipts({ T, accent }) {
  const shots = [
    {
      src: 'assets/analytics-views-14m.webp',
      stat: '14.2M',
      label: 'Views, last 90 days',
      sub: 'Nov 13 – Feb 10 · 7.7M accounts reached',
    },
    {
      src: 'assets/analytics-reel-6m.webp',
      stat: '6.2M',
      label: 'Views · single reel',
      sub: '99.7% non-followers · pure reach',
    },
    {
      src: 'assets/analytics-followers.webp',
      stat: '+39.2k',
      label: 'Net follower growth',
      sub: 'Dec 18 – Feb 10 · 43,080 follows',
    },
  ];
  return (
    <section style={{
      padding: '120px 44px',
      borderTop: `1px solid ${T.border}`,
      background: T.bg,
      position: 'relative',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 64 }}>
          <SectionLabel accent={accent}>Receipts</SectionLabel>
          <h2 style={{
            fontFamily: DISPLAY, fontWeight: 600,
            fontSize: 'clamp(28px, 3vw, 44px)', letterSpacing: '-0.025em',
            lineHeight: 1.05, color: T.fg, margin: 0, maxWidth: 900, textWrap: 'balance',
          }}>
            Screenshots, not promises. <span style={{ color: T.fgMuted }}>Dates visible.</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {shots.map((s, i) => (
            <ImageReveal key={i} delay={i * 100}>
              <PhoneCard T={T} accent={accent} {...s}/>
            </ImageReveal>
          ))}
        </div>
        <div style={{
          marginTop: 48, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
          fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.fgMuted,
          flexWrap: 'wrap',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }}/>
          Pulled from @yngsoren · full dashboard available on the call
        </div>
      </div>
    </section>
  );
}

function PhoneCard({ T, accent, src, stat, label, sub }) {
  return (
    <div style={{
      position: 'relative',
      background: T.bgCard,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: 24,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div aria-hidden style={{
        position: 'absolute', left: '50%', top: 80, transform: 'translateX(-50%)',
        width: 320, height: 320, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}33 0%, transparent 65%)`,
        opacity: 0.7, pointerEvents: 'none',
      }}/>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <CountUp target={stat} duration={2200} style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 42, color: T.fg, letterSpacing: '-0.025em', lineHeight: 1 }}/>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: accent }}>
          Verified
        </div>
      </div>
      <div style={{ position: 'relative', marginTop: -10 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 18, color: T.fg, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: T.fgMuted, textTransform: 'uppercase' }}>
          {sub}
        </div>
      </div>

      <div style={{
        position: 'relative', alignSelf: 'center', marginTop: 8,
        width: '78%', maxWidth: 280,
        aspectRatio: '9/19.5',
        background: '#000',
        borderRadius: 28,
        padding: 6,
        boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), 0 0 50px ${accent}22`,
      }}>
        <div style={{
          position: 'relative',
          width: '100%', height: '100%',
          borderRadius: 22,
          overflow: 'hidden',
          background: '#000',
        }}>
          <img src={src} alt={label} loading="lazy" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
          }}/>
          <div aria-hidden style={{
            position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
            width: 80, height: 22, background: '#000', borderRadius: 14, zIndex: 2,
          }}/>
        </div>
      </div>
    </div>
  );
}

function About({ T, accent, portraitUrl }) {
  return (
    <section id="about" className="king-about-section" style={{
      borderTop: `1px solid ${T.border}`,
      background: T.bg,
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="king-about-grid">
          <Portrait T={T} accent={accent} portraitUrl={portraitUrl}/>
          <div>
            <SectionLabel accent={accent}>Who's behind king·</SectionLabel>
            <h2 style={{
              fontFamily: DISPLAY, fontWeight: 600,
              fontSize: 'clamp(28px, 3vw, 44px)', letterSpacing: '-0.025em',
              lineHeight: 1.05, color: T.fg, margin: '16px 0 0', textWrap: 'balance',
            }}>
              I'm Christian. I've been <span style={{ color: accent }}>making content</span> since I was 12.
            </h2>
            <div style={{
              marginTop: 28, fontFamily: DISPLAY, fontSize: 18, lineHeight: 1.6, color: T.fgMuted,
              display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 560,
            }}>
              <p style={{ margin: 0 }}>
                It started with a Minecraft YouTube channel. Every business I've touched
                since has ended up being about content one way or another — because that's
                the only part I've never wanted to stop doing.
              </p>
              <p style={{ margin: 0 }}>
                Most recently: TikTok Shop affiliate, drove <span style={{ color: T.fg, fontWeight: 500 }}>20M+ views</span> and
                <span style={{ color: T.fg, fontWeight: 500 }}> $75k+ in revenue</span> for the brands I promoted.
                Today I run king, where I do the same thing for a select few clients.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Portrait({ T, accent, portraitUrl }) {
  if (!portraitUrl) return <PortraitPlaceholder T={T} accent={accent}/>;
  return (
    <ImageReveal style={{ position: 'relative', aspectRatio: '4 / 5' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: -60,
        background: `radial-gradient(ellipse 60% 55% at 50% 55%, ${accent}66 0%, ${accent}22 35%, transparent 72%)`,
        opacity: 0.6, pointerEvents: 'none', zIndex: 0,
      }}/>
      <div aria-hidden style={{
        position: 'absolute', inset: -16,
        background: `radial-gradient(ellipse 65% 55% at 50% 50%, ${accent}44 0%, transparent 65%)`,
        opacity: 0.5, pointerEvents: 'none', zIndex: 0,
      }}/>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden',
        background: '#0a0810',
        boxShadow: `0 8px 16px rgba(0,0,0,0.35), 0 24px 64px rgba(0,0,0,0.7), 0 48px 100px rgba(0,0,0,0.45), inset 0 0 0 1px ${accent}33`,
        zIndex: 1,
      }}>
        <img src={portraitUrl} alt="" aria-hidden loading="lazy" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          objectPosition: '50% 100%',
          transform: 'scale(1.4) translateY(5%)',
          transformOrigin: '50% 100%',
          filter: 'saturate(0) contrast(1.2) brightness(0.65) sepia(0.15) hue-rotate(220deg)',
        }}/>
        <img src={portraitUrl} alt="Christian" loading="lazy" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          objectPosition: '50% 100%',
          transform: 'scale(1.4) translateY(5%)',
          transformOrigin: '50% 100%',
          filter: 'contrast(1.05) brightness(0.95) saturate(1.1)',
          WebkitMaskImage: 'radial-gradient(ellipse 48% 72% at 50% 62%, black 28%, rgba(0,0,0,0.6) 50%, transparent 72%)',
          maskImage: 'radial-gradient(ellipse 48% 72% at 50% 62%, black 28%, rgba(0,0,0,0.6) 50%, transparent 72%)',
        }}/>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 90% 40% at 50% 115%, ${accent}66 0%, ${accent}22 35%, transparent 60%)`,
          mixBlendMode: 'screen',
        }}/>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 50%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}/>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: 0.12, mixBlendMode: 'overlay', pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
        }}/>
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.8, zIndex: 4,
        }}/>
      </div>
      {[
        { top: -8, left: -8, borderTop: true, borderLeft: true },
        { top: -8, right: -8, borderTop: true, borderRight: true },
        { bottom: -8, left: -8, borderBottom: true, borderLeft: true },
        { bottom: -8, right: -8, borderBottom: true, borderRight: true },
      ].map((pos, i) => {
        const { borderTop, borderRight, borderBottom, borderLeft, ...posStyle } = pos;
        return (
          <div key={i} aria-hidden style={{
            position: 'absolute', width: 14, height: 14, zIndex: 5,
            ...posStyle,
            borderTop: borderTop ? `1px solid ${accent}` : 'none',
            borderRight: borderRight ? `1px solid ${accent}` : 'none',
            borderBottom: borderBottom ? `1px solid ${accent}` : 'none',
            borderLeft: borderLeft ? `1px solid ${accent}` : 'none',
          }}/>
        );
      })}
    </ImageReveal>
  );
}

function PortraitPlaceholder({ T, accent }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14,
    }}>
      <svg width="120" height="160" viewBox="0 0 120 160" fill="none" style={{ opacity: 0.35 }}>
        <circle cx="60" cy="50" r="30" fill="#F3F0EA"/>
        <path d="M10 160 Q10 100 60 100 Q110 100 110 160 Z" fill="#F3F0EA"/>
      </svg>
      <div style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
        color: 'rgba(243,240,234,0.4)', padding: '6px 14px',
        border: '1px dashed rgba(243,240,234,0.2)', borderRadius: 20,
      }}>
        Portrait pending
      </div>
    </div>
  );
}

function Services({ T, accent }) {
  const items = [
    { n: '01', title: 'Content strategy', body: 'We do a deep dive into your market, your audience, and what\'s already working in your space — then build a content plan that\'s completely tailored to you and your brand.' },
    { n: '02', title: 'Production', body: 'Once a week, we sit down with you and record everything. You show up, share your expertise, and we take it from there. No stress on your end.' },
    { n: '03', title: 'Editing & distribution', body: 'We professionally edit every video and post it across your platforms on your behalf. You don\'t lift a finger — your content goes out consistently while you focus on your business.' },
  ];
  return (
    <section className="king-services-section" style={{
      borderTop: `1px solid ${T.border}`,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 72, gap: 40, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 640 }}>
            <SectionLabel accent={accent}>What we do</SectionLabel>
            <h2 style={{
              fontFamily: DISPLAY, fontWeight: 600,
              fontSize: 'clamp(28px, 3vw, 44px)', letterSpacing: '-0.025em',
              lineHeight: 1.05, color: T.fg, margin: 0,
            }}>
              Three things, <br/>done exceptionally well.
            </h2>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: T.fgMuted, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            ~ End-to-end
          </div>
        </div>
        <div className="king-services-grid" style={{ background: T.border, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          {items.map(it => (
            <div key={it.n} className="king-services-card" style={{ background: T.bg, minHeight: 280, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: accent }}>{it.n} /03</div>
              <h3 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 28, letterSpacing: '-0.015em', color: T.fg, margin: '18px 0 16px' }}>{it.title}</h3>
              <p style={{ fontFamily: DISPLAY, fontSize: 16, color: T.fgMuted, lineHeight: 1.55, margin: 0, flex: 1 }}>{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Process({ T, accent }) {
  const steps = [
    { n: '01', tag: 'Kickoff week', title: 'Trial run', body: "Some clients start with a single free content week — one recording, full pipeline, real posts. You see what the output looks like before you commit." },
    { n: '02', tag: 'Month 1', title: 'Test & learn', body: 'First 30 days we post widely across hooks, formats, and angles. Weekly reviews, fast iteration. The feed tells us what\'s real.' },
    { n: '03', tag: 'Month 2+', title: 'Double down', body: 'Kill the formats that died. Amplify what worked. Cadence gets dense, hooks get sharper, and the numbers start compounding.' },
    { n: '04', tag: 'Always', title: 'Report & adjust', body: 'Friday recap: views, saves, followers, inbound. Real numbers, no vanity. Next week adjusts based on what the feed told us.' },
  ];
  return (
    <section style={{ padding: '120px 44px', borderTop: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 72, gap: 40, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 640 }}>
            <SectionLabel accent={accent}>How we work</SectionLabel>
            <h2 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(28px, 3vw, 44px)', letterSpacing: '-0.025em', lineHeight: 1.05, color: T.fg, margin: 0 }}>
              A loop, not a <br/>one-time project.
            </h2>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: T.fgMuted, letterSpacing: 1.5, textTransform: 'uppercase', maxWidth: 320 }}>
            ~ You show up once a week. We run the machine.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {steps.map((s, idx) => (
            <div key={s.n} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: '28px 24px', background: T.bgCard, display: 'flex', flexDirection: 'column', minHeight: 240, position: 'relative' }}>
              {idx < 3 && (
                <div style={{ position: 'absolute', top: 42, right: -11, width: 22, height: 1, background: T.borderStrong, zIndex: 2 }}>
                  <div style={{ position: 'absolute', right: -1, top: -3, width: 7, height: 7, borderTop: `1px solid ${T.borderStrong}`, borderRight: `1px solid ${T.borderStrong}`, transform: 'rotate(45deg)' }}/>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: accent }}>{s.n}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: T.fgMuted, padding: '3px 8px', borderRadius: 3, border: `1px solid ${T.border}` }}>{s.tag}</div>
              </div>
              <h3 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em', color: T.fg, margin: '0 0 12px' }}>{s.title}</h3>
              <p style={{ fontFamily: DISPLAY, fontSize: 15, color: T.fgMuted, lineHeight: 1.55, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Qualify({ T, accent }) {
  const yes = [
    'You have a business that already makes money',
    'You\'re an expert in your field',
    'You\'re willing to show up on camera once a week',
    'You want to play a long game, not rent attention',
  ];
  const no = [
    'You don\'t have an offer behind the content yet',
    'You want viral-for-viral\'s-sake',
    'You want us to write things you don\'t actually believe',
    'You\'re looking for the cheapest option',
  ];
  const Row = ({ items, good }) => (
    <div style={{ background: T.bg, padding: '36px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: good ? accent : 'transparent', border: good ? 'none' : `1px solid ${T.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {good ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.5 7.5L8.5 2.5" stroke="#F3F0EA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2L6 6M6 2L2 6" stroke={T.fgMuted} strokeWidth="1.5" strokeLinecap="round"/></svg>
          )}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: good ? accent : T.fgMuted }}>
          {good ? 'Good fit' : 'Not for us'}
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map(item => (
          <li key={item} style={{ fontFamily: DISPLAY, fontSize: 17, color: good ? T.fg : T.fgMuted, lineHeight: 1.45, paddingLeft: 22, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, top: 10, width: 12, height: 1, background: good ? accent : T.fgFaint }}/>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section style={{ padding: '120px 44px', borderTop: `1px solid ${T.border}`, background: T.bgElev }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 56 }}>
          <SectionLabel accent={accent}>Fit check</SectionLabel>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(28px, 3vw, 44px)', letterSpacing: '-0.025em', lineHeight: 1.05, color: T.fg, margin: 0, maxWidth: 880, textWrap: 'balance' }}>
            I don't take everyone. <span style={{ color: T.fgMuted }}>Here's the line.</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: T.border, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <Row items={yes} good/>
          <Row items={no}/>
        </div>
      </div>
    </section>
  );
}

function FAQ({ T, accent }) {
  const items = [
    {
      q: "You're 18. Do you actually have the experience?",
      a: "I've been making content for 12 years. I was a TikTok Shop affiliate who drove over $75k in revenue and 20M+ views for the brands I promoted. I have a mentor who's worked at the top of this game, and a network of editors who've cut for people like IShowSpeed. The track record is still growing — I'm not pretending otherwise — but when it comes to content, I'm genuinely better than most people twice my age. That's the trade: you get hunger and ability, not a résumé.",
    },
    {
      q: "Can't I just do this myself?",
      a: "Sure. You can learn the hooks, the cuts, the cadence, the distribution — it'll take you 6-12 months and your attention will be split across 40 other things. Or I handle the full pipeline, you show up for 45 minutes a week, and results start this month. I don't do anything magical. I just do it full-time, and you don't have to.",
    },
    {
      q: "What does it cost?",
      a: "Depends on the scope. I currently work on a revenue share + setup fee model, but I'm moving toward flat monthly retainers. We figure out fit on the call, and if it makes sense for both of us, I'll give you the number. I'm not the cheap option — if price is your main criterion, we're not a match.",
    },
    {
      q: "How many clients do you take?",
      a: "Very few, and on purpose. Content done well requires actually caring about the person and the work. I take one new client at a time, give them the full attention, and decide together whether to keep going or wrap it at the end of the month.",
    },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section style={{ padding: '120px 44px', borderTop: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 56 }}>
          <SectionLabel accent={accent}>Common questions</SectionLabel>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(28px, 3vw, 44px)', letterSpacing: '-0.025em', lineHeight: 1.05, color: T.fg, margin: 0 }}>
            The honest answers.
          </h2>
        </div>
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '28px 0',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: T.fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
                  }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em' }}>
                    {it.q}
                  </span>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: `1px solid ${T.borderStrong}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 200ms ease, background 200ms ease',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                    background: isOpen ? accent : 'transparent',
                    borderColor: isOpen ? accent : T.borderStrong,
                    flexShrink: 0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1V11M1 6H11" stroke={isOpen ? '#F3F0EA' : T.fg} strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </span>
                </button>
                <div style={{
                  maxHeight: isOpen ? 400 : 0, overflow: 'hidden',
                  transition: 'max-height 300ms ease',
                }}>
                  <p style={{
                    fontFamily: DISPLAY, fontSize: 17, color: T.fgMuted, lineHeight: 1.6,
                    margin: 0, paddingBottom: 28, maxWidth: 820,
                  }}>
                    {it.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CalendlyEmbed({ url }) {
  const ref = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !ref.current) return;
    initialized.current = true;

    const init = () => {
      window.Calendly.initInlineWidget({ url, parentElement: ref.current });
    };

    if (window.Calendly) {
      init();
    } else {
      const poll = setInterval(() => {
        if (window.Calendly) { clearInterval(poll); init(); }
      }, 100);
      return () => clearInterval(poll);
    }
  }, []);

  return (
    <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: '100%', maxWidth: 760, overflow: 'hidden', height: 700,
        border: '1px solid rgba(124,92,255,0.3)', borderRadius: 12,
      }}>
        <div ref={ref} style={{ width: '100%', height: 700 }}/>
      </div>
    </div>
  );
}

function BookingCTA({ T, accent }) {
  return (
    <section id="book" className="king-booking-section" style={{
      borderTop: `1px solid ${T.border}`,
      background: T.bgAlt,
      position: 'relative', overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, bottom: -80, textAlign: 'center',
        fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(180px, 28vw, 420px)',
        letterSpacing: '-0.04em', color: T.fg, opacity: 0.04, lineHeight: 0.85,
        pointerEvents: 'none', userSelect: 'none',
      }}>
        king·
      </div>
      <div className="king-booking-inner" style={{ maxWidth: 1400, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <SectionLabel accent={accent}>Next step</SectionLabel>
        <h2 style={{
          fontFamily: DISPLAY, fontWeight: 600,
          fontSize: 'clamp(38px, 5vw, 72px)', letterSpacing: '-0.035em',
          lineHeight: 0.98, color: T.fg, margin: 0, textWrap: 'balance',
        }}>
          Book a <br/><span style={{ color: accent }}>free consultation.</span>
        </h2>
        <p style={{
          fontFamily: DISPLAY, fontSize: 19, color: T.fgMuted, lineHeight: 1.5,
          maxWidth: 560, margin: '32px auto 0',
        }}>
          Free &nbsp;·&nbsp; 30 minutes &nbsp;·&nbsp; Online
        </p>
        <CalendlyEmbed url="https://calendly.com/media-by-king/discovery-call?hide_event_type_details=1&hide_gdpr_banner=1" accent={accent}/>
      </div>
    </section>
  );
}

function Footer({ T, accent }) {
  return (
    <footer className="king-footer" style={{
      borderTop: `1px solid ${T.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: 32,
    }}>
      <a href="#top" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <KingDot size={46} color={T.fg} dot={accent}/>
      </a>
      <div className="king-footer-links" style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: 1.5,
      }}>
        <a href="/privacy" style={{ color: 'rgba(243,240,234,0.28)', textDecoration: 'none', textTransform: 'uppercase', transition: 'color 200ms' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(243,240,234,0.55)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(243,240,234,0.28)'}>
          Privacy Policy
        </a>
        <a href="/terms" style={{ color: 'rgba(243,240,234,0.28)', textDecoration: 'none', textTransform: 'uppercase', transition: 'color 200ms' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(243,240,234,0.55)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(243,240,234,0.28)'}>
          Terms of Service
        </a>
      </div>
    </footer>
  );
}

const ACCENT = '#7C5CFF';
const PORTRAIT = 'assets/christian-portrait.webp';

function App() {
  const T = TOKENS.dark;

  useLenis();

  useEffect(() => {
    const h2s = document.querySelectorAll('h2');
    h2s.forEach(h => h.classList.add('king-h2-reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    h2s.forEach(h => io.observe(h));
    return () => io.disconnect();
  }, []);

  return (
    <div style={{ background: T.bg, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Ambient theme="dark" accent={ACCENT}/>
      <ScrollProgress accent={ACCENT}/>
      <div style={{ position: 'relative' }}>
        <Nav T={T} accent={ACCENT} theme="dark"/>
        <Hero T={T} accent={ACCENT} headlineMode="dominate"/>
        <Marquee T={T} accent={ACCENT}/>
        <CaseStudy T={T} accent={ACCENT}/>
        <SorenTestimonial T={T} accent={ACCENT}/>
        <About T={T} accent={ACCENT} portraitUrl={PORTRAIT}/>
        <Services T={T} accent={ACCENT}/>
        <BookingCTA T={T} accent={ACCENT}/>
        <Footer T={T} accent={ACCENT}/>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
