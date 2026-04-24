import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export interface UserSettings {
  name: string;
  signature: string;
  canReceiveMails: boolean;
  vacationMode: boolean;
  vacationMessage?: string;
}

export const settingsApi = {
  getUserSettings: async (username: string, token: string): Promise<UserSettings> => {
    const response = await axios.get(`${API_BASE_URL}/settings/${username}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': `${API_KEY}`
      }
    });
    return response.data;
  },

  updateUserSettings: async (username: string, settings: Partial<UserSettings>, token: string): Promise<UserSettings> => {
    const response = await axios.patch(`${API_BASE_URL}/settings/${username}`, settings, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': `${API_KEY}`
      }
    });
    return response.data;
  }
};