/* Shared barcode-number rules (same as tools/barcode_numbers.py).
   Layout: PP L DD A RR RR RR RR CC  (person, level, departments, all-flag, 4 roles, check digits). */
(function () {
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
  function mod97(digits) { var r = 0; for (var i = 0; i < digits.length; i++) r = (r * 10 + Number(digits[i])) % 97; return r; }

  function dataUrl(file) {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (/javascripts\/barcode-core\.js/.test(scripts[i].src)) return new URL("../data/" + file, scripts[i].src).href;
    }
    return "data/" + file;
  }

  var cache = null;
  window.CodaBarcode = {
    pad: pad,
    mod97: mod97,
    grouped: function (n) { return n.replace(/(\d{4})(?=\d)/g, "$1 "); },
    // 16 digits with matching check digits (does not check that anyone owns the number)
    valid: function (digits) {
      return /^\d{16}$/.test(digits) && mod97(digits.slice(0, 14)) === Number(digits.slice(14));
    },
    codeFor: function (p, codes) {
      var mask = 0;
      p.departments.forEach(function (d) { mask += codes.departments[d] || 0; });
      var s = pad(p.num, 2) + (p.rank || 0) + pad(mask, 2) + (p.all ? 1 : 0);
      for (var i = 0; i < 4; i++) {
        var r = p.roles[i];
        s += pad(r ? codes.roles.indexOf(r) + 1 : 0, 2);
      }
      return s + pad(mod97(s), 2);
    },
    // Loads people.json and codes.json once. Resolves to {people, codes}.
    load: function () {
      if (!cache) {
        cache = Promise.all([
          fetch(dataUrl("people.json")).then(function (r) { return r.json(); }),
          fetch(dataUrl("codes.json")).then(function (r) { return r.json(); })
        ]).then(function (r) { return { people: r[0], codes: r[1] }; })
          .catch(function (e) { cache = null; throw e; });
      }
      return cache;
    }
  };

  // Person pages show their barcode number in <a class="barcode-number" data-page="name">.
  // The page text is a fallback; this keeps it matching people.json (e.g. after roles change).
  function fillPageNumbers() {
    var els = document.querySelectorAll(".barcode-number[data-page]");
    if (!els.length) return;
    window.CodaBarcode.load().then(function (r) {
      Array.prototype.forEach.call(els, function (el) {
        var p = r.people.filter(function (x) { return x.page === el.getAttribute("data-page"); })[0];
        if (!p) return;
        var n = window.CodaBarcode.codeFor(p, r.codes);
        el.textContent = window.CodaBarcode.grouped(n);
        el.setAttribute("href", "barcode.html#" + n);
      });
    }).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fillPageNumbers);
  else fillPageNumbers();
})();
