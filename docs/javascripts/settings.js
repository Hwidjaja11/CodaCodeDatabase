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

  apply(saved());   // applies on every page, including the login screen

  function mount(header) {
    if (!header || document.getElementById("coda-settings")) return;
    var wrap = document.createElement("div");
    wrap.id = "coda-settings";
    wrap.innerHTML =
      '<button type="button" class="coda-settings__btn" aria-label="Settings" aria-expanded="false" title="Settings">⚙</button>' +
      '<div class="coda-settings__panel" hidden>' +
      '<label><input type="checkbox" class="coda-settings__dark"> Dark mode</label>' +
      '</div>';
    header.appendChild(wrap);

    var btn = wrap.querySelector(".coda-settings__btn");
    var panel = wrap.querySelector(".coda-settings__panel");
    var box = wrap.querySelector(".coda-settings__dark");
    box.checked = saved();

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
