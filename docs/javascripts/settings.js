// Settings: a small gear button in the header (next to Sign out) with a dark mode switch.
(function () {
  var KEY = "coda_theme";

  function saved() {
    try { return localStorage.getItem(KEY) === "dark"; } catch (e) { return false; }
  }
  function apply(dark) {
    document.body.setAttribute("data-md-color-scheme", dark ? "slate" : "default");
    document.documentElement.classList.toggle("coda-dark", dark);
  }
  function save(dark) {
    try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch (e) {}
  }

  var FONT_KEY = "coda_font";
  var FONT_HREF = "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;700&display=swap";
  function savedFont() {
    try { return localStorage.getItem(FONT_KEY) === "flex" ? "flex" : "times"; } catch (e) { return "times"; }
  }
  function applyFont(f) {
    document.documentElement.classList.toggle("coda-font-flex", f === "flex");
    if (f === "flex" && !document.getElementById("coda-font-flex")) {   // only fetched if someone picks it
      var l = document.createElement("link");
      l.id = "coda-font-flex"; l.rel = "stylesheet"; l.href = FONT_HREF;
      document.head.appendChild(l);
    }
  }
  function saveFont(f) { try { localStorage.setItem(FONT_KEY, f); } catch (e) {} }

  apply(saved());   // applies on every page, including the login screen
  applyFont(savedFont());

  function mount(header) {
    if (!header || document.getElementById("coda-settings")) return;
    var wrap = document.createElement("div");
    wrap.id = "coda-settings";
    wrap.innerHTML =
      '<button type="button" class="coda-settings__btn" aria-label="Settings" aria-expanded="false" title="Settings">⚙</button>' +
      '<div class="coda-settings__panel" hidden>' +
      '<label><input type="checkbox" class="coda-settings__dark"> Dark mode</label>' +
      '<div class="coda-settings__row"><label for="coda-font-select">Font</label>' +
      '<select id="coda-font-select" class="coda-settings__select">' +
      '<option value="times">Times New Roman (Default)</option>' +
      '<option value="flex">Google Sans Flex</option></select></div>' +
      '</div>';
    header.appendChild(wrap);

    var btn = wrap.querySelector(".coda-settings__btn");
    var panel = wrap.querySelector(".coda-settings__panel");
    var box = wrap.querySelector(".coda-settings__dark");
    box.checked = saved();
    var sel = wrap.querySelector(".coda-settings__select");
    sel.value = savedFont();
    sel.addEventListener("change", function () { applyFont(sel.value); saveFont(sel.value); });

    function setOpen(open) {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(panel.hidden); });
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    box.addEventListener("change", function () { apply(box.checked); save(box.checked); });
  }

  window.CodaSettings = { mount: mount };
})();
