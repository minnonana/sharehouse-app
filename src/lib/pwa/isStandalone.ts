/** iPhone Safari から直接開いているか（＝ホーム画面アイコンからではないか）を判定する */
export function isIosNotStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isStandalone =
    nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  return isIos && !isStandalone;
}
