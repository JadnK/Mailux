import { getMailTransporter } from "../config/mail.js";
import imaps, { Connection } from "imap-simple";
import { simpleParser } from "mailparser";
import { getImapConfig } from "../config/imap.js";
import { MailData } from "../types/mail.js";
import { env } from "../../config/env.js";
import { getUserSettings } from "../../settings-service/services/settingsService.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const MailComposer = require("nodemailer/lib/mail-composer");

const TRASH_MAILBOX = "Trash";

export type MailAttachmentMeta = {
  index: number;
  filename: string;
  contentType: string;
  size: number;
};

export type MailSummary = {
  uid: number | string;
  from: string;
  to: string;
  subject: string;
  date: string;
  text?: string;
  html?: string;
  attachments: MailAttachmentMeta[];
  seen: boolean;
  flagged: boolean;
};

export type MailboxResult = {
  mails: MailSummary[];
  /** false when the mailbox doesn't exist (or isn't accessible) on this account. */
  folderExists: boolean;
};

export const sendMail = async (mailData: MailData, username: string, password: string) => {
  const transporter = getMailTransporter(username, password);
  const userSettings = getUserSettings(username);

  const defaultEmail = `${username}@${env.mailDomain}`;
  const displayName = userSettings.name || username;
  const formattedFrom = `"${displayName}" <${defaultEmail}>`;

  const finalMailData: MailData = {
    ...mailData,
    from: mailData.from?.trim() ? mailData.from : formattedFrom,
    replyTo: mailData.replyTo || formattedFrom,
    envelope: {
      ...(mailData.envelope || {}),
      from: mailData.envelope?.from?.trim() ? mailData.envelope.from : formattedFrom,
      to: mailData.envelope?.to || mailData.to,
    },
  };

  await transporter.verify();
  const info = await transporter.sendMail(finalMailData);

  await saveToSent(finalMailData, username, password);
  return info;
};

export const saveToSent = async (mailData: MailData, username: string, password: string) => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    const mail = new MailComposer(mailData);
    const raw = await mail.compile().build();

    await connection.append(raw, { mailbox: "Sent", flags: ["\\Seen"] });
  } finally {
    connection.end();
  }
};

function toAttachmentMeta(attachments: any[] | undefined): MailAttachmentMeta[] {
  if (!attachments) return [];

  return attachments.map((attachment, index) => ({
    index,
    filename: attachment.filename || `attachment-${index + 1}`,
    contentType: attachment.contentType || "application/octet-stream",
    size: attachment.size ?? attachment.content?.length ?? 0,
  }));
}

async function parseMessage(rawPart: any): Promise<MailSummary> {
  const parsed = await simpleParser(rawPart);

  return {
    uid: 0, // overwritten by the caller, which has the IMAP attributes
    from: parsed.from?.text || "",
    to: parsed.to?.text || "",
    subject: parsed.subject || "",
    date: parsed.date?.toString() || "",
    text: parsed.text || "",
    html: typeof parsed.html === "string" ? parsed.html : "",
    attachments: toAttachmentMeta(parsed.attachments),
    seen: false, // overwritten by the caller, which has the IMAP flags
    flagged: false, // overwritten by the caller, which has the IMAP flags
  };
}

/**
 * Prefers the IMAP server's own INTERNALDATE over the message's "Date:"
 * header for sorting - see the call site in fetchMailbox for why.
 */
function resolveMailDate(internalDate: unknown, headerDate: string): string {
  if (internalDate instanceof Date && !Number.isNaN(internalDate.getTime())) {
    return internalDate.toISOString();
  }

  const parsed = new Date(headerDate);
  return Number.isNaN(parsed.getTime()) ? headerDate : parsed.toISOString();
}

/** The folders Mailux's UI always offers - safe to auto-create on first
 *  visit if they're missing, unlike an arbitrary caller-supplied mailbox
 *  name. */
