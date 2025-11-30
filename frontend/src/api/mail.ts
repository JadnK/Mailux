import axios from 'axios';

const API_BASE_URL = 'http://jadenk.de:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await axios.post(`${API_BASE_URL}/login`, { username, password });
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
  
  getFolders: async () => {
    const response = await api.get('/mail/folder/dummy');
    return response.data;
  },
  
  createFolder: async (folderName: string) => {
    const response = await api.post('/mail/folder', { folderName });
    return response.data;
  },
};