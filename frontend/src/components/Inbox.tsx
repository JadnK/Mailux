import React from "react";
import type { Mail } from "../types/mail";

interface InboxProps {
  username?: string;
  mails?: Mail[];
}

const Inbox: React.FC<InboxProps> = ({ username, mails = [] }) => {
  return (
    <div>
      {username && <h2 className="text-lg font-semibold mb-4 text-purple-400">{username}'s Inbox</h2>}
      {mails.length === 0 ? (
        <p>No mails found.</p>
      ) : (
        mails.map((mail, i) => (
          <div key={i} className="border p-2 mb-2 rounded bg-gray-800 text-white shadow">
            <p><strong>From:</strong> {mail.from}</p>
            <p><strong>Subject:</strong> {mail.subject}</p>
            <p>{mail.text}</p>
            <p className="text-sm text-gray-400">{mail.date}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default Inbox;
