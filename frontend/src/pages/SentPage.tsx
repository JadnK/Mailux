import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import type { Mail } from "../types/mail";
import { fetchSent } from "../api/mail"; 
import Sent from "../components/Sent";

interface Props {
  username: string;
}

const SentPage: React.FC<Props> = ({ username }) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSent = async () => {
      try {
        const data = await fetchSent(username);
        setMails(data);
      } catch {
        console.error("Failed to fetch sent mails");
      } finally {
        setLoading(false);
      }
    };
    loadSent();
  }, [username]);

  return (
    <Layout username={username}>
      <h2 className="text-lg font-semibold mb-4 text-purple-400">Sent Mails</h2>
      {loading ? <p>Loading...</p> : <Sent mails={mails} />}
    </Layout>
  );
};

export default SentPage;
