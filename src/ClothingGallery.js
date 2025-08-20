import React, { useState, useEffect, forwardRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ClothingGallery = forwardRef(({ onSelectClothing, showSelectedImage, setShowSelectedImage }, ref) => {
  const { user } = useAuth();
  const [clothingImages, setClothingImages] = useState([]);
  const [loading, setLoading] = useState(true); // Corrected: Added useState
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); // Stores the full selected image object
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const [currentSearch, setCurrentSearch] = useState(''); // State to hold the actual search query
  const itemsPerPage = 6; // Display 6 items at a time

  const fetchClothingImages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token'); 
      const response = await axios.get('http://localhost:5000/api/clothing-images', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setClothingImages(response.data);
      // Automatically select the first image if available
      if (response.data.length > 0) {
        setSelectedImage(response.data[0]);
        onSelectClothing(response.data[0].image_url);
      }
    } catch (err) {
      console.error('Error fetching clothing images:', err);
      setError('Failed to load clothing images. Please ensure you are logged in and authorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchClothingImages();
    }
  }, [user]);

  const handleThumbnailClick = (image) => {
    setSelectedImage(image);
    onSelectClothing(image.image_url);
    setShowSelectedImage(true); // Show selected image view
  };

  const handleBackToGallery = () => {
    setShowSelectedImage(false); // Show thumbnail gallery view
  };

  const handleSearch = () => {
    setCurrentSearch(searchTerm); // Update currentSearch only when button is clicked
    setCurrentPage(1); // Reset to first page on new search
  };

  // Filter images based on search term
  const filteredImages = clothingImages.filter(image => {
    if (!currentSearch) return true; // If no search term, show all images

    const lowerCaseSearchTerm = currentSearch.toLowerCase();
    const clothingNumber = image.clothing_number ? String(image.clothing_number).toLowerCase() : '';
    const versionName = image.version ? String(image.version).toLowerCase() : '';
    const fullClothingIdentifier = `${clothingNumber}${versionName}`;
    const imageName = image.name ? String(image.name).toLowerCase() : '';

    // Check if the search term is a pure number
    const isNumericSearch = /^\d+$/.test(lowerCaseSearchTerm);

    if (isNumericSearch) {
      // If numeric search, match exact clothingNumber.
      return clothingNumber === lowerCaseSearchTerm;
    } else {
      // If alphanumeric search (e.g., "100a") or general text search,
      // match full clothing identifier (number + version) or image name.
      return fullClothingIdentifier.includes(lowerCaseSearchTerm) || imageName.includes(lowerCaseSearchTerm);
    }
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredImages.slice(indexOfFirstItem, indexOfLastItem); // Use filteredImages here
  const totalPages = Math.ceil(filteredImages.length / itemsPerPage); // Use filteredImages for total pages

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <p>Loading clothing gallery...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="clothing-gallery-main">
      {clothingImages.length === 0 ? (
        <p>No clothing images available in the gallery. Admin can add them.</p>
      ) : (
        <>
          <div className={`gallery-view ${showSelectedImage ? 'slide-out' : 'slide-in'}`}>
            <div className="clothing-search-wrapper"> {/* Changed to wrapper for icon inside */}
              <input
                type="text"
                placeholder="Search by number (e.g., 100, 100a)"
                className="clothing-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => { // Allow pressing Enter to search
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <span className="search-icon" onClick={handleSearch}>🔍</span> {/* Search icon */}
            </div>
            <div className="gallery-thumbnails-grid">
              {currentItems.map(image => (
                <div 
                  key={image.id} 
                  className={`gallery-thumbnail-item ${selectedImage && selectedImage.id === image.id ? 'selected' : ''}`}
                  onClick={() => handleThumbnailClick(image)}
                >
                  <img src={image.image_url} alt={image.name} />
                  <div className="thumbnail-info">
                    {/* Removed number and version display */}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination removed as per user request */}
            {/*
            {totalPages > 1 && (
              <div className="pagination">
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => paginate(index + 1)}
                    className={currentPage === index + 1 ? 'active' : ''}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
            */}
          </div>

          <div className={`selected-image-view ${showSelectedImage ? 'slide-in' : 'slide-out'}`}>
            {selectedImage && (
              <div className="selected-image-fullscreen">
                <button className="back-to-gallery-btn" onClick={handleBackToGallery}>
                  &larr; Back to Gallery
                </button>
                <img ref={ref} src={selectedImage.image_url} alt={selectedImage.name} />
                <div className="selected-image-info-overlay">
                  <h4>{selectedImage.name}</h4>
                  <p>#{selectedImage.clothing_number}-{selectedImage.version}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default ClothingGallery;
