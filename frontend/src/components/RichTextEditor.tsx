import { useEffect, useRef } from "react";

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

export function RichTextEditor({ initialHtml, onChange, placeholder }: RichTextEditorProps) {
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
