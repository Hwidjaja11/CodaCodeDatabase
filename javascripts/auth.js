/* Sign-in gate for the wiki.
   Two ways in: username + password + database password, or a barcode number + database password.
   Accounts come from accounts.js (salted hashes); barcode numbers come from the shared rules in barcode-core.js. */
(function () {
  var KEY = "coda_session";
  var RECENT_KEY = "coda_recent";
  var RECENT_MS = 5 * 60 * 1000; // a login counts as "recent" for 5 minutes
  var ITERATIONS = 100000;
  var ZERO_SALT = "00000000000000000000000000000000";
  var root = document.documentElement;
  var accounts = window.CODA_ACCOUNTS || [];
  var dbEntry = window.CODA_DB || {};
  var CB = window.CodaBarcode;

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  // Must match derive() in tools/add_account.py.
  async function derive(text, salt) {
    var enc = new TextEncoder();
    var key = await crypto.subtle.importKey("raw", enc.encode(text), "PBKDF2", false, ["deriveBits"]);
    var bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: ITERATIONS }, key, 256);
    return hex(bits);
  }

  // A page refresh always sends you back to the login page.
  function wasReloaded() {
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      if (nav) return nav.type === "reload";
      return performance.navigation && performance.navigation.type === 1;
    } catch (e) { return false; }
  }

  function rememberRecent(info) {
    info.ts = Date.now();
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(info)); } catch (e) {}
  }

  // A login from the last 5 minutes: {kind:"account", user, first} or {kind:"barcode", digits, first}, else null.
  // No passwords are stored.
  function getRecent() {
    try {
      var r = JSON.parse(localStorage.getItem(RECENT_KEY) || "null");
      if (!r || Date.now() - r.ts > RECENT_MS || r.ts > Date.now()) return null;
      if (r.kind === "barcode") {
        return CB && CB.valid(r.digits || "") ? { kind: "barcode", digits: r.digits, first: r.first } : null;
      }
      var a = accounts.find(function (x) { return x.user === r.user; });
      return a ? { kind: "account", user: a.user, first: a.first || a.user } : null;
    } catch (e) { return null; }
  }

  function currentSession() {
    if (wasReloaded()) {
      try { sessionStorage.removeItem(KEY); } catch (e) {}
      return null;
    }
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (!s) return null;
      if (s.kind === "barcode") {
        return s.first && dbEntry.hash && s.dbhash === dbEntry.hash ? { first: s.first, user: s.first } : null;
      }
      var acct = accounts.find(function (a) { return a.user === s.user && a.hash === s.hash; });
      return acct || null;
    } catch (e) { return null; }
  }

  function signOut() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  function addSignOutButton(acct) {
    var header = document.querySelector(".md-header__inner");
    if (!header || document.getElementById("coda-signout")) return;
    var btn = document.createElement("button");
    btn.id = "coda-signout";
    btn.type = "button";
    btn.textContent = "Sign out (" + (acct.first || acct.user) + ")";
    btn.addEventListener("click", signOut);
    header.appendChild(btn);
  }

  function showSite(acct) {
    root.classList.add("coda-authed");
    var overlay = document.getElementById("coda-login");
    if (overlay) overlay.remove();
    addSignOutButton(acct);
  }

  // Resolve the logo relative to this script so it works from any page depth.
  function logoUrl() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || "";
      if (/javascripts\/auth\.js/.test(src)) {
        return new URL("../images/CodaCodeOfficialLogo.png", src).href;
      }
    }
    return "";
  }

  var MIN_LOADING_MS = 3000;
  var STEPS = [
    [0, "Verifying credentials..."],
    [0.35, "Authorizing..."],
    [0.7, "Unlocking the database..."]
  ];

  // Shows a progress bar for at least MIN_LOADING_MS, greets the person by name, then calls done().
  function showProgress(card, done, name) {
    card.innerHTML =
      '<img src="' + logoUrl() + '" alt="" class="coda-login__logo">' +
      '<h1>Authorizing</h1>' +
      '<p class="coda-login__status">' + STEPS[0][1] + '</p>' +
      '<div class="coda-login__bar"><div class="coda-login__fill"></div></div>';
    var fill = card.querySelector(".coda-login__fill");
    var status = card.querySelector(".coda-login__status");
    var start = Date.now();
    (function tick() {
      var t = Math.min((Date.now() - start) / MIN_LOADING_MS, 1);
      fill.style.width = (t * 100) + "%";
      for (var i = STEPS.length - 1; i >= 0; i--) {
        if (t >= STEPS[i][0]) { status.textContent = STEPS[i][1]; break; }
      }
      if (t < 1) { requestAnimationFrame(tick); return; }
      status.textContent = "Unlocked! Welcome, " + name + ".";
      setTimeout(done, 700);
    })();
  }

  function buildLogin() {
    var overlay = document.createElement("div");
    overlay.id = "coda-login";
    overlay.innerHTML =
      '<form class="coda-login__card" autocomplete="on">' +
      '<img src="' + logoUrl() + '" alt="CodaCode Game Dev Studios" class="coda-login__logo">' +
      "<h1>Sign in</h1>" +
      '<p class="coda-login__intro"></p>' +
      '<button type="button" class="coda-login__recent" hidden></button>' +
      '<label class="coda-login__userfield">Username<input name="username" type="text" autocomplete="username" required autofocus></label>' +
      '<label class="coda-login__passfield">Password<input name="password" type="password" autocomplete="current-password" required></label>' +
      '<label class="coda-login__barfield" hidden>Barcode number<input name="barcode" type="text" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000"></label>' +
      '<label>Database password<input name="dbpassword" type="password" autocomplete="off" required></label>' +
      '<div class="coda-login__error" role="alert"></div>' +
      '<button type="button" class="coda-login__switch" hidden>Not you? Use a different account</button>' +
      '<button type="submit">Sign in</button>' +
      '<button type="button" class="coda-login__mode"></button>' +
      "</form>";
    document.body.appendChild(overlay);

    var form = overlay.querySelector("form");
    var error = overlay.querySelector(".coda-login__error");
    var submit = overlay.querySelector("button[type=submit]");
    var recentBtn = overlay.querySelector(".coda-login__recent");
    var switchBtn = overlay.querySelector(".coda-login__switch");
    var modeBtn = overlay.querySelector(".coda-login__mode");
    var intro = overlay.querySelector(".coda-login__intro");
    var userField = overlay.querySelector(".coda-login__userfield");
    var passField = overlay.querySelector(".coda-login__passfield");
    var barField = overlay.querySelector(".coda-login__barfield");
    var mode = "account"; // or "barcode"

    function setMode(m) {
      mode = m;
      var bar = m === "barcode";
      userField.hidden = bar;
      passField.hidden = bar;
      barField.hidden = !bar;
      form.username.required = !bar;
      form.password.required = !bar;
      form.barcode.required = bar;
      intro.textContent = bar ? "Enter your barcode number and the database password."
                              : "Enter your account to view the database.";
      modeBtn.textContent = bar ? "Use username and password instead" : "Use a barcode number instead";
      error.textContent = "";
    }
    setMode("account");

    modeBtn.addEventListener("click", function () {
      setMode(mode === "account" ? "barcode" : "account");
      (mode === "barcode" ? form.barcode : form.username).focus();
    });

    var recent = getRecent();
    if (recent) {
      recentBtn.textContent = "Continue as " + recent.first;
      recentBtn.hidden = false;
      recentBtn.addEventListener("click", function () {
        setMode(recent.kind);
        if (recent.kind === "barcode") {
          form.barcode.value = recent.digits;
          barField.hidden = true;
          form.dbpassword.focus();
        } else {
          form.username.value = recent.user;
          userField.hidden = true;
          form.password.focus();
        }
        recentBtn.hidden = true;
        switchBtn.hidden = false;
        modeBtn.hidden = true;
      });
      switchBtn.addEventListener("click", function () {
        form.username.value = "";
        form.barcode.value = "";
        setMode(mode);
        recentBtn.hidden = false;
        switchBtn.hidden = true;
        modeBtn.hidden = false;
        (mode === "barcode" ? form.barcode : form.username).focus();
      });
    }

    function fail(text, keepTimer) {
      error.textContent = text;
      form.password.value = "";
      form.dbpassword.value = "";
      setTimeout(function () { submit.disabled = false; }, keepTimer === false ? 0 : 1000);
    }

    async function signInWithAccount() {
      var user = form.username.value.trim();
      var pass = form.password.value;
      var dbPass = form.dbpassword.value;
      var acct = accounts.find(function (a) { return a.user === user; });
      var ok = false;
      try {
        // Always run both derivations so timing doesn't reveal which part was wrong.
        var u = await derive(user + ":" + pass, acct ? acct.salt : ZERO_SALT);
        var d = await derive("database:" + dbPass, dbEntry.salt || ZERO_SALT);
        ok = !!acct && !!dbEntry.hash && u === acct.hash && d === dbEntry.hash;
      } catch (e) {
        error.textContent = "Sign-in needs a secure (https) connection.";
        submit.disabled = false;
        return;
      }
      if (!ok) { fail("Incorrect login details."); return; }
      var name = acct.first || acct.user;
      showProgress(form, function () {
        try { sessionStorage.setItem(KEY, JSON.stringify({ user: acct.user, hash: acct.hash })); } catch (e) {}
        rememberRecent({ kind: "account", user: acct.user });
        showSite(acct);
      }, name);
    }

    async function signInWithBarcode() {
      var digits = form.barcode.value.replace(/\D/g, "");
      if (!CB || !CB.valid(digits)) {
        error.textContent = "That barcode number doesn't look right. It has 16 digits.";
        submit.disabled = false;
        return;
      }
      var dbOk = false;
      try {
        var d = await derive("database:" + form.dbpassword.value, dbEntry.salt || ZERO_SALT);
        dbOk = !!dbEntry.hash && d === dbEntry.hash;
      } catch (e) {
        error.textContent = "Sign-in needs a secure (https) connection.";
        submit.disabled = false;
        return;
      }
      if (!dbOk) { fail("Incorrect login details."); return; }
      var data;
      try { data = await CB.load(); }
      catch (e) { error.textContent = "Couldn't load the barcode list. Try again."; submit.disabled = false; return; }
      var num = Number(digits.slice(0, 2));
      var person = data.people.filter(function (p) { return p.num === num; })[0];
      if (!person) { fail("No one is linked to that barcode number."); return; }
      if (CB.codeFor(person, data.codes) !== digits) {
        fail("That card is out of date. Ask for a new one, or sign in with your username.");
        return;
      }
      var first = person.name.replace(/\s*\(Alias\)/, "");
      showProgress(form, function () {
        try { sessionStorage.setItem(KEY, JSON.stringify({ kind: "barcode", first: first, dbhash: dbEntry.hash })); } catch (e) {}
        rememberRecent({ kind: "barcode", digits: digits, first: first });
        showSite({ first: first, user: first });
      }, first);
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      error.textContent = "";
      submit.disabled = true;
      return mode === "barcode" ? signInWithBarcode() : signInWithAccount();
    });
  }

  var session = currentSession();
  if (session) showSite(session); else buildLogin();
})();