const STANDARD_MAILBOXES = new Set(["INBOX", "Sent", "Drafts", "Archive", "Spam", "Trash"]);

async function fetchMailbox(
  username: string,
  password: string,
  mailbox: string
): Promise<MailboxResult> {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    try {
      await connection.openBox(mailbox);
    } catch {
      if (!STANDARD_MAILBOXES.has(mailbox)) {
        // A missing, non-standard mailbox is a normal state - report it,
        // don't error out.
        return { mails: [], folderExists: false };
      }

      // One of the six standard folders is missing - most likely this
      // account predates Mailux (or predates a given folder ever being
      // used) and IMAP simply never created it. Create it once and open
      // it, instead of permanently showing "folder doesn't exist" for a
      // folder every account is supposed to have.
      try {
        await connection.addBox(mailbox);
        await connection.openBox(mailbox);
      } catch (err) {
        console.error(`Could not create missing mailbox "${mailbox}":`, err);
        return { mails: [], folderExists: false };
      }
    }

    const messages = await connection.search(["ALL"], { bodies: [""], struct: true });

    const mails = await Promise.all(
      messages.map(async (msg: any) => {
        const allParts = msg.parts.find((p: any) => p.which === "");
        const summary = await parseMessage(allParts.body);
        const flags: string[] = msg.attributes?.flags ?? [];
        return {
          ...summary,
          uid: msg.attributes.uid,
          // IMAP's own INTERNALDATE (when Dovecot actually received the
          // message - node-imap always fetches this, regardless of the
          // `bodies`/`struct` options above) beats the message's own
          // "Date:" header for sort order. That header is entirely
          // sender-controlled - missing, malformed, or just wrong on a
          // test message sent by a script rather than a real mail client -
          // and a bad value there is exactly what made new mail land
          // somewhere in the middle of the list instead of at the top.
          date: resolveMailDate(msg.attributes?.date, summary.date),
          seen: flags.includes("\\Seen"),
          flagged: flags.includes("\\Flagged"),
        };
      })
    );

    mails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { mails, folderExists: true };
  } finally {
    connection.end();
  }
}

export const getMailbox = (username: string, password: string, mailbox: string) =>
  fetchMailbox(username, password, mailbox);

export type AttachmentContent = {
  filename: string;
  contentType: string;
  content: Buffer;
};

export const getAttachmentContent = async (
  username: string,
  password: string,
  mailbox: string,
  uid: number,
  attachmentIndex: number
): Promise<AttachmentContent | null> => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    await connection.openBox(mailbox);

    const messages = await connection.search([["UID", String(uid)]], {
      bodies: [""],
      struct: true,
    });

    const msg = messages[0];
    if (!msg) return null;

    const allParts = msg.parts.find((p: any) => p.which === "");
    const parsed = await simpleParser(allParts.body);
    const attachment = (parsed.attachments || [])[attachmentIndex];
    if (!attachment) return null;

    return {
      filename: attachment.filename || `attachment-${attachmentIndex + 1}`,
      contentType: attachment.contentType || "application/octet-stream",
      content: attachment.content,
    };
  } finally {
    connection.end();
  }
};

export const markAsRead = async (
  username: string,
  password: string,
  mailbox: string,
  mailUid: number
): Promise<void> => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    await connection.openBox(mailbox);
    await connection.addFlags(mailUid, "\\Seen");
  } finally {
    connection.end();
  }
};

export const setFlagged = async (
  username: string,
  password: string,
  mailbox: string,
  mailUid: number,
  flagged: boolean
): Promise<void> => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    await connection.openBox(mailbox);
    if (flagged) {
      await connection.addFlags(mailUid, "\\Flagged");
    } else {
      await connection.delFlags(mailUid, "\\Flagged");
    }
  } finally {
    connection.end();
  }
};

export const markAsUnread = async (
  username: string,
  password: string,
  mailbox: string,
  mailUid: number
): Promise<void> => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    await connection.openBox(mailbox);
    await connection.delFlags(mailUid, "\\Seen");
  } finally {
    connection.end();
  }
};

