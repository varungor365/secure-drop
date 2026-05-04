"""
Secure-Drop Capstone — Plagiarism Checker
==========================================
Approach:
  1. Parse CAPSTONE_REPORT.md into sections/paragraphs
  2. Fetch known reference documents (RFCs, NIST texts, Wikipedia)
  3. TF-IDF cosine similarity + N-gram exact match per paragraph
  4. Citation coverage analysis (which claims are backed by [N] refs)
  5. Output: terminal summary + plagiarism_report.html
"""

import re, os, html, time, sys, json
import urllib.request
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DOCS_DIR  = os.path.dirname(os.path.abspath(__file__))
REPORT_MD = os.path.join(DOCS_DIR, "CAPSTONE_REPORT.md")
HTML_OUT  = os.path.join(DOCS_DIR, "plagiarism_report.html")

# ── Reference sources to compare against ─────────────────────────────────────
SOURCES = {
    "RFC 5869 (HKDF)":         "https://www.rfc-editor.org/rfc/rfc5869.txt",
    "RFC 8445 (ICE)":          "https://www.rfc-editor.org/rfc/rfc8445.txt",
    "RFC 6455 (WebSocket)":    "https://www.rfc-editor.org/rfc/rfc6455.txt",
    "RFC 4566 (SDP)":          "https://www.rfc-editor.org/rfc/rfc4566.txt",
    "Wikipedia: WebRTC":       "https://en.wikipedia.org/w/index.php?title=WebRTC&action=raw",
    "Wikipedia: AES-GCM":      "https://en.wikipedia.org/w/index.php?title=Galois/Counter_Mode&action=raw",
    "Wikipedia: ECDH":         "https://en.wikipedia.org/w/index.php?title=Elliptic-curve_Diffie%E2%80%93Hellman&action=raw",
    "Wikipedia: P2P":          "https://en.wikipedia.org/w/index.php?title=Peer-to-peer&action=raw",
}

HEADERS = {"User-Agent": "Mozilla/5.0 (academic plagiarism checker)"}

# ── Helpers ───────────────────────────────────────────────────────────────────
def clean_markdown(text):
    """Strip markdown syntax to get plain text."""
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)   # code blocks
    text = re.sub(r'`[^`]+`', '', text)                       # inline code
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)               # images
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)     # links → text
    text = re.sub(r'#{1,6}\s+', '', text)                     # headings
    text = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', text)     # bold/italic
    text = re.sub(r'^\s*[-|*+]\s+', '', text, flags=re.M)     # list markers
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.M)      # ordered lists
    text = re.sub(r'\[\d+\]', '', text)                        # citation refs
    text = re.sub(r'\|.*?\|', '', text)                        # table cells
    text = re.sub(r'-{3,}', '', text)                          # hr lines
    text = re.sub(r'<[^>]+>', '', text)                        # HTML tags
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)    # HTML comments
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def extract_sections(md_text):
    """Split markdown into (heading, body) pairs."""
    sections = []
    current_heading = "Preamble"
    current_body = []
    for line in md_text.splitlines():
        m = re.match(r'^#{1,3}\s+(.+)', line)
        if m:
            if current_body:
                sections.append((current_heading, '\n'.join(current_body).strip()))
            current_heading = m.group(1).strip()
            current_body = []
        else:
            current_body.append(line)
    if current_body:
        sections.append((current_heading, '\n'.join(current_body).strip()))
    return sections

def split_sentences(text):
    """Rough sentence splitter."""
    text = re.sub(r'\s+', ' ', text)
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    return [s.strip() for s in sentences if len(s.strip()) > 40]

def ngram_exact_match_ratio(para, source_text, n=6):
    """Fraction of n-grams in para that appear verbatim in source_text."""
    def ngrams(tokens, n):
        return set(' '.join(tokens[i:i+n]) for i in range(len(tokens)-n+1))
    p_tokens = para.lower().split()
    s_tokens = source_text.lower().split()
    if len(p_tokens) < n:
        return 0.0
    p_ng = ngrams(p_tokens, n)
    s_ng = ngrams(s_tokens, n)
    if not p_ng:
        return 0.0
    return len(p_ng & s_ng) / len(p_ng)

