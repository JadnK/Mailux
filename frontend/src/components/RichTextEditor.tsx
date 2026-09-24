import { useEffect, useRef } from "react";
import type { MailTemplate } from "../types/mail";

type RichTextEditorProps = {
  /** Only read once, on mount - this is an uncontrolled editor (like a
   *  real contentEditable has to be) so re-rendering the parent never
   *  clobbers the cursor position while typing. To reset the content,
   *  unmount/remount the component - the surrounding `{open && ...}`
   *  conditional in MailShell already does that whenever a compose/reply
   *  session opens fresh. */
  initialHtml?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Quick-reply templates the user has saved - shown as an "insert"
   *  dropdown in the toolbar when there's at least one. */
  templates?: MailTemplate[];
};

const COMMANDS: { command: string; label: string; title: string }[] = [
  { command: "bold", label: "B", title: "Fett" },
  { command: "italic", label: "I", title: "Kursiv" },
  { command: "underline", label: "U", title: "Unterstrichen" },
  { command: "strikeThrough", label: "S", title: "Durchgestrichen" },
];

const LIST_COMMANDS: { command: string; label: string; title: string }[] = [
  { command: "insertUnorderedList", label: "•", title: "Aufzählung" },
  { command: "insertOrderedList", label: "1.", title: "Nummerierte Liste" },
];

export function RichTextEditor({ initialHtml, onChange, placeholder, templates }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    el.innerHTML = initialHtml ?? "";
    el.focus();

    // Put the cursor at the very start - compose sessions are seeded with
    // "<br><br>" + the signature, and the user should land above it, not
    // after it.
    const range = document.createRange();
    range.setStart(el, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: string) {
    document.execCommand(command, false);
    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function handleInput() {
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function insertTemplate(id: string) {
    const template = templates?.find((candidate) => candidate.id === id);
    if (!template) return;

    editorRef.current?.focus();
    document.execCommand("insertHTML", false, template.body);
    onChange(editorRef.current?.innerHTML ?? "");
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar">
        {COMMANDS.map(({ command, label, title }) => (
          <button
            key={command}
            type="button"
            className={`rich-text-button rich-text-${command}`}
            title={title}
            aria-label={title}
            onMouseDown={(event) => {
              event.preventDefault();
              exec(command);
            }}
          >
            {label}
          </button>
        ))}
        <span className="rich-text-divider" aria-hidden="true" />
        {LIST_COMMANDS.map(({ command, label, title }) => (
          <button
            key={command}
            type="button"
            className="rich-text-button"
            title={title}
            aria-label={title}
            onMouseDown={(event) => {
              event.preventDefault();
              exec(command);
            }}
          >
            {label}
          </button>
        ))}
        <span className="rich-text-divider" aria-hidden="true" />
        <button
          type="button"
          className="rich-text-button"
          title="Formatierung entfernen"
          aria-label="Formatierung entfernen"
          onMouseDown={(event) => {
            event.preventDefault();
            exec("removeFormat");
          }}
        >
          Tx
        </button>

        {templates && templates.length > 0 && (
          <>
            <span className="rich-text-divider" aria-hidden="true" />
            <select
              className="rich-text-template-select"
              defaultValue=""
              aria-label="Vorlage einfügen"
              onMouseDown={(event) => event.stopPropagation()}
              onChange={(event) => {
                const { value } = event.target;
                if (value) insertTemplate(value);
                event.target.value = "";
              }}
            >
              <option value="" disabled>
                Vorlage einfügen…
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <div
        ref={editorRef}
        className="rich-text-body"
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}
