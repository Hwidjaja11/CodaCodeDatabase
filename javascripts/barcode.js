/* Barcode Lookup: decodes the 16-digit number and finds the person in docs/data/people.json.
   Layout: PP L DD A RR RR RR RR CC  (see tools/barcode_numbers.py). */
(function () {
  var root = document.getElementById("barcode-lookup");
  if (!root) return;

  var input = document.getElementById("bc-input");
  var msg = document.getElementById("bc-msg");
  var result = document.getElementById("bc-result");
  var people = [], codes = null;

  function dataUrl(file) {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (/javascripts\/barcode\.js/.test(scripts[i].src)) return new URL("../data/" + file, scripts[i].src).href;
    }
    return "data/" + file;
  }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
  function mod97(digits) { var r = 0; for (var i = 0; i < digits.length; i++) r = (r * 10 + Number(digits[i])) % 97; return r; }
  function grouped(n) { return n.replace(/(\d{4})(?=\d)/g, "$1 "); }

  // Same rules as barcode_number() in tools/barcode_numbers.py
  function codeFor(p) {
    var mask = 0;
    p.departments.forEach(function (d) { mask += codes.departments[d] || 0; });
    var s = pad(p.num, 2) + (p.rank || 0) + pad(mask, 2) + (p.all ? 1 : 0);
    for (var i = 0; i < 4; i++) {
      var r = p.roles[i];
      s += pad(r ? codes.roles.indexOf(r) + 1 : 0, 2);
    }
    return s + pad(mod97(s), 2);
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function show(p, upToDate, digits) {
    result.textContent = "";
    var card = el("div", "bc-card");
    var stripe = el("div", "bc-stripe");
    p.departments.forEach(function (d) { var i = el("i"); i.className = "bc-stripe--" + d.toLowerCase(); stripe.appendChild(i); });
    card.appendChild(stripe);

    var body = el("div", "bc-body");
    body.appendChild(el("h2", "bc-name", p.name.replace(" (Alias)", "")));
    if (/\(Alias\)/.test(p.name)) body.appendChild(el("div", "bc-alias", "(Alias)"));

    function row(label, node) {
      var r = el("div", "bc-row");
      r.appendChild(el("span", "bc-label", label));
      var v = el("span", "bc-value");
      if (typeof node === "string") v.textContent = node; else v.appendChild(node);
      r.appendChild(v);
      body.appendChild(r);
    }
    row("Executive Level", p.rank ? String(p.rank) : "None (team member)");
    row("Main Role(s)", p.roles.join(", "));
    var chips = el("span");
    if (p.all) chips.appendChild(el("span", "dir-chip dir-chip--all", "All"));
    p.departments.forEach(function (d) { chips.appendChild(el("span", "dir-chip dir-chip--" + d.toLowerCase(), d)); });
    row("Main Department(s)", chips);
    row("Barcode", grouped(digits));

    var link = el("a", "bc-link", "Open " + p.name.replace(" (Alias)", "") + "'s page →");
    link.href = p.page + ".html";
    body.appendChild(link);
    card.appendChild(body);
    result.appendChild(card);

    msg.className = "bc-msg" + (upToDate ? "" : " bc-msg--warn");
    msg.textContent = upToDate ? "" :
      "Heads up: this card's details are out of date. The details below are the current ones from the database.";
  }

  function problem(text) {
    result.textContent = "";
    msg.className = "bc-msg";
    msg.textContent = text;
  }

  function lookup() {
    var digits = input.value.replace(/\D/g, "");
    if (!digits) { problem(""); return; }
    if (digits.length < 16) { problem(digits.length + " of 16 digits entered..."); return; }
    if (digits.length > 16) { problem("That's more than 16 digits. Check the number under the barcode."); return; }
    if (!codes) { problem("Still loading, try again in a second."); return; }
    if (mod97(digits.slice(0, 14)) !== Number(digits.slice(14))) {
      problem("That number doesn't look right (the check digits don't match). Check for a typo.");
      return;
    }
    var num = Number(digits.slice(0, 2));
    var p = people.filter(function (x) { return x.num === num; })[0];
    if (!p) { problem("No one in the database is linked to that barcode."); return; }
    show(p, codeFor(p) === digits, digits);
  }

  document.getElementById("bc-form").addEventListener("submit", function (e) { e.preventDefault(); lookup(); });
  input.addEventListener("input", lookup);
  document.getElementById("bc-clear").addEventListener("click", function () { input.value = ""; problem(""); input.focus(); });

  Promise.all([fetch(dataUrl("people.json")).then(function (r) { return r.json(); }),
               fetch(dataUrl("codes.json")).then(function (r) { return r.json(); })])
    .then(function (r) {
      people = r[0]; codes = r[1];
      var hash = decodeURIComponent((location.hash || "").slice(1));
      if (hash) { input.value = hash; }
      lookup();
    })
    .catch(function () { problem("Could not load the database."); });
})();