def count_citations(md_text):
    """Count [N] citation markers per section paragraph."""
    return len(re.findall(r'\[\d+\]', md_text))

def fetch_source(name, url, cache={}):
    if url in cache:
        return cache[url]
    print(f"  Fetching {name} … ", end='', flush=True)
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode('utf-8', errors='ignore')
        # strip wiki markup
        raw = re.sub(r'\{\{[^}]+\}\}', '', raw)
        raw = re.sub(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]', r'\1', raw)
        raw = re.sub(r'<[^>]+>', ' ', raw)
        raw = re.sub(r'={2,}[^=]+=+', '', raw)
        text = re.sub(r'\s+', ' ', raw)[:200000]  # cap at 200k chars
        cache[url] = text
        print("✓")
        return text
    except Exception as e:
        print(f"✗ ({e})")
        cache[url] = ""
        return ""

# ── Main analysis ─────────────────────────────────────────────────────────────
print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("  SECURE-DROP CAPSTONE — PLAGIARISM ANALYSIS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

with open(REPORT_MD, 'r', encoding='utf-8') as f:
    md_text = f.read()

sections = extract_sections(md_text)
print(f"Parsed {len(sections)} sections from report\n")

# Fetch reference sources
print("Fetching reference documents:")
source_texts = {}
for name, url in SOURCES.items():
    source_texts[name] = fetch_source(name, url)
    time.sleep(0.3)

print()

# ── Per-section analysis ──────────────────────────────────────────────────────
results = []

for sec_heading, sec_body in sections:
    clean = clean_markdown(sec_body)
    if len(clean) < 60:
        continue

    sentences = split_sentences(clean)
    if not sentences:
        continue

    cite_count = count_citations(sec_body)

    # TF-IDF similarity against all sources
    best_sim  = 0.0
    best_ngram = 0.0
    best_src  = "—"
    flagged_sentences = []

    for src_name, src_text in source_texts.items():
        if not src_text or len(src_text) < 100:
            continue
        # Cosine similarity on full section
        try:
            vec = TfidfVectorizer(stop_words='english', max_features=5000)
            # use a ~10k char window of source around our keywords
            # for speed, sample the source
            src_sample = src_text[:80000]
            mat = vec.fit_transform([clean, src_sample])
            sim = cosine_similarity(mat[0:1], mat[1:2])[0][0]
        except Exception:
            sim = 0.0

        # N-gram exact match per sentence
        sentence_max = 0.0
        flagged = []
        for sent in sentences:
            ng = ngram_exact_match_ratio(sent, src_text, n=5)
            if ng > 0.12:
                flagged.append((sent, ng, src_name))
                sentence_max = max(sentence_max, ng)

        if sim > best_sim or sentence_max > best_ngram:
            if sim > best_sim:
                best_sim  = sim
                best_src  = src_name
            if sentence_max > best_ngram:
                best_ngram = sentence_max
            flagged_sentences.extend(flagged)

    # Deduplicate flagged sentences
    seen = set()
    unique_flagged = []
    for item in flagged_sentences:
        if item[0] not in seen:
            seen.add(item[0])
            unique_flagged.append(item)

    # Combined score: weighted average of cosine sim + ngram match
    combined = round((best_sim * 0.5 + best_ngram * 0.5) * 100, 1)

    # Citation coverage heuristic
    # Expect ~1 citation per 3 claims; flag if < 1 citation and high similarity
    needs_citation = combined > 15 and cite_count == 0

    results.append({
        "heading":       sec_heading,
        "combined":      combined,
        "cosine":        round(best_sim * 100, 1),
        "ngram":         round(best_ngram * 100, 1),
        "best_source":   best_src,
        "citations":     cite_count,
        "needs_citation": needs_citation,
        "flagged":       unique_flagged[:5],   # top 5 flagged sentences
        "word_count":    len(clean.split()),
    })

# ── Summary stats ─────────────────────────────────────────────────────────────
total_words    = sum(r["word_count"] for r in results)
flagged_words  = sum(r["word_count"] for r in results if r["combined"] > 20)
overall_pct    = round((flagged_words / total_words * 100) if total_words else 0, 1)

high_risk   = [r for r in results if r["combined"] > 30]
medium_risk = [r for r in results if 15 < r["combined"] <= 30]
low_risk    = [r for r in results if r["combined"] <= 15]

print(f"{'='*58}")
print(f"  OVERALL SIMILARITY SCORE : {overall_pct}%")
print(f"  Total words analysed     : {total_words:,}")
print(f"  Sections high risk (>30%): {len(high_risk)}")
print(f"  Sections medium (15-30%) : {len(medium_risk)}")
print(f"  Sections low risk (<15%) : {len(low_risk)}")
print(f"{'='*58}")

print("\nSection-by-section breakdown:")
for r in sorted(results, key=lambda x: -x["combined"]):
    risk = "🔴 HIGH  " if r["combined"] > 30 else ("🟡 MEDIUM" if r["combined"] > 15 else "🟢 LOW   ")
    print(f"  {risk}  {r['combined']:5.1f}%  [{r['citations']} refs]  {r['heading'][:55]}")

# ── Generate HTML report ──────────────────────────────────────────────────────
def risk_colour(score):
    if score > 30: return "#ef4444"
    if score > 15: return "#f59e0b"
    return "#22c55e"

rows = ""
for r in sorted(results, key=lambda x: -x["combined"]):
    risk_label = "HIGH" if r["combined"] > 30 else ("MEDIUM" if r["combined"] > 15 else "LOW")
    col = risk_colour(r["combined"])
    flagged_html = ""
    for sent, score, src in r["flagged"]:
        flagged_html += f"""
        <div style="margin:6px 0;padding:8px 12px;background:#fef2f2;border-left:3px solid #ef4444;
                    font-size:12px;color:#374151;border-radius:0 6px 6px 0;">
          <span style="color:#ef4444;font-weight:700">{score*100:.0f}% n-gram match</span>
          vs <em>{html.escape(src)}</em><br>
          <span style="font-style:italic;color:#6b7280">&ldquo;{html.escape(sent[:200])}&hellip;&rdquo;</span>
        </div>"""
    if not flagged_html:
        flagged_html = "<span style='color:#6b7280;font-size:12px'>No verbatim sentence matches detected.</span>"

    rows += f"""
    <tr>
      <td style="padding:12px;font-weight:600;vertical-align:top">{html.escape(r['heading'][:60])}</td>
      <td style="padding:12px;text-align:center;vertical-align:top">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;
                     background:{col}22;color:{col};font-weight:700;font-size:13px">
          {r['combined']}%
        </span>
      </td>
      <td style="padding:12px;text-align:center;vertical-align:top;color:#6b7280;font-size:13px">
        {r['cosine']}% / {r['ngram']}%
      </td>
      <td style="padding:12px;text-align:center;vertical-align:top">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;
                     background:{'#fee2e2' if r['needs_citation'] else '#f0fdf4'};
                     color:{'#ef4444' if r['needs_citation'] else '#16a34a'};font-size:12px">
          {r['citations']} ref{'s' if r['citations']!=1 else ''}
          {'⚠ cite needed' if r['needs_citation'] else ''}
        </span>
      </td>
      <td style="padding:12px;font-size:12px;color:#6b7280;vertical-align:top">
        {html.escape(r['best_source'])}
      </td>
    </tr>
    <tr>
      <td colspan="5" style="padding:4px 12px 16px 24px;border-bottom:1px solid #f3f4f6">
        {flagged_html}
      </td>
    </tr>"""

gauge_color = "#ef4444" if overall_pct > 20 else ("#f59e0b" if overall_pct > 10 else "#22c55e")
verdict = ("HIGH — Significant revision required before submission." if overall_pct > 20
           else ("MODERATE — Review flagged sections and ensure all borrowed ideas are cited."
                 if overall_pct > 10
                 else "LOW — Report appears substantially original. Verify flagged passages."))

html_report = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Plagiarism Report — Secure-Drop Capstone</title>
<style>
  * {{box-sizing:border-box;margin:0;padding:0}}
  body {{font-family:'Segoe UI',system-ui,sans-serif;background:#f9fafb;color:#111827;padding:32px 24px}}
  .container {{max-width:1100px;margin:0 auto}}
  h1 {{font-size:26px;font-weight:800;margin-bottom:4px}}
  .sub {{color:#6b7280;font-size:14px;margin-bottom:32px}}
  .summary-grid {{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:32px}}
  .tile {{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px;text-align:center}}
  .tile .num {{font-size:36px;font-weight:800}}
  .tile .lbl {{font-size:12px;color:#6b7280;margin-top:4px}}
  .verdict {{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px 24px;
             margin-bottom:32px;display:flex;align-items:center;gap:16px}}
  .verdict .icon {{font-size:32px}}
  .verdict .text h3 {{font-size:16px;font-weight:700}}
  .verdict .text p  {{font-size:13px;color:#6b7280;margin-top:4px}}
  table {{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden}}
  thead th {{background:#f3f4f6;padding:12px;text-align:left;font-size:12px;text-transform:uppercase;
             letter-spacing:.05em;color:#6b7280;font-weight:700}}
  tr:hover td {{background:#fafafa}}
  .note {{margin-top:24px;font-size:12px;color:#9ca3af;text-align:center}}
  .bar-wrap {{background:#e5e7eb;border-radius:8px;height:10px;margin-top:8px}}
  .bar-fill  {{height:10px;border-radius:8px;background:{gauge_color};width:{min(overall_pct,100)}%}}
</style>
</head>
<body>
<div class="container">
  <h1>Plagiarism Analysis Report</h1>
  <div class="sub">Secure-Drop Capstone Project — DIT University UCF 439 &nbsp;|&nbsp;
    Compared against: {len([v for v in source_texts.values() if v])} reference sources
    (RFCs + Wikipedia)</div>

  <div class="summary-grid">
    <div class="tile">
      <div class="num" style="color:{gauge_color}">{overall_pct}%</div>
      <div class="lbl">Overall Similarity</div>
      <div class="bar-wrap"><div class="bar-fill"></div></div>
    </div>
    <div class="tile">
      <div class="num" style="color:#111">{total_words:,}</div>
      <div class="lbl">Words Analysed</div>
    </div>
    <div class="tile">
      <div class="num" style="color:#ef4444">{len(high_risk)}</div>
      <div class="lbl">High-Risk Sections (&gt;30%)</div>
    </div>
    <div class="tile">
      <div class="num" style="color:#f59e0b">{len(medium_risk)}</div>
      <div class="lbl">Medium-Risk Sections (15–30%)</div>
    </div>
    <div class="tile">
      <div class="num" style="color:#22c55e">{len(low_risk)}</div>
      <div class="lbl">Low-Risk Sections (&lt;15%)</div>
    </div>
    <div class="tile">
      <div class="num" style="color:#6366f1">{sum(r['citations'] for r in results)}</div>
      <div class="lbl">Total Citations [N] Found</div>
    </div>
  </div>

  <div class="verdict">
    <div class="icon">{'🔴' if overall_pct>20 else ('🟡' if overall_pct>10 else '🟢')}</div>
    <div class="text">
      <h3>Verdict: {verdict.split('—')[0].strip()}</h3>
      <p>{verdict.split('—')[1].strip() if '—' in verdict else verdict}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28%">Section</th>
        <th style="width:10%">Score</th>
        <th style="width:14%">Cosine / N-gram</th>
        <th style="width:14%">Citations</th>
        <th style="width:34%">Closest Source</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>

  <div class="note">
    Scores are estimated via TF-IDF cosine similarity and 5-gram exact matching against publicly
    available reference documents (RFC texts, Wikipedia). This is a supplementary check only —
    submit through Turnitin for the official university plagiarism report as required by the
    DIT University UCF 439 booklet.
    <br>Report generated: {time.strftime('%d %B %Y, %H:%M')}
  </div>
</div>
</body>
</html>"""

with open(HTML_OUT, 'w', encoding='utf-8') as f:
    f.write(html_report)

print(f"\n✅  HTML report saved → {HTML_OUT}")
print(f"    Open in browser: open \"{HTML_OUT}\"")
print()
