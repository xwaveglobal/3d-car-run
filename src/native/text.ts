/**
 * v3 native: ask the player for a short text (pilot name). The mini game has no <input>:
 * tt.showModal with an editable field (allowed API), else the mini-game keyboard (tt.showKeyboard),
 * else the browser prompt (desktop preview).
 * v4.0.2 (owner: "tap the name → no change (offline?)"): some runtimes open the modal without an editable
 * field (or fail it) — the answer then has no text. That now falls through to the system keyboard, which
 * is fully local (works offline), instead of silently doing nothing.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const GameGlobal: any;

export function askText(title: string, current: string, max = 14): Promise<string | null> {
  const G: any = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
  const T = G.tt;
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: unknown) => {
      if (settled) return;
      settled = true;
      resolve(typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
    };
    try {
      if (T?.showModal) {
        T.showModal({
          title,
          content: current,
          editable: true,
          placeholderText: current || title,
          showCancel: true,
          success: (r: any) => {
            if (!r || !r.confirm) return done(null); // cancelled
            if (typeof r.content === 'string') return done(r.content);
            keyboard(); // confirmed, but this runtime gave no editable text
          },
          fail: (e: any) => {
            console.warn('[name] showModal', e?.errMsg ?? e);
            keyboard();
          },
        });
        return;
      }
    } catch (e) {
      console.warn('[name] showModal', e);
    }
    keyboard();

    function keyboard() {
      if (!T?.showKeyboard || !T?.onKeyboardConfirm) return fallback();
      try {
        const off = () => {
          try {
            T.offKeyboardConfirm?.(onOk);
            T.offKeyboardComplete?.(onEnd);
          } catch {
            /* ignore */
          }
        };
        const onOk = (r: any) => {
          off();
          T.hideKeyboard?.({});
          done(r?.value);
        };
        const onEnd = (r: any) => {
          off();
          done(r?.value ?? null);
        };
        T.onKeyboardConfirm(onOk);
        T.onKeyboardComplete?.(onEnd);
        T.showKeyboard({
          defaultValue: current,
          maxLength: max,
          multiple: false,
          confirmHold: false,
          confirmType: 'done',
          fail: (e: any) => {
            console.warn('[name] showKeyboard', e?.errMsg ?? e);
            off();
            fallback();
          },
        });
      } catch (e) {
        console.warn('[name] showKeyboard', e);
        fallback();
      }
    }
    function fallback() {
      try {
        done(typeof G.prompt === 'function' ? G.prompt(title, current) : null);
      } catch {
        done(null);
      }
    }
  });
}
