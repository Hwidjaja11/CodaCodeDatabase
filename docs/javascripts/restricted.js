// RESTRICTED section: cards are stored encrypted (AES-GCM). The password unlocks them in the browser.
(function () {
  var root = document.getElementById("restricted");
  if (!root) return;
  var F = window.CodaFun, el = F.el;
  var urls = [];   // blob URLs, revoked on lock

  function base() {
    var s = document.getElementsByTagName("script");
    for (var i = 0; i < s.length; i++) if (/javascripts\/restricted\.js/.test(s[i].src)) return new URL("../restricted/", s[i].src).href;
    return "restricted/";
  }
  function hex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function nice(iso) {
    try { return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); } catch (e) { return iso; }
  }

  // ---- minimal ZIP writer (stored, no compression: PNGs are already compressed) ----
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {   // files: [{name, data: Uint8Array}]
    var enc = new TextEncoder(), parts = [], central = [], offset = 0, d = new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, name, f.data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
      c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(c.buffer, name);
      offset += 30 + name.length + size;
    });
    var csize = central.reduce(function (n, p) { return n + (p.byteLength || p.length); }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [e.buffer]), { type: "application/zip" });
  }

  function download(url, name) {
    var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  // ---- unlocking ----
  function unlock(password, status) {
    var b = base();
    return fetch(b + "cards.json").then(function (r) { return r.json(); }).then(function (m) {
      return crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]).then(function (k) {
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt: hex(m.salt), iterations: m.iterations, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      }).then(function (key) {
        var out = [], chain = Promise.resolve();
        m.cards.forEach(function (c, i) {
          chain = chain.then(function () {
            status("Unlocking card " + (i + 1) + " of " + m.cards.length + "...");
            return fetch(b + c.file).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
              var u = new Uint8Array(buf);
              return crypto.subtle.decrypt({ name: "AES-GCM", iv: u.slice(0, 12) }, key, u.slice(12));
            }).then(function (plain) { out.push({ card: c, bytes: new Uint8Array(plain) }); });
          });
        });
        return chain.then(function () { return out; });
      });
    });
  }

  function showGate(msg) {
    root.innerHTML = "";
    var form = el("form", "rs-gate");
    form.appendChild(el("h2", "rs-h", "Restricted"));
    form.appendChild(el("p", "rs-p", "Enter the restricted password to open the ID cards."));
    var label = el("label", "", "Restricted password"), input = document.createElement("input");
    input.type = "password"; input.autocomplete = "off"; input.required = true; label.appendChild(input);
    var btn = el("button", "rs-btn", "Unlock"); btn.type = "submit";
    var err = el("div", "rs-err", msg || ""); err.setAttribute("role", "alert");
    form.appendChild(label); form.appendChild(btn); form.appendChild(err);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      btn.disabled = true; err.style.color = ""; err.textContent = "Checking...";
      unlock(input.value, function (t) { err.textContent = t; }).then(showCards, function () {
        btn.disabled = false; input.value = ""; err.style.color = ""; err.textContent = "Incorrect restricted password."; input.focus();
      });
    });
    root.appendChild(form); input.focus();
  }

  function showCards(items) {
    root.innerHTML = "";
    var bar = el("div", "rs-bar");
    var all = el("button", "rs-btn", "Download all (.zip)"); all.type = "button";
    var lock = el("button", "rs-btn rs-btn--ghost", "Lock"); lock.type = "button";
    bar.appendChild(all); bar.appendChild(lock);
    bar.appendChild(el("span", "rs-count", items.length + " ID cards"));
    root.appendChild(bar);

    var grid = el("div", "rs-grid");
    items.forEach(function (it) {
      var url = URL.createObjectURL(new Blob([it.bytes], { type: "image/png" })); urls.push(url); it.url = url;
      var c = it.card, box = el("div", "rs-card");
      var img = el("img", "rs-img"); img.src = url; img.alt = "ID card for " + c.name; box.appendChild(img);
      var meta = el("div", "rs-meta");
      meta.appendChild(el("div", "rs-name", c.name));
      meta.appendChild(el("div", "rs-date", "Made: " + nice(c.made)));
      meta.appendChild(el("div", "rs-date", "Updated: " + nice(c.updated)));
      var dl = el("button", "rs-btn rs-btn--small", "Download PNG"); dl.type = "button";
      dl.addEventListener("click", function () { download(url, c.download); });
      meta.appendChild(dl); box.appendChild(meta); grid.appendChild(box);
    });
    root.appendChild(grid);

    all.addEventListener("click", function () {
      var blob = zip(items.map(function (it) { return { name: it.card.download, data: it.bytes }; }));
      var u = URL.createObjectURL(blob); download(u, "CodaCode-ID-Cards.zip"); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    });
    lock.addEventListener("click", function () { urls.forEach(URL.revokeObjectURL, URL); urls = []; showGate(); });
  }

  showGate();
})();
