#!/usr/bin/env node
/**
 * One-off safe wrap of "Motel Mediteran" in preview/*.html body text for Google Translate.
 * Skips <script>, <style>, and HTML tags (attributes).
 */
const fs = require("fs");
const path = require("path");

const PREVIEW = path.join(__dirname, "..", "preview");
const WRAP = '<span class="notranslate" translate="no">Motel Mediteran</span>';

function replaceMotelInTextChunk(chunk) {
  return chunk.replace(/\bMotel Mediteran\b/g, WRAP);
}

function processOutsideScripts(chunk) {
  const parts = chunk.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/gi);
  return parts
    .map((part) => {
      if (/^<script\b/i.test(part) || /^<style\b/i.test(part)) return part;
      return replaceMotelInHtmlFragment(part);
    })
    .join("");
}

function replaceMotelInHtmlFragment(fragment) {
  let out = "";
  let i = 0;
  while (i < fragment.length) {
    if (fragment[i] === "<") {
      const end = fragment.indexOf(">", i);
      if (end === -1) {
        out += fragment.slice(i);
        break;
      }
      out += fragment.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    const nextLt = fragment.indexOf("<", i);
    const chunk = nextLt === -1 ? fragment.slice(i) : fragment.slice(i, nextLt);
    out += replaceMotelInTextChunk(chunk);
    i = nextLt === -1 ? fragment.length : nextLt;
  }
  return out;
}

function dedupeWraps(html) {
  let prev;
  do {
    prev = html;
    html = html.replace(
      /<span class="notranslate" translate="no"><span class="notranslate" translate="no">Motel Mediteran<\/span><\/span>/g,
      WRAP
    );
  } while (html !== prev);
  return html;
}

for (const name of fs.readdirSync(PREVIEW)) {
  if (!name.endsWith(".html")) continue;
  const fp = path.join(PREVIEW, name);
  let s = fs.readFileSync(fp, "utf8");
  const m = s.match(/<body\b[^>]*>/i);
  if (!m) continue;
  const bodyStart = m.index + m[0].length;
  const head = s.slice(0, bodyStart);
  let body = s.slice(bodyStart);
  body = dedupeWraps(processOutsideScripts(body));
  s = head + body;
  fs.writeFileSync(fp, s, "utf8");
  console.log("updated", name);
}
