import { useEffect, useRef, useState } from 'react';

/**
 * Vídeos de fundo — prioridade: ficheiro local (opcional), depois Mixkit (uso livre).
 * Para vídeo offline: coloque `printer-bg.mp4` em `frontend/public/login/`.
 */
const VIDEO_SOURCES = [
  '/login/printer-bg.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-person-printing-a-document-on-a-printer-4285-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-printer-printing-a-document-2886-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-printer-printing-a-paper-4785-large.mp4',
];

const POSTERS = ['/login/printer-poster.jpg', '/login/printer-poster-2.jpg'];

export default function LoginBackground() {
  const videoRef = useRef(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [videoActive, setVideoActive] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPosterIndex((i) => (i + 1) % POSTERS.length);
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || sourceIndex >= VIDEO_SOURCES.length) return undefined;

    const onPlaying = () => setVideoActive(true);
    const onError = () => {
      setVideoActive(false);
      setSourceIndex((i) => i + 1);
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);

    video.load();
    video.play().catch(onError);

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
    };
  }, [sourceIndex]);

  const showVideo = videoActive && sourceIndex < VIDEO_SOURCES.length;

  return (
    <div className="login-hud-bg" aria-hidden>
      {!showVideo &&
        POSTERS.map((src, i) => (
          <div
            key={src}
            className={`login-hud-bg__slide ${i === posterIndex ? 'login-hud-bg__slide--active' : ''}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}

      {sourceIndex < VIDEO_SOURCES.length && (
        <video
          ref={videoRef}
          className={`login-hud-bg__video ${showVideo ? 'login-hud-bg__video--visible' : ''}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={POSTERS[0]}
          src={VIDEO_SOURCES[sourceIndex]}
        />
      )}

      <div className="login-hud-bg__overlay" />

      <div className="login-hud-bg__caption">
        <p className="login-hud-bg__tag">Gestão de impressão</p>
        <p className="login-hud-bg__tagline">
          Consumíveis de escritório · Impressoras · PaperCut · Custos
        </p>
      </div>
    </div>
  );
}
