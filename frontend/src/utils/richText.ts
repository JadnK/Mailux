/** Converts plain text (e.g. a user's signature, stored as newline-
 *  separated lines) into safe, displayable HTML for the compose editor. */
export function textToHtml(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.split("\n").join("<br>");
}

/** Best-effort plain-text rendering of the compose editor's HTML, sent
 *  alongside the HTML body as the plain-text fallback part of the email -
 *  not every mail client (or spam filter) is happy with HTML-only mail. */
export function htmlToText(html: string): string {
  const normalized = html
    .replace(/<div>/gi, "\n")
    .replace(/<\/div>/gi, "")
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n");

  const container = document.createElement("div");
  container.innerHTML = normalized;
  const text = container.textContent || "";

  return text.replace(/\n{3,}/g, "\n\n").trim();
}
