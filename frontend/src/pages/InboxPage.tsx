import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Inbox from "../components/Inbox";
import { fetchInbox } from "../api/mail";
import type { Mail } from "../api/mail";

interface Props {
  username: string;
}

const InboxPage: React.FC<Props> = ({ username }) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMails = async () => {
      try {
        const data = await fetchInbox(username);
        setMails(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadMails();
  }, [username]);

  return (
    <Layout>
      <h2 className="text-lg font-semibold mb-4 text-purple-400">Inbox</h2>
      {loading ? <p>Loading...</p> : <Inbox mails={mails} />}
    </Layout>
  );
};

export default InboxPage;