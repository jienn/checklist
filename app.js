"use strict";

const $ = (s) => document.querySelector(s);
let rules = null;
let current = null;        // 현재 선택된 키워드 규칙
let items = [];            // { phase, text, added }
const checked = new Set(); // 체크된 항목 키(phase|text)
let infoText = "";

const keyOf = (it) => it.phase + "|" + it.text;

async function init() {
  try {
    rules = await (await fetch("rules.json")).json();
  } catch (e) {
    $("#kw-msg").textContent = "rules.json을 불러오지 못했어요. 로컬에서는 간단한 웹서버로 실행해 주세요.";
    return;
  }
  const dl = $("#kw-list");
  rules.keywords.forEach((k) => {
    const o = document.createElement("option");
    o.value = k.keyword;
    dl.appendChild(o);
  });
  $("#kw-form").addEventListener("submit", onKeywordSubmit);
  $("#apply-btn").addEventListener("click", onApply);
  $("#copy-btn").addEventListener("click", onCopy);
}

function terms(k) {
  return [k.keyword, ...(k.aliases || [])];
}

// phases 구조 또는 예전 checklist(문자열 배열) 구조를 모두 지원
function phasesOf(k) {
  if (k.phases) return k.phases;
  return [{ phase: "", items: k.checklist || [] }];
}

function findKeyword(q) {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  const exact = rules.keywords.find((k) => terms(k).some((t) => t.toLowerCase() === s));
  if (exact) return exact;
  if (s.length < 2) return null;
  return rules.keywords.find((k) =>
    terms(k).some((t) => {
      const l = t.toLowerCase();
      return l.includes(s) || s.includes(l);
    })
  ) || null;
}

function onKeywordSubmit(e) {
  e.preventDefault();
  const k = findKeyword($("#kw-input").value);
  if (!k) {
    $("#kw-msg").textContent = "등록되지 않은 키워드예요. 사용 가능: " + rules.keywords.map((x) => x.keyword).join(", ");
    return;
  }
  $("#kw-msg").textContent = "";
  loadKeyword(k);
}

function loadKeyword(k) {
  current = k;
  checked.clear();
  $("#kw-input").value = k.keyword;
  rebuild();
  $("#list-section").hidden = false;
  $("#info-section").hidden = false;
}

// 기본 체크리스트 + 작업정보 기반 규칙(추가/제거) 적용
function rebuild() {
  const text = infoText.toLowerCase();
  const phases = phasesOf(current);
  let list = [];
  phases.forEach((p) => p.items.forEach((t) => list.push({ phase: p.phase, text: t, added: false })));
  const lastPhase = phases.length ? phases[phases.length - 1].phase : "";
  const applied = [];

  (rules.modifiers || []).forEach((m) => {
    if (m.keywords && !m.keywords.includes(current.keyword)) return;
    const hit = m.triggers.find((t) => text.includes(t.toLowerCase()));
    if (!hit) return;
    const phase = m.phase && phases.some((p) => p.phase === m.phase) ? m.phase : lastPhase;
    let changed = false;
    (m.add || []).forEach((t) => {
      if (!list.some((i) => i.text === t)) {
        // 해당 단계의 마지막 항목 뒤에 삽입
        let idx = -1;
        list.forEach((i, n) => { if (i.phase === phase) idx = n; });
        list.splice(idx + 1, 0, { phase, text: t, added: true });
        changed = true;
      }
    });
    (m.remove || []).forEach((t) => {
      const before = list.length;
      list = list.filter((i) => i.text !== t);
      if (list.length !== before) changed = true;
    });
    if (changed) applied.push({ label: m.label, hit, add: m.add || [], remove: m.remove || [] });
  });

  items = list;
  render();
  renderResult(applied);
}

function render() {
  $("#list-title").textContent = current.keyword;
  const root = $("#checklist");
  root.textContent = "";
  const order = [];
  items.forEach((it) => { if (!order.includes(it.phase)) order.push(it.phase); });

  order.forEach((phase) => {
    const group = items.filter((i) => i.phase === phase);
    if (phase) {
      const h = document.createElement("h3");
      h.className = "phase";
      const done = group.filter((i) => checked.has(keyOf(i))).length;
      h.textContent = `${phase} (${done}/${group.length})`;
      h.dataset.phase = phase;
      root.appendChild(h);
    }
    const ul = document.createElement("ul");
    group.forEach((it) => {
      const li = document.createElement("li");
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = checked.has(keyOf(it));
      const span = document.createElement("span");
      span.textContent = it.text;
      span.className = cb.checked ? "done" : "";
      cb.addEventListener("change", () => {
        cb.checked ? checked.add(keyOf(it)) : checked.delete(keyOf(it));
        span.className = cb.checked ? "done" : "";
        if (phase) {
          const n = group.filter((i) => checked.has(keyOf(i))).length;
          root.querySelector(`h3.phase[data-phase="${phase}"]`).textContent = `${phase} (${n}/${group.length})`;
        }
      });
      label.append(cb, span);
      if (it.added) {
        const b = document.createElement("span");
        b.className = "badge";
        b.textContent = "추가됨";
        label.appendChild(b);
      }
      li.appendChild(label);
      ul.appendChild(li);
    });
    root.appendChild(ul);
  });
}

function renderResult(applied) {
  if (!infoText.trim()) { $("#result").hidden = true; return; }
  $("#result").hidden = false;

  const ap = $("#applied");
  ap.textContent = "";
  if (!applied.length) {
    const li = document.createElement("li");
    li.textContent = "적용된 수정 규칙이 없어요.";
    ap.appendChild(li);
  }
  applied.forEach((a) => {
    const li = document.createElement("li");
    const parts = [];
    if (a.add.length) parts.push("추가 " + a.add.length + "건");
    if (a.remove.length) parts.push("제거 " + a.remove.length + "건");
    li.textContent = `${a.label} (“${a.hit}” 감지) → ${parts.join(", ")}`;
    ap.appendChild(li);
  });

  // 관련 키워드: 작업정보에서 발견된 (1) 다른 체크리스트 키워드/별칭, (2) 관련 키워드 목록
  const text = infoText.toLowerCase();
  const rel = $("#related");
  rel.textContent = "";
  const own = terms(current).map((t) => t.toLowerCase());
  let count = 0;

  rules.keywords
    .filter((k) => k !== current)
    .map((k) => ({ k, hit: terms(k).find((t) => text.includes(t.toLowerCase())) }))
    .filter((x) => x.hit)
    .forEach(({ k, hit }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = k.keyword + (hit.toLowerCase() !== k.keyword.toLowerCase() ? ` (${hit})` : "");
      b.addEventListener("click", () => loadKeyword(k));
      rel.appendChild(b);
      count++;
    });

  (rules.relatedKeywords || [])
    .filter((w) => !own.includes(w.toLowerCase()) && text.includes(w.toLowerCase()))
    .forEach((w) => {
      const s = document.createElement("span");
      s.className = "kwtag";
      s.textContent = w;
      rel.appendChild(s);
      count++;
    });

  if (!count) rel.textContent = "발견된 관련 키워드가 없어요.";
}

function onApply() {
  infoText = $("#info").value;
  if (!current) return;
  rebuild();
}

async function onCopy() {
  const lines = [];
  let last = null;
  items.forEach((i) => {
    if (i.phase !== last) {
      if (last !== null) lines.push("");
      if (i.phase) lines.push(`<${i.phase}>`);
      last = i.phase;
    }
    lines.push(`${checked.has(keyOf(i)) ? "[x]" : "[ ]"} ${i.text}`);
  });
  try {
    await navigator.clipboard.writeText(`[${current.keyword}]\n` + lines.join("\n"));
    $("#copy-btn").textContent = "복사됨";
  } catch (e) {
    $("#copy-btn").textContent = "복사 실패";
  }
  setTimeout(() => ($("#copy-btn").textContent = "텍스트로 복사"), 1500);
}

init();
