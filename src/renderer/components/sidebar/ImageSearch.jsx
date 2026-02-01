import React, { useState } from 'react';
import { FiSearch, FiDownload, FiExternalLink, FiUpload } from 'react-icons/fi';
import './ImageSearch.css';

function ImageSearch() {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggedImage, setDraggedImage] = useState(null);
  const [error, setError] = useState(null);
  const [localImages, setLocalImages] = useState([]); // Track local uploaded images

  const searchImages = async () => {
    if (!query.trim()) return;
    
    // Check if API is available
    if (!window.electronAPI?.images?.search) {
      console.error('Image search API not available. Please restart the application.');
      setImages([]);
      setError('Please restart the application to enable image search.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log('[Frontend] Searching for:', query);
      const result = await window.electronAPI.images.search(query);
      console.log('[Frontend] Search result:', result);
      
      if (result.success && result.images && result.images.length > 0) {
        setImages(result.images);
        setError(null);
      } else {
        console.error('Search failed:', result.error);
        setImages([]);
        setError(result.error || 'No images found. Try a different search term.');
      }
    } catch (err) {
      console.error('Failed to search images:', err);
      setImages([]);
      setError('Failed to search images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchImages();
    }
  };

  const handleDragStart = (e, image) => {
    setDraggedImage(image);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Set image data as JSON for the chat interface
    const imageData = {
      urls: {
        regular: image.fullUrl,
        thumb: image.thumb,
        small: image.url
      },
      alt_description: image.alt,
      user: {
        name: image.author
      }
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(imageData));
    e.dataTransfer.setData('text/plain', image.fullUrl);
    e.dataTransfer.setData('text/html', `<img src="${image.fullUrl}" alt="${image.alt}" />`);
  };

  const handleDragEnd = () => {
    setDraggedImage(null);
  };

  const downloadImage = async (image) => {
    try {
      const response = await fetch(image.fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.alt.replace(/[^a-z0-9]/gi, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  const handleLocalFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setError('Please select valid image files (JPEG, PNG, GIF, WebP, etc.)');
      return;
    }

    // Create object URLs for local images
    const newLocalImages = imageFiles.map((file, idx) => {
      const objectUrl = URL.createObjectURL(file);
      return {
        id: `local-${Date.now()}-${idx}`,
        url: objectUrl,
        fullUrl: objectUrl,
        thumb: objectUrl,
        alt: file.name,
        author: 'Local File',
        authorUrl: '',
        isLocal: true,
        fileName: file.name
      };
    });

    setLocalImages(prev => [...prev, ...newLocalImages]);
    setError(null);
    
    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const removeLocalImage = (imageId) => {
    setLocalImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove && imageToRemove.url) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  return (
    <div className="image-search">
      <div className="image-search-header">
        <h3>IMAGE SEARCH</h3>
      </div>

      <div className="image-search-content">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search for images..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="search-button" 
            onClick={searchImages}
            disabled={loading || !query.trim()}
          >
            <FiSearch size={16} />
          </button>
        </div>

        {/* Local file upload section */}
        <div className="local-upload-section">
          <input
            type="file"
            id="local-image-upload"
            accept="image/*"
            multiple
            onChange={handleLocalFileSelect}
            style={{ display: 'none' }}
          />
          <button
            className="upload-button"
            onClick={() => document.getElementById('local-image-upload').click()}
            title="Upload images from your computer"
          >
            <FiUpload size={16} />
            <span>Upload Local Images</span>
          </button>
        </div>

        {/* Display local images */}
        {localImages.length > 0 && (
          <div className="local-images-section">
            <div className="section-header">
              <h4>Local Images ({localImages.length})</h4>
            </div>
            <div className="images-grid">
              {localImages.map((image) => (
                <div 
                  key={image.id} 
                  className="image-item local-image-item"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, image)}
                  onDragEnd={handleDragEnd}
                >
                  <img 
                    src={image.url} 
                    alt={image.alt}
                    className="image-preview"
                  />
                  <div className="image-overlay">
                    <button 
                      className="remove-local-btn"
                      onClick={() => removeLocalImage(image.id)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                  <div className="image-info">
                    <span className="image-title" title={image.fileName}>{image.fileName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching for images...</p>
          </div>
        )}

        {!loading && error && (
          <div className="empty-state error-state">
            <FiSearch size={48} />
            <p>Error</p>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && images.length === 0 && query && (
          <div className="empty-state">
            <FiSearch size={48} />
            <p>No images found</p>
            <span>Try a different search term</span>
          </div>
        )}

        {!loading && images.length === 0 && !query && !error && (
          <div className="empty-state">
            <FiSearch size={48} />
            <p>Search for images</p>
            <span>Type a keyword and press Enter</span>
            <div className="drag-hint">
              <p>Tip: Drag images to the chat to share them with AI</p>
            </div>
          </div>
        )}

        {!loading && images.length > 0 && (
          <div className="unsplash-images-section">
            <div className="section-header">
              <h4>Unsplash Results ({images.length})</h4>
            </div>
            <div className="images-grid">
              {images.map((image) => (
              <div 
                key={image.id} 
                className="image-item"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, image)}
                onDragEnd={handleDragEnd}
              >
                <img 
                  src={image.url} 
                  alt={image.alt}
                  className="image-preview"
                />
                <div className="image-overlay">
                  <button 
                    className="image-action"
                    onClick={() => downloadImage(image)}
                    title="Download"
                  >
                    <FiDownload size={16} />
                  </button>
                  <a 
                    href={image.fullUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="image-action"
                    title="Open in new tab"
                  >
                    <FiExternalLink size={16} />
                  </a>
                </div>
                <div className="image-info">
                  <span className="image-author" title={`By ${image.author}`}>
                    {image.author}
                  </span>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageSearch;
