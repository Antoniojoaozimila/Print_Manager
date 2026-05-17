/**
 * Leitor biométrico — impressão digital realista (traços Lucide).
 * Estados: idle (verde) | scanning | error (vermelho) | success (certo).
 */
import {
  FP_VIEWBOX,
  FINGERPRINT_RIDGES,
  FINGERPRINT_CHECK,
  FINGERPRINT_CHECK_CX,
  FINGERPRINT_CHECK_CY,
  FINGERPRINT_CHECK_R,
} from './fingerprintPaths';

const LABELS = {
  idle: 'Posicione o dedo',
  scanning: 'A validar impressão…',
  error: 'Impressão não reconhecida',
  success: 'Acesso concedido',
};

export default function FingerprintScanner({ state = 'idle' }) {
  const label = LABELS[state] || LABELS.idle;

  return (
    <div
      className={`fp-scanner fp-scanner--${state}`}
      role="img"
      aria-label={label}
      aria-live="polite"
    >
      <div className="fp-scanner__aura" aria-hidden />
      <div className="fp-scanner__beam" aria-hidden />

      <svg className="fp-scanner__svg" viewBox={FP_VIEWBOX} fill="none" aria-hidden>
        <defs>
          <filter id="fp-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="fp-scanner__print" filter="url(#fp-glow)">
          {FINGERPRINT_RIDGES.map((d, i) => (
            <path
              key={i}
              d={d}
              className="fp-scanner__ridge"
              style={{ '--ridge-i': i }}
              pathLength={1}
            />
          ))}
        </g>

        <g className="fp-scanner__success-icon">
          <circle
            className="fp-scanner__check-ring"
            cx={FINGERPRINT_CHECK_CX}
            cy={FINGERPRINT_CHECK_CY}
            r={FINGERPRINT_CHECK_R}
          />
          <path className="fp-scanner__check-mark" d={FINGERPRINT_CHECK} pathLength={1} />
        </g>
      </svg>

      <p className="fp-scanner__status">{label}</p>
    </div>
  );
}
