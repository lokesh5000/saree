import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext'; // Import useAuth to get user's role and storeId

function ManageUsers() {
  const { user } = useAuth(); // Get authenticated user info
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]); // To populate store dropdown for user creation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [newUserStoreId, setNewUserStoreId] = useState('');

  const fetchUsersAndStores = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token'); 

      // Fetch users
      const usersResponse = await axios.get('http://localhost:5000/api/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsers(usersResponse.data);

      // Fetch stores (only if super-admin or admin)
      if (user && (user.role === 'super-admin' || user.role === 'admin')) {
        const storesResponse = await axios.get('http://localhost:5000/api/stores', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        // Access the 'data' property of the response, as the API now returns { success: true, data: [...] }
        setStores(storesResponse.data.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please ensure you are authorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) { // Only fetch if user is authenticated
      fetchUsersAndStores();
    }
  }, [user]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token'); 
      const body = {
        username: newUsername,
        password: newPassword,
        role: newUserRole,
        storeId: newUserRole === 'super-admin' ? undefined : newUserStoreId, // storeId is optional for super-admin
      };

      await axios.post('http://localhost:5000/api/users/create', body, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      alert('User created successfully!');
      setNewUsername('');
      setNewPassword('');
      setNewUserRole('user');
      setNewUserStoreId('');
      fetchUsersAndStores(); // Refresh list
    } catch (err) {
      console.error('Error creating user:', err);
      alert(`Failed to create user: ${err.response?.data?.msg || err.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        alert('User deleted successfully!');
        fetchUsersAndStores(); // Refresh list
      } catch (err) {
        console.error('Error deleting user:', err);
        alert(`Failed to delete user: ${err.response?.data?.msg || err.message}`);
      }
    }
  };

  if (loading) return <p>Loading users...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h3>Manage Users</h3>

      {(user.role === 'super-admin' || user.role === 'admin') && (
        <>
          <h4>Create New User</h4>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label htmlFor="newUsername">Username</label>
              <input
                type="text"
                id="newUsername"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newUserRole">Role</label>
              <select id="newUserRole" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                <option value="user">User</option>
                {(user.role === 'super-admin') && <option value="admin">Admin</option>}
                {(user.role === 'super-admin') && <option value="super-admin">Super Admin</option>}
              </select>
            </div>
            {(newUserRole === 'user' || newUserRole === 'admin') && (
              <div className="form-group">
                <label htmlFor="newUserStoreId">Store</label>
                <select 
                  id="newUserStoreId" 
                  value={newUserStoreId} 
                  onChange={(e) => setNewUserStoreId(e.target.value)}
                  required={newUserRole !== 'super-admin'}
                >
                  <option value="">-- Select a Store --</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="auth-button">Create User</button>
          </form>
        </>
      )}

      <h4 style={{ marginTop: '30px' }}>Existing Users</h4>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Store</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => ( // Renamed user to u to avoid conflict with `user` from useAuth
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.store_id ? u.stores.name : 'N/A'}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    onClick={() => handleDeleteUser(u.id)} 
                    disabled={user.id === u.id} // Prevent deleting self
                    className="delete-button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ManageUsers;
