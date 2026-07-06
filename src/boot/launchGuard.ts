/** Pre-flight checks and user-visible errors when the game cannot start. */

export function probeWebGL(): { ok: true } | { ok: false; message: string } {
  if (typeof document === 'undefined') {
    return { ok: false, message: 'Нет DOM — откройте игру в браузере.' };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) {
      return {
        ok: false,
        message:
          'WebGL недоступен. Включите аппаратное ускорение в браузере или обновите видеодрайвер. Chrome: Настройки → Система → «Использовать аппаратное ускорение».',
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: 'Браузер не смог создать WebGL-контекст. Попробуйте Chrome или Edge.',
    };
  }
}

export function showLaunchError(message: string): void {
  const root = document.getElementById('game-container');
  if (!root) return;

  root.innerHTML = `
    <div style="
      max-width: 520px;
      margin: 0 auto;
      padding: 32px 24px;
      color: #fff8e1;
      font-family: 'Segoe UI', Arial, sans-serif;
      text-align: center;
      line-height: 1.5;
    ">
      <div style="font-size: 48px; margin-bottom: 12px;">🪳</div>
      <h1 style="color: #ffa726; font-size: 22px; margin-bottom: 12px;">Жизнь таракана</h1>
      <p style="color: #bcaaa4; margin-bottom: 20px;">${escapeHtml(message)}</p>
      <p style="font-size: 14px; color: #8d6e63;">
        <strong>Как запустить:</strong><br>
        1. Установите <a href="https://nodejs.org" style="color:#ffa726">Node.js</a><br>
        2. Дважды кликните <code style="color:#ffca28">start.bat</code><br>
        3. Откройте <code style="color:#ffca28">http://localhost:5173</code>
      </p>
      <p style="font-size: 12px; color: #6d4c41; margin-top: 16px;">
        Не открывайте index.html напрямую — нужен dev-сервер Vite.
      </p>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function withBootTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
