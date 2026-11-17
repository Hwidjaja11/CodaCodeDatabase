/* Sign-in gate for the wiki. Accounts come from accounts.js (salted hashes). */
(function () {
  var KEY = "coda_session";
  var ITERATIONS = 100000;
  var root = document.documentElement;
  var accounts = window.CODA_ACCOUNTS || [];

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  // Must match make_hash() in tools/add_account.py.
  async function derive(user, password, salt) {
    var enc = new TextEncoder();
    var key = await crypto.subtle.importKey("raw", enc.encode(user + ":" + password), "PBKDF2", false, ["deriveBits"]);
    var bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: ITERATIONS }, key, 256);
    return hex(bits);
  }

  function currentSession() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (!s) return null;
      var acct = accounts.find(function (a) { return a.user === s.user && a.hash === s.hash; });
      return acct ? acct.user : null;
    } catch (e) { return null; }
  }

  function signOut() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  function addSignOutButton(user) {
    var header = document.querySelector(".md-header__inner");
    if (!header || document.getElementById("coda-signout")) return;
    var btn = document.createElement("button");
    btn.id = "coda-signout";
    btn.type = "button";
    btn.textContent = "Sign out (" + user + ")";
    btn.addEventListener("click", signOut);
    header.appendChild(btn);
  }

  function showSite(user) {
    root.classList.add("coda-authed");
    var overlay = document.getElementById("coda-login");
    if (overlay) overlay.remove();
    addSignOutButton(user);
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

  function buildLogin() {
    var overlay = document.createElement("div");
    overlay.id = "coda-login";
    overlay.innerHTML =
      '<form class="coda-login__card" autocomplete="on">' +
      '<img src="' + logoUrl() + '" alt="CodaCode Game Dev Studios" class="coda-login__logo">' +
      "<h1>Sign in</h1>" +
      "<p>Enter your account to view the database.</p>" +
      '<label>Username<input name="username" type="text" autocomplete="username" required autofocus></label>' +
      '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>' +
      '<div class="coda-login__error" role="alert"></div>' +
      '<button type="submit">Sign in</button>' +
      "</form>";
    document.body.appendChild(overlay);

    var form = overlay.querySelector("form");
    var error = overlay.querySelector(".coda-login__error");
    var submit = overlay.querySelector("button[type=submit]");

    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      error.textContent = "";
      submit.disabled = true;
      var user = form.username.value.trim();
      var pass = form.password.value;
      var acct = accounts.find(function (a) { return a.user === user; });
      var ok = false;
      try {
        if (acct) ok = (await derive(user, pass, acct.salt)) === acct.hash;
        else await derive(user, pass, "00000000000000000000000000000000"); // same timing either way
      } catch (e) {
        error.textContent = "Sign-in needs a secure (https) connection.";
        submit.disabled = false;
        return;
      }
      if (ok) {
        try { sessionStorage.setItem(KEY, JSON.stringify({ user: acct.user, hash: acct.hash })); } catch (e) {}
        showSite(acct.user);
      } else {
        error.textContent = "Wrong username or password.";
        form.password.value = "";
        setTimeout(function () { submit.disabled = false; }, 1000);
      }
    });
  }

  var user = currentSession();
  if (user) showSite(user); else buildLogin();
})();
