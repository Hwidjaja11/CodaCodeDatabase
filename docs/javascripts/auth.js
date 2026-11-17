/* Sign-in gate for the wiki. Accounts come from accounts.js (salted hashes). */
(function () {
  var KEY = "coda_session";
  var RECENT_KEY = "coda_recent";
  var RECENT_MS = 5 * 60 * 1000; // a login counts as "recent" for 5 minutes
  var ITERATIONS = 100000;
  var root = document.documentElement;
  var accounts = window.CODA_ACCOUNTS || [];
  var dbEntry = window.CODA_DB || {};

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

  function rememberRecent(acct) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify({ user: acct.user, ts: Date.now() })); } catch (e) {}
  }

  // Returns the account of a login from the last 5 minutes, or null. No passwords are stored.
  function getRecent() {
    try {
      var r = JSON.parse(localStorage.getItem(RECENT_KEY) || "null");
      if (!r || Date.now() - r.ts > RECENT_MS || r.ts > Date.now()) return null;
      return accounts.find(function (a) { return a.user === r.user; }) || null;
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

  // Shows a progress bar for at least MIN_LOADING_MS, then calls done().
  function showProgress(card, done) {
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
      status.textContent = "Unlocked!";
      setTimeout(done, 350);
    })();
  }

  function buildLogin() {
    var overlay = document.createElement("div");
    overlay.id = "coda-login";
    overlay.innerHTML =
      '<form class="coda-login__card" autocomplete="on">' +
      '<img src="' + logoUrl() + '" alt="CodaCode Game Dev Studios" class="coda-login__logo">' +
      "<h1>Sign in</h1>" +
      "<p>Enter your account to view the database.</p>" +
      '<button type="button" class="coda-login__recent" hidden></button>' +
      '<label class="coda-login__userfield">Username<input name="username" type="text" autocomplete="username" required autofocus></label>' +
      '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>' +
      '<label>Database password<input name="dbpassword" type="password" autocomplete="off" required></label>' +
      '<div class="coda-login__error" role="alert"></div>' +
      '<button type="button" class="coda-login__switch" hidden>Not you? Use a different account</button>' +
      '<button type="submit">Sign in</button>' +
      "</form>";
    document.body.appendChild(overlay);

    var form = overlay.querySelector("form");
    var error = overlay.querySelector(".coda-login__error");
    var submit = overlay.querySelector("button[type=submit]");
    var recentBtn = overlay.querySelector(".coda-login__recent");
    var switchBtn = overlay.querySelector(".coda-login__switch");
    var userField = overlay.querySelector(".coda-login__userfield");

    var recent = getRecent();
    if (recent) {
      recentBtn.textContent = "Continue as " + (recent.first || recent.user);
      recentBtn.hidden = false;
      recentBtn.addEventListener("click", function () {
        form.username.value = recent.user;
        userField.hidden = true;
        recentBtn.hidden = true;
        switchBtn.hidden = false;
        form.password.focus();
      });
      switchBtn.addEventListener("click", function () {
        form.username.value = "";
        userField.hidden = false;
        recentBtn.hidden = false;
        switchBtn.hidden = true;
        form.username.focus();
      });
    }

    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      error.textContent = "";
      submit.disabled = true;
      var user = form.username.value.trim();
      var pass = form.password.value;
      var dbPass = form.dbpassword.value;
      var acct = accounts.find(function (a) { return a.user === user; });
      var ok = false;
      try {
        // Always run both derivations so timing doesn't reveal which part was wrong.
        var u = await derive(user + ":" + pass, acct ? acct.salt : "00000000000000000000000000000000");
        var d = await derive("database:" + dbPass, dbEntry.salt || "00000000000000000000000000000000");
        ok = !!acct && !!dbEntry.hash && u === acct.hash && d === dbEntry.hash;
      } catch (e) {
        error.textContent = "Sign-in needs a secure (https) connection.";
        submit.disabled = false;
        return;
      }
      if (ok) {
        showProgress(form, function () {
          try { sessionStorage.setItem(KEY, JSON.stringify({ user: acct.user, hash: acct.hash })); } catch (e) {}
          rememberRecent(acct);
          showSite(acct);
        });
      } else {
        error.textContent = "Incorrect login details.";
        form.password.value = "";
        form.dbpassword.value = "";
        setTimeout(function () { submit.disabled = false; }, 1000);
      }
    });
  }

  var session = currentSession();
  if (session) showSite(session); else buildLogin();
})();
