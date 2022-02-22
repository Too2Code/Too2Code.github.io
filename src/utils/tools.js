export function assert(condition, msg) {
  if (!condition) throw new Error(`[Apior] ${msg}`)
}

export function isMobile() {
  const u = navigator.userAgent;
  return (/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent) &&
      !!u.match(/AppleWebKit.*Mobile.*/)) ||
    window.innerWidth <= 768;
}

/**
 * first char uppercase
 */
 export function toUpperCaseFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
