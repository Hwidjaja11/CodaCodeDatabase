"""Builds the Org Chart page from docs/data/people.json and docs/data/departments.json.

MkDocs runs this on every build (so on every deploy). Put <!-- org-chart --> in a page
and it is replaced by the chart. Nothing here needs editing when people change.
"""
import html
import json
import logging
import os

log = logging.getLogger("mkdocs.hooks.org_chart")
MARKER = "<!-- org-chart -->"
SHORT = lambda name: name.split(" (")[0]          # "Ch3rry (Alias)" -> "Ch3rry" for matching


def _load(docs_dir, name):
    with open(os.path.join(docs_dir, "data", name), encoding="utf-8") as f:
        return json.load(f)


def _e(text):
    return html.escape(str(text))


def _leader_lines(leaders, by_short):
    """'Claire and Amelia - Lead Writers' (people with the same title are grouped)."""
    groups = {}
    for ld in leaders:
        if ld["person"] not in by_short:
            log.warning("departments.json: leader %r is not in people.json", ld["person"])
        groups.setdefault(ld["title"], []).append(ld["person"])
    lines = []
    for title, names in groups.items():
        who = names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]
        lines.append(f"{who} – {title}{'s' if len(names) > 1 else ''}")
    return lines


def _list(items):
    return '<ul class="org-people">\n' + "\n".join(f"<li>{i}</li>" for i in items) + "\n</ul>"


def build(docs_dir):
    people = _load(docs_dir, "people.json")
    cfg = _load(docs_dir, "departments.json")
    by_short = {SHORT(p["name"]): p for p in people}

    ex = cfg["executive"]
    ex_items = []
    for m in ex["members"]:
        note = f" ({_e(m['note'])})" if m.get("note") else ""
        ex_items.append(f"<strong>{_e(m['person'])}</strong>{note}<br>{_e(m['role'])}")
    exec_box = (f'<div class="org-box org-box--exec">\n<h3>{_e(ex["title"])}</h3>\n'
                + _list(ex_items) + "\n</div>")

    n = len(cfg["departments"])
    width = 190 if n <= 4 else 160 if n == 5 else 140
    boxes = []
    for d in cfg["departments"]:
        name = d["name"]
        leaders = d.get("leaders", [])
        leader_names = {ld["person"] for ld in leaders}
        members = [p["name"] for p in people
                   if name in p["departments"] and SHORT(p["name"]) not in leader_names]
        lines = _leader_lines(leaders, by_short) or ["N/A"]
        parts = [f'<div class="org-box org-box--{_e(name.lower())}">',
                 f"<h3>{_e(name)} Department</h3>",
                 "<h4>Leaders</h4>", _list(_e(x) for x in lines),
                 "<h4>Members</h4>", _list(_e(m) for m in members) if members else _list(["N/A"]),
                 "</div>"]
        boxes.append("<li>\n" + "\n".join(parts) + "\n</li>")

    return ('<div class="org-tree">\n<div class="org-exec">\n' + exec_box +
            f'\n<ul class="org-depts" style="--org-w:{width}px">\n' + "\n".join(boxes) +
            "\n</ul>\n</div>\n</div>")


def _link(person):
    page = person.get("page")
    return f"[{person['name']}](../{page}.md)" if page else person["name"]


def build_department_page(docs_dir, dept):
    people = _load(docs_dir, "people.json")
    cfg = _load(docs_dir, "departments.json")
    d = next(x for x in cfg["departments"] if x["name"] == dept)
    by_short = {SHORT(p["name"]): p for p in people}
    leaders = d.get("leaders", [])
    leader_names = {ld["person"] for ld in leaders}
    out = [d.get("description", ""), "", "## Leaders", ""]
    if leaders:
        seen = set()
        for ld in leaders:
            p = by_short.get(ld["person"])
            out.append(f"- {_link(p) if p else ld['person']} \u2013 {ld['title']}")
    else:
        out.append("N/A")
    members = [p for p in people if dept in p["departments"] and SHORT(p["name"]) not in leader_names]
    out += ["", "## Members", ""]
    out += [f"- {_link(p)}" for p in members] or ["N/A"]
    return "\n".join(out)


def build_overview(docs_dir):
    cfg = _load(docs_dir, "departments.json")
    out = ["## The departments", ""]
    for d in cfg["departments"]:
        out.append(f"- **[{d['name']}]({d['name'].lower()}.md)** \u2013 {d.get('description', '')}")
    return "\n".join(out)


def on_page_markdown(markdown, page, config, files, **kwargs):
    docs_dir = config["docs_dir"]
    if "<!-- department -->" in markdown:
        markdown = markdown.replace("<!-- department -->", build_department_page(docs_dir, page.meta["department"]))
    if "<!-- departments-overview -->" in markdown:
        markdown = markdown.replace("<!-- departments-overview -->", build_overview(docs_dir))
    if MARKER in markdown:
        markdown = markdown.replace(MARKER, build(docs_dir))
    return markdown
