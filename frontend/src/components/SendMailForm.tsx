import { useState } from "react";
import { sendMail } from "../api/mail";

const SendMailForm: React.FC = () => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendMail({ from: "info@jadenk.de", to, subject, text });
      setStatus("Mail sent!");
    } catch (err) {
      setStatus("Failed to send mail.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label>To:</label>
        <input type="email" className="w-full p-2 rounded bg-gray-700 text-white" value={to} onChange={(e) => setTo(e.target.value)} required />
      </div>
      <div>
        <label>Subject:</label>
        <input type="text" className="w-full p-2 rounded bg-gray-700 text-white" value={subject} onChange={(e) => setSubject(e.target.value)} required />
      </div>
      <div>
        <label>Message:</label>
        <textarea className="w-full p-2 rounded bg-gray-700 text-white" value={text} onChange={(e) => setText(e.target.value)} required />
      </div>
      <button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded">Send</button>
      {status && <p className="mt-2 text-gray-300">{status}</p>}
    </form>
  );
};

export default SendMailForm;
