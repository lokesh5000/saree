import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ManageStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newStoreName, setNewStoreName] = useState('');
  // Removed newStoreCredits state

  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [creditsToAdd, setCreditsToAdd] = useState(0);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token'); 
      const response = await axios.get('http://localhost:5000/api/stores', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // Access the 'data' property of the response, as the API now returns { success: true, data: [...] }
      setStores(response.data.data);
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError('Failed to fetch stores. Please ensure you are authorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleCreateStore = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token'); 
      await axios.post('http://localhost:5000/api/stores/create', { 
        name: newStoreName, 
        // Initial credits will default to 0 in the backend
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      alert('Store created successfully!');
      setNewStoreName('');
      fetchStores(); // Refresh list
    } catch (err) {
      console.error('Error creating store:', err);
      alert(`Failed to create store: ${err.response?.data?.msg || err.message}`);
    }
  };

  const handleAddCredits = async (e) => {
    e.preventDefault();
    if (!selectedStoreId) {
      alert('Please select a store.');
      return;
    }
    try {
      const token = localStorage.getItem('token'); 
      await axios.put(`http://localhost:5000/api/stores/${selectedStoreId}/credits`, { 
        credits: creditsToAdd 
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      alert('Credits added successfully!');
      setCreditsToAdd(0);
      fetchStores(); // Refresh list
    } catch (err) {
      console.error('Error adding credits:', err);
      alert(`Failed to add credits: ${err.response?.data?.msg || err.message}`);
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (window.confirm('Are you sure you want to delete this store? All associated users must be deleted or reassigned first.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/stores/${storeId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        alert('Store deleted successfully!');
        fetchStores(); // Refresh list
      } catch (err) {
        console.error('Error deleting store:', err);
        alert(`Failed to delete store: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  if (loading) return <p>Loading stores...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h3>Manage Stores</h3>

      <h4>Create New Store</h4>
      <form onSubmit={handleCreateStore}>
        <div className="form-group">
          <label htmlFor="newStoreName">Store Name</label>
          <input
            type="text"
            id="newStoreName"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            required
          />
        </div>
        {/* Removed Initial Credits input */}
        <button type="submit" className="auth-button">Create Store</button>
      </form>

      <h4 style={{ marginTop: '30px' }}>Add Credits to Existing Store</h4>
      <form onSubmit={handleAddCredits}>
        <div className="form-group">
          <label htmlFor="selectStore">Select Store</label>
          <select
            id="selectStore"
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            required
          >
            <option value="">-- Select a Store --</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name} (Current Credits: {store.credits})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="creditsToAdd">Credits to Add</label>
          <input
            type="number"
            id="creditsToAdd"
            value={creditsToAdd}
            onChange={(e) => setCreditsToAdd(Number(e.target.value))}
            min="1"
            required
          />
        </div>
        <button type="submit" className="auth-button">Add Credits</button>
      </form>

      <h4 style={{ marginTop: '30px' }}>Existing Stores</h4>
      {stores.length === 0 ? (
        <p>No stores found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Credits</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(store => (
              <tr key={store.id}>
                <td>{store.name}</td>
                <td>{store.credits}</td>
                <td>{new Date(store.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    onClick={() => handleDeleteStore(store.id)} 
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

export default ManageStores;
