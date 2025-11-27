import React from "react";
import type { Mail } from "../api/mail";

interface Props {
  mails: Mail[];
}

const Inbox: React.FC<Props> = ({ mails }) => {
  if (mails.length === 0) return <p>No mails found.</p>;

  return (
    <div>
      {mails.map((mail, i) => (
        <div key={i} className="border p-2 mb-2 rounded bg-gray-800 shadow">
          <p><strong>From:</strong> {mail.from}</p>
          <p><strong>Subject:</strong> {mail.subject}</p>
          <p>{mail.text}</p>
          <p className="text-sm text-gray-400">{mail.date}</p>
        </div>
      ))}
    </div>
  );
};

export default Inbox;
