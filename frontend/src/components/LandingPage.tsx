import { useRef } from 'react';
import Screen from './Screen';
import GithubIcon from './GithubIcon';
import { useFrame } from '../hooks/useFrame';
import { wave } from '../lib/anim';
import p from '../assets/p.png';
import star from '../assets/star.png';
import wordmark from '../assets/wordmark.png';

const SPARK = 'M12 1 Q14 10 23 12 Q14 14 12 23 Q10 14 1 12 Q10 10 12 1Z';
// left, top, length, colour, start delay (seconds)
const SHOOTERS = [[262, 6, 84, '#F0B25E', 0], [236, 2, 64, '#8F72F0', 2.6], [290, 56, 56, '#5A32C6', 5.1]] as const;
// left, top, colour, phase offset
const TWINKLES = [[78, 26, '#B7A3F5', 0], [40, 100, '#F0B25E', 1.7], [246, 92, '#B7A3F5', 3.1]] as const;
const CHIPS = [['Fonts', 'var(--p1)'], ['Color', 'var(--p2)'], ['Spacing', 'var(--p4)'], ['Contrast', 'var(--p3)']] as const;

export default function LandingPage({ onGithub }: { onGithub: () => void }) {
  const els = useRef<Record<string, HTMLElement | SVGElement | null>>({});
  const ref = (id: string) => (el: HTMLElement | SVGElement | null) => { els.current[id] = el; };

  useFrame((t) => {
    const put = (id: string, transform?: string, opacity?: number) => {
      const e = els.current[id] as HTMLElement | null;
      if (!e) return;
      if (transform !== undefined) e.style.transform = transform;
      if (opacity !== undefined) e.style.opacity = opacity.toFixed(2);
    };
    const f = wave(6, 0, t), sp = wave(3.2, 0, t), w = wave(7, 0, t);
    put('logo', `translateY(${(-4 * f).toFixed(1)}px)`);
    put('star', `scale(${(1 + 0.14 * sp).toFixed(3)})`, 0.8 + 0.2 * sp);
    put('moon', `translateY(${(-2 * w).toFixed(1)}px) rotate(${(-3 + 6 * w).toFixed(1)}deg)`);
    put('glow', `scale(${(0.95 + 0.12 * w).toFixed(2)})`, 0.4 + 0.3 * w);

    SHOOTERS.forEach(([, , , , delay], i) => {
      const P = 7.5;
      const ph = ((((t - delay) % P) + P) % P) / P;
      const run = Math.min(ph / 0.22, 1);
      let o = 0;
      if (ph < 0.03) o = (ph / 0.03) * 0.85;
      else if (ph < 0.14) o = 0.85;
      else if (ph < 0.22) o = 0.85 * (1 - (ph - 0.14) / 0.08);
      const d = Math.pow(run, 1.4);
      put('sh' + i, `translate(${(-175 * d).toFixed(1)}px,${(89 * d).toFixed(1)}px)`, o);
    });
    TWINKLES.forEach(([, , , off], i) => {
      const v = wave(4.5, off, t);
      put('tw' + i, `scale(${(0.8 + 0.25 * v).toFixed(2)})`, 0.25 + 0.65 * v);
    });
  });

  return (
    <Screen>
    <div className="parity-landing">
      <div className="parity-landing-card mx-auto mt-3 w-full max-w-[300px] rounded-2xl bg-white pb-4 shadow-[0_10px_30px_rgba(90,50,198,.14)]">
        {/* animation stage */}
        <div className="parity-logo-stage relative h-40 overflow-hidden rounded-t-[22px]" aria-hidden="true">
          <svg ref={ref('moon')} viewBox="0 0 24 24" width="38" height="38" className="absolute" style={{ left: 23, top: 21 }}>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="#F0B25E" />
          </svg>
          {TWINKLES.map(([x, y, c], i) => (
            <svg key={i} ref={ref('tw' + i)} viewBox="0 0 24 24" width="12" height="12" className="absolute" style={{ left: x, top: y }}>
              <path d={SPARK} fill={c} />
            </svg>
          ))}
          {SHOOTERS.map(([x, y, len, c], i) => (
            <div key={i} ref={ref('sh' + i)} className="absolute opacity-0" style={{ left: x, top: y }}>
              <div className="relative h-0.5" style={{ width: len, transform: 'rotate(-27deg)', transformOrigin: 'left center' }}>
                <div className="absolute left-0 top-0 h-0.5 rounded-sm" style={{ width: len, background: `linear-gradient(270deg, rgba(255,255,255,0), ${c})` }} />
                <div className="absolute rounded-full" style={{ left: -2, top: -1.5, width: 5, height: 5, background: c, boxShadow: `0 0 6px 1px ${c}` }} />
              </div>
            </div>
          ))}
          <div className="absolute left-1/2 top-[38px] -ml-[54px] h-28 w-[108px]" ref={ref('logo')} style={{ transformOrigin: '54px 108px' }}>
            <img src={p} alt="" className="absolute left-0 top-0 block h-28 w-[108px]" />
            <img ref={ref('star')} src={star} alt="" className="absolute left-0 top-0 block h-28 w-[108px]" style={{ transformOrigin: '48.8px 50.7px' }} />
          </div>
        </div>

        <img src={wordmark} alt="Parity" className="mx-auto -mt-1 block h-11 w-auto" />
        <ul className="m-0 mt-3 flex list-none flex-wrap justify-center gap-1.5 p-0 px-3">
          {CHIPS.map(([label, color]) => (
            <li key={label} className="flex items-center gap-1.5 rounded-full bg-[#F3F0FF] px-2.5 py-1.5 text-[11px] font-semibold">
              <i className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{label}
            </li>
          ))}
        </ul>
      </div>

      <div className="parity-landing-actions mx-auto mt-4 w-full max-w-[300px]">
        <h1 className="m-0 text-2xl font-extrabold leading-[1.1] tracking-[-.02em]">Design and build, in sync.</h1>
        <p className="mb-0 mt-1.5 text-xs text-[var(--muted)]">Sign in to compare your site with your Figma file.</p>
        <button type="button" onClick={onGithub}
          className="mt-4 flex h-11 w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(90,50,198,.3)]">
          <GithubIcon />Continue with GitHub
        </button>
      </div>

      <div className="parity-landing-spacer flex-1" />

      <p className="m-0 text-center text-[11px] text-[var(--muted)]">
        Free for individuals &middot; No credit card needed
      </p>

    </div> {/* Closes parity-landing */}
    </Screen>
  );
}