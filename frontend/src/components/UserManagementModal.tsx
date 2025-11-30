import React, { useState, useEffect } from 'react';
import { getUsers, createUser, login } from '../api/auth';

interface User {
  username: string;
  canReceiveMail?: boolean;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentToken: string;
  onUserSwitch: (newToken: string, newUsername: string) => void;
  currentUsername: string;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentToken,
  onUserSwitch,
  currentUsername
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [switchingUser, setSwitchingUser] = useState(false);

  useEffect(() => {
    if (isOpen && currentToken) {
      fetchUsers();
    }
  }, [isOpen, currentToken]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const userList = await getUsers(currentToken);
      setUsers(userList);
    } catch (err) {
      setError('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      setError('Username and password are required');
      return;
    }

    setCreatingUser(true);
    setError('');
    try {
      await createUser(currentToken, newUsername, newPassword);
      setNewUsername('');
      setNewPassword('');
      setShowAddUser(false);
      fetchUsers(); // Refresh the user list
    } catch (err) {
      setError('Failed to create user');
      console.error(err);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUserSwitch = async (username: string) => {
    if (!switchPassword) {
      setError('Password is required to switch user');
      return;
    }

    setSwitchingUser(true);
    setError('');
    try {
      const authData = await login(username, switchPassword);
      onUserSwitch(authData.token, authData.username);
      setSwitchPassword('');
      setSelectedUser(null);
      onClose();
    } catch (err) {
      setError('Invalid password');
      console.error(err);
    } finally {
      setSwitchingUser(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">User Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-600 text-white rounded">
            {error}
          </div>
        )}

        {showAddUser ? (
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={creatingUser}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {creatingUser ? 'Creating...' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-4">
              <button
                onClick={() => setShowAddUser(true)}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                + Add Mail User
              </button>
            </div>

            {loading ? (
              <div className="text-center text-gray-300">Loading users...</div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.username} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.username}</div>
                          {user.username === currentUsername && (
                            <div className="text-xs text-green-400">Current User</div>
                          )}
                        </div>
                      </div>
                      {user.username !== currentUsername && (
                        <button
                          onClick={() => setSelectedUser(user.username)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                    
                    {selectedUser === user.username && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex space-x-2">
                          <input
                            type="password"
                            placeholder="Enter password"
                            value={switchPassword}
                            onChange={(e) => setSwitchPassword(e.target.value)}
                            className="flex-1 px-3 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => handleUserSwitch(user.username)}
                            disabled={switchingUser}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                          >
                            {switchingUser ? 'Switching...' : 'Switch'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagementModal;