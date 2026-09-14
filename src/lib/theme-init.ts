export const THEME_INIT_SCRIPT = `(function(){try{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.add(d?'dark':'light');document.documentElement.dataset.theme='system';}catch(e){document.documentElement.classList.add('light');}})();`;

/** CSP hash for `THEME_INIT_SCRIPT` (computed once; update if script changes). */
export const THEME_INIT_SCRIPT_HASH =
  "'sha256-YSpnj/YszgWaPaQQA49roNcrGSLGEzOLHI47o5mdbQc='";
