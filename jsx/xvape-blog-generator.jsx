'use client'
import React, { useState } from "react";
import { saveBlogFromGenerator } from '@/app/actions/blog'

/* ============================== THEME ============================== */
const C = {
  paper: "#F1F3F2", card: "#FFFFFF", ink: "#15191C", muted: "#6A7378",
  line: "#E1E5E3", teal: "#0E7C86", tealDark: "#0A5C63", ember: "#D9633B",
  emberSoft: "#FBEDE6", tealSoft: "#E4F2F2", sidebar: "#F7F8F8",
};
const SANS = "'Heebo', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const MODEL = "claude-sonnet-4-6";
const API = "https://api.anthropic.com/v1/messages";
const SITE = "https://xvape.co.il";
const CAP_KB = 150;

/* ----------------------------- helpers ----------------------------- */
function extractJson(text) {
  if (!text) throw new Error("empty");
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("no json");
  return JSON.parse(t.slice(s, e + 1));
}
async function callClaude(prompt) {
  const res = await fetch(API, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error("api " + res.status);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function stripTags(s) { return (s || "").replace(/<[^>]+>/g, "").trim(); }
function wordCount(html) { return stripTags((html || "").replace(/<[^>]+>/g, " ")).split(/\s+/).filter(Boolean).length; }
function faqToHtml(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";
  return "<h2>שאלות נפוצות</h2>\n" + faq.map((f) => `<h3>${f.q}</h3>\n<p>${f.a}</p>`).join("\n");
}
function blockify(html) {
  if (typeof document === "undefined") return [];
  const div = document.createElement("div");
  div.innerHTML = html || "";
  const out = [];
  div.childNodes.forEach((n) => {
    if (n.nodeType === 8) { const t = n.textContent || ""; if (/img/i.test(t)) { const m = t.match(/alt=['"]?([^'"]+)['"]?/i); out.push({ type: "image", label: "תמונה", text: m ? m[1] : "" }); } return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toLowerCase();
    if (tag === "h2") out.push({ type: "h2", label: "H2", text: n.textContent.trim() });
    else if (tag === "h3") out.push({ type: "h3", label: "H3", text: n.textContent.trim() });
    else if (tag === "ul" || tag === "ol") out.push({ type: "list", label: "רשימה", text: [...n.querySelectorAll("li")].map((li) => "• " + li.textContent.trim()).join("\n") });
    else out.push({ type: "p", label: "פסקה", text: n.textContent.trim() });
  });
  return out;
}
function buildJsonLd(d) {
  const url = `${SITE}/blog/${d.slug || "your-slug"}`;
  const blog = {
    "@context": "https://schema.org", "@type": "BlogPosting", headline: d.title || "",
    description: d.metaDescription || "", image: `${SITE}/images/${d.slug || "image"}-hero.webp`,
    author: { "@type": "Organization", name: "XVAPE", url: SITE },
    publisher: { "@type": "Organization", name: "XVAPE", logo: { "@type": "ImageObject", url: `${SITE}/logo.png` } },
    datePublished: todayISO(), dateModified: todayISO(),
    mainEntityOfPage: { "@type": "WebPage", "@id": url }, inLanguage: "he-IL",
  };
  const faq = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: (d.faq || []).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return `<script type="application/ld+json">\n${JSON.stringify(blog, null, 2)}\n</script>\n\n<script type="application/ld+json">\n${JSON.stringify(faq, null, 2)}\n</script>`;
}
function drawFormat(img, w, h, mode, bg) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const ir = img.width / img.height, tr = w / h;
  let dw, dh;
  if (mode === "cover") { if (ir > tr) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; } }
  else { if (ir > tr) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; } }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return cv;
}
function exportUnderCap(cv, filename, capKB, done) {
  let q = 0.85;
  const tryOnce = () => {
    cv.toBlob((blob) => {
      if (!blob) return;
      if (blob.size / 1024 > capKB && q > 0.4) { q = Math.round((q - 0.12) * 100) / 100; tryOnce(); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      done && done(Math.round(blob.size / 1024));
    }, "image/webp", q);
  };
  tryOnce();
}

/* ----------------------------- UI atoms ---------------------------- */
function CopyBtn({ value, k, copied, onCopy, small }) {
  const is = copied === k;
  return (
    <button onClick={() => onCopy(k, value)} style={{
      fontFamily: SANS, fontSize: small ? 12 : 13, fontWeight: 600, border: "none", borderRadius: 8,
      padding: small ? "5px 11px" : "6px 14px", cursor: "pointer", background: is ? C.teal : C.tealSoft,
      color: is ? "#fff" : C.tealDark, transition: "all .15s", whiteSpace: "nowrap" }}>{is ? "✓ הועתק" : "העתק"}</button>
  );
}
function CrmField({ label, k, value, onChange, copied, onCopy, limit, mono, rows, area, ltr }) {
  const len = (value || "").length, over = limit && len > limit;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <label style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{label}</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {limit && <span style={{ fontFamily: MONO, fontSize: 11, color: over ? C.ember : C.muted }}>{len}/{limit}</span>}
          {onCopy && <CopyBtn value={value} k={k} copied={copied} onCopy={onCopy} small />}
        </div>
      </div>
      {area ? (
        <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={rows || 3} dir={ltr || mono ? "ltr" : "rtl"}
          style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: mono ? MONO : SANS, fontSize: mono ? 12.5 : 14,
            lineHeight: 1.6, color: C.ink, background: C.card, border: `1px solid ${over ? C.ember : C.line}`, borderRadius: 8,
            padding: "9px 11px", outline: "none", textAlign: ltr || mono ? "left" : "right" }} />
      ) : (
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} dir={ltr || mono ? "ltr" : "rtl"}
          style={{ width: "100%", boxSizing: "border-box", fontFamily: mono ? MONO : SANS, fontSize: mono ? 12.5 : 14,
            color: C.ink, background: C.card, border: `1px solid ${over ? C.ember : C.line}`, borderRadius: 8,
            padding: "9px 11px", outline: "none", textAlign: ltr || mono ? "left" : "right" }} />
      )}
    </div>
  );
}
function ImageSlot({ label, w, h, alt, filename, copied, onCopy }) {
  const [img, setImg] = useState(null);
  const [preview, setPreview] = useState(null);
  const [kb, setKb] = useState(null);
  function onFile(f) { if (!f) return; const rd = new FileReader(); rd.onload = (ev) => { const im = new Image(); im.onload = () => { setImg(im); setPreview(drawFormat(im, w, h, "cover", "#fff").toDataURL("image/webp", 0.8)); setKb(null); }; im.src = ev.target.result; }; rd.readAsDataURL(f); }
  function dl() { if (!img) return; exportUnderCap(drawFormat(img, w, h, "cover", "#fff"), filename, CAP_KB, setKb); }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{label} <span style={{ fontFamily: MONO, fontWeight: 400, fontSize: 10.5, color: C.muted }}>{w}×{h}</span></div>
      {preview ? (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <img src={preview} alt="" style={{ width: 110, borderRadius: 8, border: `1px solid ${C.line}`, display: "block", background: "#fff" }} />
          <div style={{ flex: 1 }}>
            <button onClick={dl} style={{ width: "100%", fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "#fff", background: C.teal, border: "none", borderRadius: 7, padding: "7px", cursor: "pointer", marginBottom: 5 }}>הורד WebP</button>
            <label style={{ display: "block", textAlign: "center", fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: C.muted, border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px", cursor: "pointer" }}>החלף<input type="file" accept="image/*" onChange={(e) => onFile(e.target.files && e.target.files[0])} style={{ display: "none" }} /></label>
            {kb != null && <div style={{ fontFamily: MONO, fontSize: 10, color: kb <= CAP_KB ? C.tealDark : C.ember, textAlign: "center", marginTop: 4 }}>{kb}KB ✓</div>}
          </div>
        </div>
      ) : (
        <label style={{ display: "block", textAlign: "center", fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: C.tealDark, background: C.tealSoft, border: `1px dashed ${C.teal}`, borderRadius: 8, padding: "14px", cursor: "pointer" }}>
          ⬆ העלה תמונה<input type="file" accept="image/*" onChange={(e) => onFile(e.target.files && e.target.files[0])} style={{ display: "none" }} />
        </label>
      )}
      {alt && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 5 }}>ALT: {alt}</div>}
    </div>
  );
}

/* ===================== IMAGE PLAN (tied to blog) ===================== */
function PlanStudio({ blog, copied, onCopy }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [plan, setPlan] = useState([]);
  const [mode, setMode] = useState("contain");
  const [bg, setBg] = useState("#FFFFFF");
  const [rows, setRows] = useState({});
  const [pp, setPp] = useState({ cur: 0, total: 0 });
  const ready = blog && blog.bodyHtml;

  async function gen() {
    if (loading) return;
    if (!ready) { setErr("צור קודם טיוטת בלוג."); return; }
    setErr(""); setLoading(true); setRows({}); setPlan([]); setPp({ cur: 0, total: 0 });
    try {
      const headings = [...blog.bodyHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripTags(m[1])).filter(Boolean).filter((h) => h !== "שאלות נפוצות").slice(0, 4);
      const listSys =
        "אתה מתכנן תמונות SEO עבור XVAPE (מכשירי אידוי). בהינתן כותרת כתבה ורשימת כותרות, החזר רשימת תמונות: hero אחת, section אחת לכל כותרת שניתנה, ו-og אחת. " +
        'לכל פריט: slot ("hero"|"section"|"og"), placement (עברית מדויק — איפה בבלוג), label (עברית קצר), alt (עברית). החזר JSON בלבד (ללא markdown): {"images":[{"slot":"","placement":"","label":"","alt":""}]}';
      let items = [];
      try {
        const listObj = extractJson(await callClaude(`${listSys}\n\nכותרת: ${blog.title}\nכותרות:\n- ${headings.join("\n- ")}`));
        items = listObj.images || [];
      } catch (e1) { items = []; }
      if (!items.length) {
        items = [{ slot: "hero", placement: "ראש הכתבה (Featured)", label: "תמונה ראשית", alt: blog.title }]
          .concat(headings.map((h) => ({ slot: "section", placement: `אחרי הכותרת: ${h}`, label: h, alt: h })))
          .concat([{ slot: "og", placement: "תמונת שיתוף (OG)", label: "OG", alt: blog.title }]);
      }
      const dims = { hero: [1200, 675, "16:9"], section: [800, 600, "4:3"], og: [1200, 630, "1.91:1"] };
      const base = blog.slug || "xvape-product"; let sc = 0;
      const promptSys =
        "כתוב פרומפט אחד באנגלית לייצור תמונה ב-ChatGPT שיודבק יחד עם תמונת מוצר מצורפת. " +
        "התחל ב-'Using the attached product photo, keep the device exactly as shown (same shape, color, branding) and place it in', תאר סצנה לפי ההקשר, תאורה, רקע וקומפוזיציה, וסיים ב-'no people, no text, no smoke, no use'. ~30-40 מילים. " +
        "מוצר/טק/קונספט בלבד; בלי שימוש/אנשים. החזר רק את הפרומפט עצמו — בלי הסברים, בלי גרשיים.";
      const out = [];
      for (let i = 0; i < items.length; i++) {
        setPp({ cur: i + 1, total: items.length });
        const it = items[i];
        const d = dims[it.slot] || dims.section;
        let sx = it.slot; if (it.slot === "section") { sc += 1; sx = `section-${sc}`; }
        let prompt = "";
        try { prompt = (await callClaude(`${promptSys}\n\nנושא הכתבה: ${blog.title}\nההקשר: ${it.label}\nיחס תמונה: ${d[2]}`)).replace(/```/g, "").replace(/^["']|["']$/g, "").trim(); } catch (e2) { prompt = ""; }
        out.push({ slot: it.slot, placement: it.placement, label: it.label, alt: it.alt, w: d[0], h: d[1], ratio: d[2], prompt, filename: `${base}-${sx}.webp` });
      }
      setPlan(out);
    } catch (e) { setErr("תוכנית התמונות נכשלה: " + (e && e.message ? e.message : "שגיאה") + " — נסה שוב."); }
    setLoading(false); setPp({ cur: 0, total: 0 });
  }
  function onFile(idx, p, file) { if (!file) return; const rd = new FileReader(); rd.onload = (ev) => { const im = new Image(); im.onload = () => { setRows((r) => ({ ...r, [idx]: { img: im, preview: drawFormat(im, p.w, p.h, mode, bg).toDataURL("image/webp", 0.8), kb: null } })); }; im.src = ev.target.result; }; rd.readAsDataURL(file); }
  function download(idx, p) { const row = rows[idx]; if (!row) return; exportUnderCap(drawFormat(row.img, p.w, p.h, mode, bg), p.filename, CAP_KB, (kb) => setRows((r) => ({ ...r, [idx]: { ...r[idx], kb } }))); }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginTop: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🗂 תוכנית תמונות</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12, lineHeight: 1.55 }}>נגזרת מהכותרות. כל פרומפט להדבקה ב-GPT יחד עם תמונת המוצר. כל קובץ יוצא WebP עד ~{CAP_KB}KB.</div>
      <button onClick={gen} disabled={loading || !ready} style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: "#fff", background: loading || !ready ? "#9AA6AA" : C.teal, border: "none", borderRadius: 9, padding: "10px 16px", cursor: loading || !ready ? "default" : "pointer" }}>{loading ? (pp.total ? `בונה פרומפט ${pp.cur}/${pp.total}…` : "בונה תוכנית…") : plan.length ? "בנה מחדש" : "צור תוכנית תמונות"}</button>
      {err && <div style={{ marginTop: 10, fontSize: 13, color: C.ember, background: C.emberSoft, padding: "9px 11px", borderRadius: 8 }}>{err}</div>}
      {plan.length > 0 && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", margin: "14px 0 4px" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[["contain", "התאמה"], ["cover", "מילוי"]].map(([m, lbl]) => (<button key={m} onClick={() => setMode(m)} style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, border: `1px solid ${mode === m ? C.teal : C.line}`, background: mode === m ? C.tealSoft : C.paper, color: mode === m ? C.tealDark : C.muted, borderRadius: 8, padding: "7px 11px", cursor: "pointer" }}>{lbl}</button>))}
            </div>
            {mode === "contain" && <div style={{ display: "flex", gap: 6 }}>{["#FFFFFF", "#F1F3F2", "#15191C"].map((col) => (<button key={col} onClick={() => setBg(col)} style={{ width: 28, height: 28, borderRadius: 7, border: `2px solid ${bg === col ? C.teal : C.line}`, background: col, cursor: "pointer" }} />))}</div>}
          </div>
          {plan.map((p, idx) => { const row = rows[idx]; const sc = p.slot === "hero" ? C.teal : p.slot === "og" ? C.ember : C.tealDark; return (
            <div key={idx} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, marginTop: 10, background: C.paper }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontFamily: MONO, fontSize: 10, color: "#fff", background: sc, padding: "3px 7px", borderRadius: 5, textTransform: "uppercase" }}>{p.slot}</span><span style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</span></div>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted }}>{p.w}×{p.h}</span>
              </div>
              <div style={{ fontSize: 12.5, marginBottom: 7 }}><span style={{ color: C.muted }}>📍 </span><b>{p.placement}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>פרומפט (עם תמונת המוצר):</span><CopyBtn value={p.prompt} k={`pr-${idx}`} copied={copied} onCopy={onCopy} small /></div>
              <div dir="ltr" style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.45, color: "#283036", background: C.card, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", textAlign: "left", marginBottom: 9 }}>{p.prompt}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9, alignItems: "flex-start" }}>
                <div style={{ flex: "1 1 180px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, direction: "ltr", textAlign: "left", marginBottom: 4, wordBreak: "break-all" }}>{p.filename}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}><span style={{ fontSize: 12, color: C.muted }}>ALT:</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.alt}</span><CopyBtn value={p.alt} k={`alt-${idx}`} copied={copied} onCopy={onCopy} small /></div>
                  <label style={{ display: "inline-block", fontFamily: SANS, fontWeight: 700, fontSize: 12, color: C.tealDark, background: C.tealSoft, borderRadius: 8, padding: "7px 13px", cursor: "pointer" }}>{row ? "החלף" : "טען תמונה"}<input type="file" accept="image/*" onChange={(e) => onFile(idx, p, e.target.files && e.target.files[0])} style={{ display: "none" }} /></label>
                </div>
                {row && (<div style={{ flex: "0 0 130px" }}><img src={row.preview} alt="" style={{ width: 130, borderRadius: 8, border: `1px solid ${C.line}`, display: "block", marginBottom: 6, background: "#fff" }} /><button onClick={() => download(idx, p)} style={{ width: 130, fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "#fff", background: C.teal, border: "none", borderRadius: 7, padding: "7px", cursor: "pointer" }}>הורד מוכן</button>{row.kb != null && <div style={{ fontFamily: MONO, fontSize: 10, color: row.kb <= CAP_KB ? C.tealDark : C.ember, textAlign: "center", marginTop: 4 }}>{row.kb}KB ✓</div>}</div>)}
              </div>
            </div>
          ); })}
        </>
      )}
    </div>
  );
}

/* ===================== LINKS CHECKLIST ===================== */
function LinksChecklist({ links, setLinks, copied, onCopy }) {
  const add = (type) => setLinks((l) => [...l, { type, anchor: "", url: "", done: false }]);
  const upd = (i, p) => setLinks((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const rm = (i) => setLinks((l) => l.filter((_, j) => j !== i));
  const done = links.filter((x) => x.done).length;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>🔗 קישורים (צ'ק-ליסט)</div>
        {links.length > 0 && <span style={{ fontFamily: MONO, fontSize: 12, color: done === links.length ? C.tealDark : C.muted, background: done === links.length ? C.tealSoft : C.paper, padding: "3px 9px", borderRadius: 6 }}>{done}/{links.length} שובצו</span>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12, lineHeight: 1.55 }}>הוסף קישורים פנימיים (לכתבות/קטגוריות) וקישורי מוצר לשילוב בכתבה. "העתק" נותן תגית &lt;a&gt; מוכנה. סמן ✓ אחרי ששובץ בגוף.</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => add("internal")} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.tealDark, background: C.tealSoft, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>+ קישור פנימי</button>
        <button onClick={() => add("product")} style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: "#9A4324", background: C.emberSoft, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>+ קישור מוצר</button>
      </div>
      {links.length === 0 && <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "10px 0", border: `1px dashed ${C.line}`, borderRadius: 8 }}>אין קישורים עדיין — הוסף לפחות 2-3 לכל כתבה (זה אות SEO חזק).</div>}
      {links.map((lk, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderTop: i ? `1px solid ${C.line}` : "none", flexWrap: "wrap" }}>
          <button onClick={() => upd(i, { done: !lk.done })} style={{ fontSize: 15, width: 28, height: 28, flexShrink: 0, border: `1px solid ${lk.done ? C.teal : C.line}`, background: lk.done ? C.teal : C.card, color: "#fff", borderRadius: 7, cursor: "pointer" }}>{lk.done ? "✓" : ""}</button>
          <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, color: "#fff", background: lk.type === "product" ? C.ember : C.teal, padding: "3px 6px", borderRadius: 5, flexShrink: 0 }}>{lk.type === "product" ? "מוצר" : "פנימי"}</span>
          <input value={lk.anchor} onChange={(e) => upd(i, { anchor: e.target.value })} placeholder="טקסט עוגן" dir="rtl" style={{ flex: "1 1 130px", minWidth: 100, fontFamily: SANS, fontSize: 13, padding: "7px 9px", border: `1px solid ${C.line}`, borderRadius: 7, background: C.paper, outline: "none", textAlign: "right" }} />
          <input value={lk.url} onChange={(e) => upd(i, { url: e.target.value })} placeholder="https://xvape.co.il/…" dir="ltr" style={{ flex: "1 1 150px", minWidth: 120, fontFamily: MONO, fontSize: 11.5, padding: "7px 9px", border: `1px solid ${C.line}`, borderRadius: 7, background: C.paper, outline: "none", textAlign: "left" }} />
          <CopyBtn value={`<a href="${lk.url}">${lk.anchor}</a>`} k={`lnk-${i}`} copied={copied} onCopy={onCopy} small />
          <button onClick={() => rm(i)} style={{ fontSize: 14, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* ============================== APP =============================== */
export default function App({ sites = [] }) {
  const [tab, setTab] = useState("gen");
  const [keyword, setKeyword] = useState("");
  const [angle, setAngle] = useState("");
  const [product, setProduct] = useState("");
  const [keywords2, setKeywords2] = useState("");
  const [productInfo, setProductInfo] = useState("");
  const [stage, setStage] = useState("");
  const [prog, setProg] = useState({ cur: 0, total: 0 });
  const [err, setErr] = useState("");
  const [r, setR] = useState(null);
  const [copied, setCopied] = useState("");
  const [bodyMode, setBodyMode] = useState("preview");
  const [status, setStatus] = useState("PUBLISHED");
  const [logoUrl, setLogoUrl] = useState(`${SITE}/logo.png`);
  const [social, setSocial] = useState("https://instagram.com/xvape\nhttps://facebook.com/xvape");
  const [links, setLinks] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(() => sites[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  const set = (patch) => setR((p) => ({ ...p, ...patch }));
  function onCopy(k, v) { navigator.clipboard.writeText(v || ""); setCopied(k); setTimeout(() => setCopied(""), 1500); }

  async function saveToCrm() {
    if (!r || !selectedSiteId || saving) return;
    setSaving(true); setSaveResult(null);
    const tags = Array.isArray(r.tags) ? r.tags : (r.tags || "").split(",").map(t => t.trim()).filter(Boolean);
    const result = await saveBlogFromGenerator({
      siteId: selectedSiteId,
      title: r.title || "",
      slug: r.slug || "",
      body: r.bodyHtml || "",
      tags,
      metaTitle: r.metaTitle || "",
      metaDescription: r.metaDescription || "",
    });
    setSaving(false);
    setSaveResult(result);
  }

  async function generate() {
    if (!keyword.trim() || stage === "meta" || stage === "body") return;
    setErr(""); setR(null); setStage("meta"); setProg({ cur: 0, total: 0 });
    try {
      const research =
        (product.trim() ? `מוצר: ${product.trim()}\n` : "") +
        (keywords2.trim() ? `מילות מפתח נוספות לשילוב טבעי: ${keywords2.trim()}\n` : "") +
        (productInfo.trim() ? `מידע ויתרונות על המוצר (לבסס עליו את התוכן): ${productInfo.trim()}\n` : "") +
        (angle.trim() ? `זווית/דגש: ${angle.trim()}\n` : "");
      const baseInfo = `מילת מפתח: ${keyword.trim()}\n${research}`;
      const coreSys =
        "אתה קופירייטר SEO/GEO מומחה בעברית עבור XVAPE — חנות B2C למכשירי אידוי. עברית בלשון זכר, עובדתי. השתמש במידע המוצר/המחקר שסופק, ושלב מילות מפתח נוספות באופן טבעי. רגולציה: אסור טענות בריאות/שיפור ביצועים. כותרות כשאלות אמיתיות. " +
        "החזר JSON בלבד (ללא markdown/backticks): " +
        '{"title":string (H1 עם מילת המפתח),"slug":string (אנגלית, מקפים),"tags":string[] (4-5 עברית),"metaTitle":string (<=60, מסתיים " | XVAPE"),"metaDescription":string (<=160, עם מילת המפתח),"featuredAlt":string (עברית)}';
      const core = extractJson(await callClaude(`${coreSys}\n\n${baseInfo}`));
      core.keyword = keyword.trim();
      setR(core); setStage("body");
      const planSys =
        "אתה מתכנן תוכן בעברית עבור XVAPE (מכשירי אידוי). תכנן כתבה של 1000+ מילים. החזר JSON בלבד (ללא markdown/backticks): " +
        '{"outline":[{"heading":string (H2 כשאלה אמיתית),"brief":string (משפט קצר מה הסעיף מכסה)}] (5 סעיפים),"faq":[{"q":string,"a":string}] (4 שאלות, תשובות 1-2 משפטים)}';
      let plan = {};
      try { plan = extractJson(await callClaude(`${planSys}\n\nכותרת: ${core.title}\n${baseInfo}`)); } catch (e2) { plan = {}; }
      const meta = { ...core, faq: plan.faq || [], outline: (plan.outline && plan.outline.length) ? plan.outline : [
        { heading: `מה חשוב לדעת על ${keyword.trim()}?`, brief: "מבוא וסקירה כללית" },
        { heading: "מה היתרונות המרכזיים?", brief: "יתרונות ונקודות מכירה" },
        { heading: "איך בוחרים נכון?", brief: "קריטריונים לבחירה" },
        { heading: "טעויות נפוצות שכדאי להימנע מהן", brief: "מה לא לעשות" },
      ] };
      setR(meta);
      const outline = Array.isArray(meta.outline) ? meta.outline.slice(0, 5) : [];
      const total = outline.length || 3;
      let html = "";
      const secSys =
        "אתה כותב סעיף אחד בכתבת בלוג בעברית עבור XVAPE (מכשירי אידוי). עברית בלשון זכר, עובדתי, ללא טענות בריאות/שיפור ביצועים. " +
        "מבנה: <h2> עם הכותרת (כשאלה), אחריו פסקת תשובה ישירה (40-60 מילים), ואז 1-2 פסקאות הרחבה, ואם מתאים <ul> עם 2-4 פריטים. " +
        "~250-300 מילים. משפטים עצמאיים, מספרים קונקרטיים. אם סופק מידע/יתרונות על המוצר — שלב אותו בסעיף הרלוונטי באופן עובדתי וטבעי. החזר HTML נקי בלבד (<h2>,<h3>,<p>,<ul>,<li>,<a>) — ללא H1, ללא markdown/backticks.";
      for (let i = 0; i < outline.length; i++) {
        setProg({ cur: i + 1, total });
        const first = i === 0, last = i === outline.length - 1;
        const extra = (first ? "פתח בפסקת מבוא קצרה (2-3 משפטים) לפני ה-H2. " : "") + (last ? "סיים בפסקת CTA קצרה עם <a href='#'>." : "");
        try {
          const secHtml = (await callClaude(`${secSys}\n\nכותרת הכתבה: ${meta.title}\nמילת מפתח: ${meta.keyword}\nכותרת הסעיף: ${outline[i].heading}\nתקציר: ${outline[i].brief}\n${research}${extra}`)).replace(/```html/gi, "").replace(/```/g, "").trim();
          if (secHtml) { html += (html ? "\n" : "") + secHtml; setR((p) => ({ ...p, bodyHtml: html })); }
        } catch (e3) { /* דלג על סעיף שנכשל והמשך */ }
      }
      html += "\n" + faqToHtml(meta.faq);
      setR((p) => ({ ...p, bodyHtml: html }));
      setStage("done"); setProg({ cur: 0, total: 0 }); setTab("crm");
    } catch (e) { setErr("היצירה נכשלה: " + (e && e.message ? e.message : "שגיאה לא ידועה") + " — נסה שוב."); setStage(""); }
  }

  const busy = stage === "meta" || stage === "body";
  const tagsStr = r && Array.isArray(r.tags) ? r.tags.join(", ") : (r?.tags || "");
  const wc = r?.bodyHtml ? wordCount(r.bodyHtml) : 0;
  const TabBtn = ({ id, children }) => (
    <button onClick={() => setTab(id)} style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 700, border: "none", borderRadius: 10, padding: "9px 18px", cursor: "pointer", background: tab === id ? C.teal : "transparent", color: tab === id ? "#fff" : C.muted }}>{children}</button>
  );

  return (
    <div dir="rtl" style={{ background: C.paper, minHeight: "100vh", fontFamily: SANS, color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        textarea:focus, input:focus, select:focus { border-color: ${C.teal} !important; }
        .xv-body h2 { font-size:19px; font-weight:800; color:${C.ink}; margin:20px 0 6px; }
        .xv-body h3 { font-size:16px; font-weight:700; color:${C.ink}; margin:14px 0 4px; }
        .xv-body p  { font-size:15px; line-height:1.8; color:#283036; margin:0 0 10px; }
        .xv-body ul { margin:0 0 12px; padding-inline-start:22px; }
        .xv-body li { font-size:15px; line-height:1.7; color:#283036; margin-bottom:4px; }
        .xv-body a  { color:${C.teal}; font-weight:600; }`}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, color: C.tealDark, background: C.tealSoft, padding: "4px 10px", borderRadius: 6, letterSpacing: 0.5 }}>XVAPE · BLOG</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 16 }}>{[6, 9, 12, 16, 12, 9, 6].map((h, i) => (<div key={i} style={{ width: 3, height: h, background: i === 3 ? C.ember : C.line, borderRadius: 2 }} />))}</div>
          </div>
          <div style={{ display: "flex", gap: 4, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 4 }}>
            <TabBtn id="gen">① מחולל</TabBtn>
            <TabBtn id="crm">② CRM — הזנה</TabBtn>
          </div>
        </div>

        {/* ===================== TAB: GENERATOR ===================== */}
        {tab === "gen" && (
          <div style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px", letterSpacing: -0.5 }}>מחולל בלוגים</h1>
            <p style={{ fontSize: 15, color: C.muted, margin: "0 0 20px", lineHeight: 1.6 }}>מילת מפתח → כתבה מלאה של 1000+ מילים (נכתבת סעיף-אחר-סעיף), שדות SEO, FAQ וסכמה. כשמסיים — עוברים אוטומטית ללשונית ה-CRM.</p>
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18 }}>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>מילת מפתח ראשית</label>
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} placeholder="למשל: איך לבחור וופורייזר"
                style={{ width: "100%", fontFamily: SANS, fontSize: 16, padding: "12px 14px", border: `1px solid ${C.line}`, borderRadius: 10, outline: "none", background: C.paper, textAlign: "right" }} />
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, margin: "14px 0 6px" }}>מוצר ספציפי <span style={{ color: C.muted, fontWeight: 400 }}>(לא חובה)</span></label>
              <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="למשל: XVAPE Starry 4 / דגם מסוים"
                style={{ width: "100%", fontFamily: SANS, fontSize: 15, padding: "11px 14px", border: `1px solid ${C.line}`, borderRadius: 10, outline: "none", background: C.paper, textAlign: "right" }} />
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, margin: "14px 0 6px" }}>מילות מפתח נוספות <span style={{ color: C.muted, fontWeight: 400 }}>(מופרדות בפסיק)</span></label>
              <input value={keywords2} onChange={(e) => setKeywords2(e.target.value)} placeholder="למשל: חימום הסעה, בקרת טמפרטורה, USB-C"
                style={{ width: "100%", fontFamily: SANS, fontSize: 15, padding: "11px 14px", border: `1px solid ${C.line}`, borderRadius: 10, outline: "none", background: C.paper, textAlign: "right" }} />
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, margin: "14px 0 6px" }}>מידע / יתרונות על המוצר <span style={{ color: C.muted, fontWeight: 400 }}>(הדבק פסקה מהמחקר)</span></label>
              <textarea value={productInfo} onChange={(e) => setProductInfo(e.target.value)} rows={5} placeholder="הדבק כאן מה שאתה יודע: יתרונות, מפרט, נקודות מכירה, ציטוט מהיצרן…"
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: SANS, fontSize: 14.5, lineHeight: 1.6, padding: "11px 14px", border: `1px solid ${C.line}`, borderRadius: 10, outline: "none", background: C.paper, textAlign: "right" }} />
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, margin: "14px 0 6px" }}>זווית / דגש <span style={{ color: C.muted, fontWeight: 400 }}>(לא חובה)</span></label>
              <input value={angle} onChange={(e) => setAngle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} placeholder="למשל: למתחילים · השוואה"
                style={{ width: "100%", fontFamily: SANS, fontSize: 15, padding: "11px 14px", border: `1px solid ${C.line}`, borderRadius: 10, outline: "none", background: C.paper, textAlign: "right" }} />
              <button onClick={generate} disabled={busy || !keyword.trim()} style={{ marginTop: 16, width: "100%", fontFamily: SANS, fontSize: 16, fontWeight: 700, color: "#fff", background: busy || !keyword.trim() ? "#9AA6AA" : C.teal, border: "none", borderRadius: 11, padding: "13px", cursor: busy || !keyword.trim() ? "default" : "pointer" }}>
                {stage === "meta" ? "מתכנן את הכתבה…" : stage === "body" ? `כותב סעיף ${prog.cur}/${prog.total}…` : "צור כתבה מלאה"}
              </button>
              {err && <div style={{ marginTop: 12, fontSize: 14, color: C.ember, background: C.emberSoft, padding: "10px 12px", borderRadius: 9 }}>{err}</div>}
              {stage === "done" && r && <div style={{ marginTop: 12, fontSize: 13.5, color: C.tealDark, background: C.tealSoft, padding: "10px 12px", borderRadius: 9 }}>✓ נוצרה כתבה של {wc} מילים. עבור ללשונית <b>② CRM</b> לעריכה והזנה.</div>}
            </div>
          </div>
        )}

        {/* ===================== TAB: CRM MIRROR ===================== */}
        {tab === "crm" && (
          !r ? (
            <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16, padding: 40, textAlign: "center", color: C.muted, fontSize: 15 }}>
              צור קודם כתבה בלשונית <b>① מחולל</b> — והשדות כאן יתמלאו אוטומטית.
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {sites.length > 0 && (
                    <select value={selectedSiteId} onChange={(e) => { setSelectedSiteId(e.target.value); setSaveResult(null); }}
                      style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, padding: "8px 12px", border: `1px solid ${C.line}`, borderRadius: 9, background: C.card, color: C.ink, outline: "none", cursor: "pointer" }}>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                  <button onClick={saveToCrm} disabled={saving || !selectedSiteId || !r}
                    style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, padding: "8px 18px", border: "none", borderRadius: 9, cursor: saving || !selectedSiteId ? "default" : "pointer", background: saving ? C.muted : C.teal, color: "#fff", transition: "background .15s" }}>
                    {saving ? "שומר…" : "שמור ב-CRM"}
                  </button>
                  {saveResult?.blogId && (
                    <a href={`/sites/${saveResult.siteId}/blogs/${saveResult.blogId}`}
                      style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.tealDark, background: C.tealSoft, padding: "8px 14px", borderRadius: 9, textDecoration: "none" }}>
                      ✓ נשמר — פתח בעורך ←
                    </a>
                  )}
                  {saveResult?.error && (
                    <span style={{ fontSize: 13, color: C.ember, background: C.emberSoft, padding: "8px 12px", borderRadius: 9 }}>{saveResult.error}</span>
                  )}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: wc >= 1000 ? C.tealDark : C.ember, background: wc >= 1000 ? C.tealSoft : C.emberSoft, padding: "4px 10px", borderRadius: 6 }}>{wc} מילים {wc >= 1000 ? "✓" : "(מתחת ל-1000)"}</div>
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                {/* MAIN COLUMN */}
                <div style={{ flex: "1 1 460px", minWidth: 300 }}>
                  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
                    <CrmField label="Blog Title" k="title" value={r.title} onChange={(v) => set({ title: v })} copied={copied} onCopy={onCopy} />
                    <CrmField label="URL Slug" k="slug" mono value={r.slug} onChange={(v) => set({ slug: v })} copied={copied} onCopy={onCopy} />
                    <CrmField label="Tags" k="tags" value={tagsStr} onChange={(v) => set({ tags: v })} copied={copied} onCopy={onCopy} />
                  </div>

                  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Body</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {[["preview", "תצוגה"], ["blocks", "בלוקים"], ["html", "HTML"]].map(([m, lbl]) => (<button key={m} onClick={() => setBodyMode(m)} style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, border: `1px solid ${bodyMode === m ? C.teal : C.line}`, background: bodyMode === m ? C.tealSoft : C.paper, color: bodyMode === m ? C.tealDark : C.muted, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{lbl}</button>))}
                        <CopyBtn value={r.bodyHtml} k="body" copied={copied} onCopy={onCopy} small />
                      </div>
                    </div>
                    {bodyMode === "preview" && <div className="xv-body" dir="rtl" dangerouslySetInnerHTML={{ __html: r.bodyHtml || "" }} />}
                    {bodyMode === "blocks" && (
                      <div>
                        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>העתק בלוק-אחר-בלוק לפי הסדר אל עורך הגוף במערכת.</div>
                        {blockify(r.bodyHtml).map((b, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
                            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "#fff", background: b.type === "image" ? C.ember : b.type === "h2" ? C.teal : b.type === "h3" ? C.tealDark : C.muted, padding: "3px 6px", borderRadius: 5, minWidth: 50, textAlign: "center", flexShrink: 0 }}>{b.label}</span>
                            <div style={{ flex: 1, fontSize: 14, lineHeight: 1.6, color: "#283036", whiteSpace: "pre-wrap", fontWeight: b.type === "h2" ? 700 : 400 }}>{b.text}</div>
                            <CopyBtn value={b.text} k={`blk-${i}`} copied={copied} onCopy={onCopy} small />
                          </div>
                        ))}
                      </div>
                    )}
                    {bodyMode === "html" && <textarea value={r.bodyHtml || ""} onChange={(e) => set({ bodyHtml: e.target.value })} rows={16} dir="ltr" style={{ width: "100%", fontFamily: MONO, fontSize: 12, lineHeight: 1.55, color: C.ink, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px", outline: "none", textAlign: "left", resize: "vertical" }} />}
                  </div>

                  <PlanStudio blog={r} copied={copied} onCopy={onCopy} />
                  <LinksChecklist links={links} setLinks={setLinks} copied={copied} onCopy={onCopy} />
                </div>

                {/* SIDEBAR */}
                <div style={{ flex: "1 1 280px", minWidth: 260 }}>
                  <div style={{ background: C.sidebar, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📅 Publish Settings</div>
                    <label style={{ fontWeight: 700, fontSize: 13, display: "block", marginBottom: 5 }}>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", fontFamily: SANS, fontSize: 14, padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.card, outline: "none" }}>
                      <option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option>
                    </select>
                  </div>

                  <div style={{ background: C.sidebar, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🖼 Featured Image</div>
                    <ImageSlot label="Featured" w={1200} h={675} alt={r.featuredAlt} filename={`${r.slug || "xvape"}-hero.webp`} copied={copied} onCopy={onCopy} />
                    <CrmField label="ALT" k="falt" value={r.featuredAlt} onChange={(v) => set({ featuredAlt: v })} copied={copied} onCopy={onCopy} />
                  </div>

                  <div style={{ background: C.sidebar, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🔍 SEO · Meta & Open Graph</div>
                    <CrmField label="Meta Title" k="mt" limit={60} value={r.metaTitle} onChange={(v) => set({ metaTitle: v })} copied={copied} onCopy={onCopy} />
                    <CrmField label="Meta Description" k="md" limit={160} area rows={3} value={r.metaDescription} onChange={(v) => set({ metaDescription: v })} copied={copied} onCopy={onCopy} />
                    <ImageSlot label="OG Image" w={1200} h={630} alt={r.title} filename={`${r.slug || "xvape"}-og.webp`} copied={copied} onCopy={onCopy} />
                  </div>

                  <div style={{ background: C.sidebar, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>🧩 Custom JSON-LD</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10 }}>BlogPosting + FAQ. השדה שצריך להוסיף למערכת.</div>
                    <CrmField label="" k="schema" mono area rows={8} value={buildJsonLd(r)} onChange={() => {}} copied={copied} onCopy={onCopy} />
                  </div>

                  <div style={{ background: C.sidebar, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Schema.org — Organization</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10 }}>כלל-אתרי — מגדירים פעם אחת.</div>
                    <CrmField label="Logo URL" k="logo" mono value={logoUrl} onChange={setLogoUrl} copied={copied} onCopy={onCopy} />
                    <CrmField label="Social Links (sameAs)" k="social" mono area rows={3} value={social} onChange={setSocial} copied={copied} onCopy={onCopy} />
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
