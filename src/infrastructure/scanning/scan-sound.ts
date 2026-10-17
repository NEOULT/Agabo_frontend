/**
 * Aviso sonoro del escaneo por teléfono.
 *
 * Sintetiza el "twick" de caja registradora con la Web Audio API: sin archivo de
 * audio, sin red y sin CORS. Es el aviso principal del cajero, que tiene la
 * cabeza en el producto y no mira la pantalla; la vibración no basta (iOS no la
 * soporta y Android la ignora en varios contextos).
 *
 * Los navegadores dejan el `AudioContext` en `suspended` hasta un gesto real del
 * usuario, así que hay que llamar a `unlockScanAudio()` **dentro de un toque**.
 * Mientras no esté desbloqueado, los avisos no suenan (y no lanzan error).
 */

/** Descripción de un tono: frecuencia, forma de onda y envolvente. */
interface ToneOptions {
  /** Frecuencia inicial, en Hz. */
  frequency: number;
  /** Frecuencia final del barrido; sin valor, el tono es plano. */
  toFrequency?: number;
  type: OscillatorType;
  /** Volumen máximo de la envolvente (0 a 1). */
  peak: number;
  /** Duración total, en segundos. */
  duration: number;
  /** Retardo respecto a ahora, en segundos. */
  delay?: number;
}

let audioContext: AudioContext | null = null;

function createContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const scope = window as unknown as {
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };
  // Safari antiguo expone `webkitAudioContext`.
  const ContextConstructor = scope.AudioContext ?? scope.webkitAudioContext;

  return ContextConstructor ? new ContextConstructor() : null;
}

function getContext(): AudioContext | null {
  if (!audioContext) {
    audioContext = createContext();
  }

  return audioContext;
}

/** Contexto listo para sonar, o `null` si el navegador aún no lo desbloqueó. */
function runningContext(): AudioContext | null {
  const current = getContext();
  return current && current.state === 'running' ? current : null;
}

function playTone(current: AudioContext, tone: ToneOptions): void {
  const start = current.currentTime + (tone.delay ?? 0);
  const oscillator = current.createOscillator();
  const gain = current.createGain();

  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(tone.frequency, start);

  if (tone.toFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      tone.toFrequency,
      start + tone.duration * 0.7,
    );
  }

  // Ataque casi inmediato y caída corta: el "tick" seco de una caja registradora.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(tone.peak, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

  oscillator.connect(gain);
  gain.connect(current.destination);

  oscillator.start(start);
  oscillator.stop(start + tone.duration + 0.02);
}

/**
 * Desbloquea el audio del navegador.
 *
 * Debe llamarse dentro de un gesto del usuario (un toque). Devuelve `true` si
 * quedó listo para sonar.
 */
export async function unlockScanAudio(): Promise<boolean> {
  const current = getContext();
  if (!current) return false;

  if (current.state === 'suspended') {
    try {
      await current.resume();
    } catch {
      return false;
    }
  }

  return current.state === 'running';
}

/** "Twick" de caja: chirp agudo y corto para un código registrado. */
export function playScanSuccess(): void {
  const current = runningContext();
  if (!current) return;

  playTone(current, {
    frequency: 2400,
    toFrequency: 3800,
    type: 'square',
    peak: 0.28,
    duration: 0.07,
  });
}

/** Aviso grave y doble para un escaneo que no llegó a registrarse. */
export function playScanError(): void {
  const current = runningContext();
  if (!current) return;

  const buzz: ToneOptions = {
    frequency: 320,
    toFrequency: 200,
    type: 'sawtooth',
    peak: 0.2,
    duration: 0.15,
  };

  playTone(current, buzz);
  playTone(current, { ...buzz, delay: 0.19 });
}
