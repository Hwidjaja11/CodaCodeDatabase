// Shared helpers for the Fun pages (quiz, hangman, two truths).
// Loads docs/data/people.json and docs/data/departments.json so every game stays up to date.
(function () {
  function base() {
    var s = document.getElementsByTagName("script");
    for (var i = 0; i < s.length; i++) if (/javascripts\/fun-data\.js/.test(s[i].src)) return new URL("../data/", s[i].src).href;
    return "data/";
  }
  function get(name) { return fetch(base() + name).then(function (r) { return r.json(); }); }

  var F = window.CodaFun = {
    load: function () {
      return Promise.all([get("people.json"), get("departments.json")]).then(function (r) {
        var people = r[0], cfg = r[1], leaders = [];
        cfg.departments.forEach(function (d) {
          (d.leaders || []).forEach(function (l) { leaders.push({ short: l.person, title: l.title, dept: d.name }); });
        });
        var byShort = {};
        people.forEach(function (p) { byShort[F.short(p.name)] = p; });
        leaders.forEach(function (l) { l.person = byShort[l.short] || null; });
        leaders = leaders.filter(function (l) { return l.person; });
        return { people: people, depts: cfg.departments, leaders: leaders,
                 allDepts: F.uniq(F.flat(people.map(function (p) { return p.departments; }))),
                 allRoles: F.uniq(F.flat(people.map(function (p) { return p.roles; }))) };
      });
    },
    short: function (n) { return String(n).split(" (")[0]; },
    el: function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; },
    shuffle: function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; },
    pick: function (a, n) { return F.shuffle(a).slice(0, n); },
    rnd: function (a) { return a[Math.floor(Math.random() * a.length)]; },
    uniq: function (a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); },
    flat: function (a) { return [].concat.apply([], a); },
    has: function (arr, x) { return arr.indexOf(x) >= 0; },
    pad2: function (n) { return (n < 10 ? "0" : "") + n; }
  };
})();
