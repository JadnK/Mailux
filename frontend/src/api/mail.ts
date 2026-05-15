import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const api = axios.create({
  baseURL: API_BASE_URL,
});

let isLoggingOut = false;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  config.headers['x-api-key'] = API_KEY;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isLoggingOut &&
      window.location.pathname !== '/login'
    ) {
      isLoggingOut = true;

      localStorage.removeItem('token');
      localStorage.removeItem('username');

      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/login', { username, password });
    return response.data;
  },
};

export const mailAPI = {
  getInbox: async () => {
    const response = await api.get('/mail/inbox/dummy'); 
    return response.data;
  },
  
  getSent: async () => {
    const response = await api.get('/mail/sent/dummy');
    return response.data;
  },
  
  sendMail: async (mailData: any) => {
    const response = await api.post('/mail/send', mailData);
    return response.data;
  },
  
  replyMail: async (mailData: any) => {
    const response = await api.post('/mail/reply', mailData);
    return response.data;
  },
  
  deleteMail: async (mailbox: string, uid: number) => {
    const response = await api.delete('/mail/delete', { data: { mailbox, uid } });
    return response.data;
  },
  
  getFolders: async () => {
    const response = await api.get('/mail/folder/dummy');
    return response.data;
  },
  
  createFolder: async (folderName: string) => {
    const response = await api.post('/mail/folder', { folderName });
    return response.data;
  },
};