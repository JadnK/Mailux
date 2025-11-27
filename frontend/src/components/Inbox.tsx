import type { Mail } from "../types/mail";

interface Props {
  username?: string;
  mails?: Mail[];
}

const Inbox: React.FC<Props> = ({ username, mails = [] }) => {
  return (
    <div>
      {username && <h2 className="text-lg font-semibold mb-4 text-purple-400">{username}'s Inbox</h2>}
      {mails.length === 0 ? (
        <p className="text-gray-400">No mails found.</p>
      ) : (
        mails.map((mail, i) => (
          <div key={i} className="border p-3 mb-3 rounded bg-gray-800 text-gray-100 shadow-lg hover:bg-gray-700 transition">
            <p><strong>From:</strong> {mail.from}</p>
            <p><strong>Subject:</strong> {mail.subject}</p>
            <p className="mt-1">{mail.text}</p>
            <p className="text-sm text-gray-400 mt-1">{mail.date}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default Inbox;