import React from "react";
import Layout from "../components/Layout";
import SendMailForm from "../components/SendMailForm";

const ComposePage: React.FC = () => {
  return (
    <Layout>
      <h2 className="text-lg font-semibold mb-4 text-purple-400">Compose Mail</h2>
      <SendMailForm />
    </Layout>
  );
};

export default ComposePage;