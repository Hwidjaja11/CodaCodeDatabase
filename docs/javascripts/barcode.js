/* Barcode Lookup: decodes the 16-digit number and finds the person in docs/data/people.json.
   Layout: PP L DD A RR RR RR RR CC  (see tools/barcode_numbers.py). */
(function () {
  var root = document.getElementById("barcode-lookup");
  if (!root) return;

  var input = document.getElementById("bc-input");
  var msg = document.getElementById("bc-msg");
  var result = document.getElementById("bc-result");
  var people = [], codes = null;

  var CB = window.CodaBarcode;
  function mod97(d) { return CB.mod97(d); }
  function grouped(n) { return CB.grouped(n); }
  function codeFor(p) { return CB.codeFor(p, codes); }

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
    if (p.all) { var a = el("i"); a.className = "bc-stripe--all"; stripe.appendChild(a); }
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
    msg.className = "bc-msg" + (text ? " bc-msg--error" : "");
    msg.textContent = text;
  }

  // Runs only when Look up is clicked or Enter is pressed (never while typing).
  function lookup() {
    var digits = input.value.replace(/\D/g, "");
    if (!digits) { problem("Type the 16-digit barcode number first."); return; }
    if (digits.length < 16) { problem("That's only " + digits.length + " digits. A barcode number has 16."); return; }
    if (digits.length > 16) { problem("That's more than 16 digits. Check the number under the barcode."); return; }
    if (!codes) { problem("Still loading, try again in a second."); return; }
    if (mod97(digits.slice(0, 14)) !== Number(digits.slice(14))) {
      problem("That number doesn't look right (the check digits don't match). Check for a typo.");
      return;
    }
    var num = Number(digits.slice(0, 2));
    var p = people.filter(function (x) { return x.num === num; })[0];
    if (!p) { problem("No matching barcode: no one in the database is linked to that number."); return; }
    show(p, codeFor(p) === digits, digits);
  }

  document.getElementById("bc-form").addEventListener("submit", function (e) { e.preventDefault(); lookup(); });
  // Editing the number hides any earlier result until you look it up again.
  input.addEventListener("input", function () { result.textContent = ""; msg.textContent = ""; msg.className = "bc-msg"; });
  document.getElementById("bc-clear").addEventListener("click", function () {
    input.value = ""; result.textContent = ""; msg.textContent = ""; msg.className = "bc-msg"; input.focus();
  });

  CB.load()
    .then(function (r) {
      people = r.people; codes = r.codes;
      var hash = decodeURIComponent((location.hash || "").slice(1));
      if (hash) { input.value = hash; lookup(); }   // a link with the number in it is a deliberate look-up
    })
    .catch(function () { problem("Could not load the database."); });
})();