async function moveToTrash(connection: Connection, mailUid: number): Promise<void> {
  try {
    await connection.moveMessage(mailUid, TRASH_MAILBOX);
    return;
  } catch {
    // Most likely cause: this account has no Trash folder yet (it predates
    // Mailux, or wasn't created through it). Create it once and retry.
  }

  await connection.addBox(TRASH_MAILBOX).catch(() => {
    // Ignore - if this fails because the box already exists (a race with
    // another request, or our first guess was wrong), the retry below will
    // surface a meaningful error either way.
  });

  await connection.moveMessage(mailUid, TRASH_MAILBOX);
}

export type DeleteResult = { movedToTrash: boolean };

/**
 * Deleting a message from any folder except Trash moves it to Trash - the
 * behavior every mainstream mail client uses, and the only way "let every
 * user delete their own mail" is safe to do without a confirmation dialog.
 * Deleting from Trash itself is permanent.
 */
export const deleteMail = async (
  username: string,
  password: string,
  mailbox: string,
  mailUid: number
): Promise<DeleteResult> => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    await connection.openBox(mailbox);

    if (mailbox === TRASH_MAILBOX) {
      await connection.deleteMessage(mailUid);
      return { movedToTrash: false };
    }

    try {
      await moveToTrash(connection, mailUid);
      return { movedToTrash: true };
    } catch (err) {
      console.error(
        `Could not move message ${mailUid} to Trash, deleting it permanently instead:`,
        err
      );
      await connection.openBox(mailbox);
      await connection.deleteMessage(mailUid);
      return { movedToTrash: false };
    }
  } finally {
    connection.end();
  }
};

export type MailFolder = {
  /** Full IMAP mailbox path, e.g. "Projects/Website" for a nested folder. */
  name: string;
  delimiter: string;
};

/**
 * Lists every mailbox on the account - the six standard ones plus any
 * custom folders the user created (through Mailux or another IMAP
 * client). Folders marked \Noselect (pure containers used only to group
 * child folders) are left out, since they can't hold messages.
 */
export const listFolders = async (username: string, password: string): Promise<MailFolder[]> => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    const boxes = await connection.getBoxes();
    const folders: MailFolder[] = [];

    const walk = (tree: Record<string, any>, prefix: string) => {
      for (const [name, node] of Object.entries(tree)) {
        const delimiter: string = node?.delimiter || "/";
        const fullName = prefix ? `${prefix}${delimiter}${name}` : name;
        const attribs: string[] = node?.attribs ?? [];

        if (!attribs.includes("\\Noselect")) {
          folders.push({ name: fullName, delimiter });
        }

        if (node?.children) {
          walk(node.children, fullName);
        }
      }
    };

    walk(boxes, "");
    return folders;
  } finally {
    connection.end();
  }
};

// Folder names are kept simple on purpose: no IMAP delimiter characters
// (so a single addBox call can't accidentally create nested folders the
// user didn't ask for), no leading/trailing whitespace, nothing exotic.
const FOLDER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;

export const createFolder = async (
  username: string,
  password: string,
  name: string
): Promise<void> => {
  const trimmed = name.trim();

  if (!FOLDER_NAME_PATTERN.test(trimmed)) {
    throw new Error(
      "Folder names may only contain letters, numbers, spaces, - and _, and must be 1-64 characters"
    );
  }

  if (STANDARD_MAILBOXES.has(trimmed)) {
    throw new Error("A folder with that name already exists");
  }

  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    await connection.addBox(trimmed);
  } finally {
    connection.end();
  }
};

export const moveMail = async (
  username: string,
  password: string,
  fromMailbox: string,
  mailUid: number,
  toMailbox: string
): Promise<void> => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    await connection.openBox(fromMailbox);
    await connection.moveMessage(mailUid, toMailbox);
  } finally {
    connection.end();
  }
};
