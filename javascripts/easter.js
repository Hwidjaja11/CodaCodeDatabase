// Secret pages: typing an exact phrase in the search box and pressing Enter opens a hidden page.
// The pages are not in the sidebar and are left out of the search index, so they never show up in results.
(function () {
  var SECRETS = {
    "CrackTheKnuckles": "easter/cracktheknuckles.html",
    "Melcheezedek": "easter/melcheezedek.html"
  };

  function base() {
    var s = document.getElementsByTagName("script");
    for (var i = 0; i < s.length; i++) if (/javascripts\/easter\.js/.test(s[i].src)) return s[i].src.replace(/javascripts\/easter\.js.*$/, "");
    return "";
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains("md-search__input")) return;
    var target = SECRETS[t.value.trim()];
    if (!target || !Object.prototype.hasOwnProperty.call(SECRETS, t.value.trim())) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    location.href = base() + target;
  }, true);
})();
