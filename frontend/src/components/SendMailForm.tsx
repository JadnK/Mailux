import React, { useState } from "react";
import { sendMail } from "../api/mail";

const SendMailForm: React.FC = () => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendMail({ from: "Info <info@jadenk.de>", to, subject, text });
      setStatus("Mail sent!");
    } catch (err) {
      console.error(err);
      setStatus("Error sending mail");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      <input
        type="text"
        placeholder="To"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="border p-2 rounded bg-gray-700 text-gray-100 border-gray-600 focus:border-purple-400"
      />
      <input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="border p-2 rounded bg-gray-700 text-gray-100 border-gray-600 focus:border-purple-400"
      />
      <textarea
        placeholder="Message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="border p-2 rounded bg-gray-700 text-gray-100 border-gray-600 focus:border-purple-400"
      />
      <button
        type="submit"
        className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
      >
        Send
      </button>
      {status && <p className="mt-2">{status}</p>}
    </form>
  );
};

export default SendMailForm;