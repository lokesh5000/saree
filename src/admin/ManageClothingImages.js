import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

function ManageClothingImages() {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newImageUrl, setNewImageUrl] = useState('');
  const [newClothingNumber, setNewClothingNumber] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [newName, setNewName] = useState('');

  const fetchImages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token'); 
      const response = await axios.get('http://localhost:5000/api/clothing-images', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setImages(response.data);
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to fetch images. Please ensure you are authorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchImages();
    }
  }, [user]);

  const handleUploadImage = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token'); 
      const body = {
        imageUrl: newImageUrl,
        clothingNumber: newClothingNumber,
        version: newVersion,
        name: newName,
      };

      await axios.post('http://localhost:5000/api/clothing-images/upload', body, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      alert('Clothing image uploaded successfully!');
      setNewImageUrl('');
      setNewClothingNumber('');
      setNewVersion('');
      setNewName('');
      fetchImages(); // Refresh list
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(`Failed to upload image: ${err.response?.data?.msg || err.message}`);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/clothing-images/${imageId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      alert('Clothing image deleted successfully!');
      fetchImages(); // Refresh the list after deletion
    } catch (err) {
      console.error('Error deleting image:', err);
      alert(`Failed to delete image: ${err.response?.data?.msg || err.message}`);
    }
  };

  if (loading) return <p>Loading clothing images...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h3>Manage Clothing Images</h3>

      {(user.role === 'super-admin' || user.role === 'admin') && (
        <>
          <h4>Upload New Clothing Image</h4>
          <form onSubmit={handleUploadImage}>
            <div className="form-group">
              <label htmlFor="newImageUrl">Image URL</label>
              <input
                type="text"
                id="newImageUrl"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newClothingNumber">Clothing Number</label>
              <input
                type="text"
                id="newClothingNumber"
                value={newClothingNumber}
                onChange={(e) => setNewClothingNumber(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newVersion">Version (e.g., a, b, c)</label>
              <input
                type="text"
                id="newVersion"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newName">Name</label>
              <input
                type="text"
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-button">Upload Image</button>
          </form>
        </>
      )}

      <h4 style={{ marginTop: '30px' }}>Existing Clothing Images</h4>
      {images.length === 0 ? (
        <p>No clothing images found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Number</th>
              <th>Version</th>
              <th>Name</th>
              <th>Uploaded By</th>
              <th>Created At</th>
              <th>Actions</th> {/* New table header for actions */}
            </tr>
          </thead>
          <tbody>
            {images.map(image => (
              <tr key={image.id}>
                <td><img src={image.image_url} alt={image.name} style={{ width: '50px', height: '50px', objectFit: 'cover' }} /></td>
                <td>{image.clothing_number}</td>
                <td>{image.version}</td>
                <td>{image.name}</td>
                <td>{image.users.username}</td>
                <td>{new Date(image.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    onClick={() => handleDeleteImage(image.id)} 
                    className="delete-button" // Add a class for styling
                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}
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

export default ManageClothingImages;
