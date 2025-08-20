import React, { useState, useEffect, useRef } from 'react';
import { fal } from "@fal-ai/client";
import './App.css';
import { loadPoseNet, estimatePose, comparePoses } from './poseUtils';
import { BrowserRouter as Router, Route, Routes, Link, Outlet, Navigate } from 'react-router-dom';
import axios from 'axios'; // Import axios for API calls

// Import other components
import AuthPage from './AuthPage';
import AdminDashboard from './AdminDashboard';
import ManageUsers from './admin/ManageUsers';
import ManageStores from './admin/ManageStores';
import ManageClothingImages from './admin/ManageClothingImages';
import ViewAnalytics from './admin/ViewAnalytics';
import ClothingGallery from './ClothingGallery'; // Import ClothingGallery
import { AuthProvider, useAuth } from './AuthContext';
import CameraCapture from './CameraCapture';

fal.config({
  credentials: "2e34b4d3-c6d6-465f-9827-e7f0f783c498:a25954f73794c1040c8ba92ae1ad8f39"
});

function AppContent() {
  const { user, logout } = useAuth(); // Get authenticated user
  const [fullBodyImage, setFullBodyImage] = useState(null);
  // Removed clothingImage state as it's no longer used for direct upload
  const [fullBodyImageUrl, setFullBodyImageUrl] = useState(null);
  const [clothingImageUrl, setClothingImageUrl] = useState(null); // This will be updated by gallery selection
  const [resultTryOnImage, setResultTryOnImage] = useState(null); 
  const [loading, setLoading] = useState(0); 
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [poseNet, setPoseNet] = useState(null);
  const [posesMatch, setPosesMatch] = useState(null);
  const [poseStatus, setPoseStatus] = useState('');
  const [userCredits, setUserCredits] = useState(0);
  const [hasEnoughCredits, setHasEnoughCredits] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [currentView, setCurrentView] = useState('upload'); 
  const [showCamera, setShowCamera] = useState(false);
  const [showSelectedImage, setShowSelectedImage] = useState(false);

  const fullBodyImageRef = useRef(null);

  const [fullBodyPose, setFullBodyPose] = useState(null);
  const [clothingPose, setClothingPose] = useState(null);






  useEffect(() => {
    async function loadModel() {
      setPoseStatus('Loading pose model...');
      const net = await loadPoseNet();
      setPoseNet(net);
      setPoseStatus('Pose model loaded.');
    }
    loadModel();
  }, []);

  // Estimate pose for the clothing image whenever clothingImageUrl changes
  useEffect(() => {
    async function estimateClothingPose() {
      if (poseNet && clothingImageUrl) {
        setPoseStatus(`Estimating pose for clothing...`);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = clothingImageUrl;
        await img.decode(); // Ensure image is fully decoded
        const pose = await estimatePose(poseNet, img);
        setClothingPose(pose);
      }
    }
    if (clothingImageUrl) {
      estimateClothingPose();
    }
  }, [clothingImageUrl, poseNet]);


  useEffect(() => {
    async function checkPoses() {
      if (poseNet && fullBodyPose && clothingPose) {
        setPoseStatus('Comparing poses...');
        const match = comparePoses(fullBodyPose, clothingPose);
        setPosesMatch(match);
        setPoseStatus(match ? 'Poses match!' : 'Poses do not match.');
      }
    }
    if (fullBodyPose && clothingPose && showSelectedImage) {
      checkPoses();
    }
  }, [poseNet, fullBodyPose, clothingPose, showSelectedImage]);

  // Fetch user's credits (hidden from UI but used for validation)
  const fetchUserCredits = async () => {
    if (user && user.role === 'user' && user.store_id) {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('No token found in localStorage');
          setAuthError(true);
          setUserCredits(0);
          setHasEnoughCredits(false);
          return;
        }
        
        console.log('Fetching credits for store:', user.store_id);
        console.log('Using token:', token ? 'Present' : 'Missing');
        
        const response = await axios.get(`http://localhost:5000/api/stores/${user.store_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Credit fetch response:', response.data);
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to fetch credits');
        }
        
        const credits = response.data.data.credits;
        console.log('Credits found:', credits);
        
        setUserCredits(credits);
        setHasEnoughCredits(credits > 0);
        setAuthError(false);
        
      } catch (err) {
        console.error('Error fetching user credits:', err);
        console.error('Error response:', err.response?.data);
        
        // Handle specific error cases
        if (err.response?.status === 401) {
          console.log('Token expired or invalid');
          setAuthError(true);
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } else if (err.response?.status === 403) {
          console.log('Access forbidden');
          setAuthError(true);
        }
        
        setUserCredits(0);
        setHasEnoughCredits(false);
      }
    } else if (user && (user.role === 'admin' || user.role === 'super-admin')) {
      // Admins and super-admins get unlimited credits
      setHasEnoughCredits(true);
      setUserCredits(999);
      setAuthError(false);
    } else {
      console.log('User not eligible for credit check:', user);
      setUserCredits(0);
      setHasEnoughCredits(false);
      setAuthError(false);
    }
  };
  
  // Add this debugging info to the fetchUserCredits useEffect
  useEffect(() => {
    console.log('User changed:', user);
    console.log('Token in localStorage:', localStorage.getItem('token'));
    fetchUserCredits();
  }, [user]); // Removed redundant useEffect trigger

  const handleFullBodyImageChange = async (fileOrUrl, setImage, setImageUrl, setPose, imageRef) => {
    let url = '';
    let isFile = false;
    let fileName = '';

    if (fileOrUrl instanceof File) {
      isFile = true;
      setImage(fileOrUrl);
      url = URL.createObjectURL(fileOrUrl);
      fileName = fileOrUrl.name;
    } else if (typeof fileOrUrl === 'string') {
      isFile = false; // It's a URL directly
      setImage(null); // No File object for URL
      url = fileOrUrl;
      fileName = "camera_image"; // Generic name for camera image
    } else {
      setImage(null);
      setImageUrl("");
      setPose(null);
      return;
    }
    
    setImageUrl(url);

    setTimeout(async () => {
      if (poseNet && url) { // Ensure poseNet is loaded and we have a URL
        setPoseStatus(`Estimating pose for ${fileName}...`);
        const imgElement = new Image();
        imgElement.crossOrigin = "anonymous"; // Needed for cross-origin images
        imgElement.src = url;
        await imgElement.decode(); // Ensure image is fully decoded
        
        const pose = await estimatePose(poseNet, imgElement);
        setPose(pose);
      }
    }, 100);
  };

  const handleTryOn = async () => {
    if (!posesMatch) {
      alert("Poses do not match. Please use images with similar poses.");
      return;
    }
    if (!hasEnoughCredits && user && user.role === 'user') {
      alert('Insufficient credits to perform try-on. Please contact your administrator.');
      return;
    }
    if (!clothingImageUrl) {
      alert("Please select a clothing image from the gallery.");
      return;
    }

    setLoading(true);
    setResultTryOnImage(null);
    setProgress(0);
    setCurrentView('processing');
    
    try {
      const input = {
        full_body_image: fullBodyImage || fullBodyImageUrl,
        clothing_image: clothingImageUrl, // Use the URL from state directly
        gender: "female"
      };

      // Simulate progress updates
      setProgressText('Initializing...');
      setProgress(10);

      const result = await fal.subscribe("easel-ai/fashion-tryon", {
        input: input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            const logs = update.logs || [];
            const currentProgress = Math.min(90, 20 + (logs.length * 10));
            setProgress(currentProgress);
            
            if (logs.length > 0) {
              const latestLog = logs[logs.length - 1].message;
              setProgressText(latestLog);
            }
          }
        },
      });
      
      setProgress(100);
      setProgressText('Complete!');
      setResultTryOnImage(result.data.image.url);

      // Replace the credit deduction section in handleTryOn with this:
      if (user && user.role === 'user' && user.store_id) {
        try {
          const token = localStorage.getItem('token');
          console.log("AppContent: Deducting credit for store:", user.store_id);
          
          const creditResponse = await axios.put(
            `http://localhost:5000/api/stores/${user.store_id}/deduct-credit`, 
            {}, // Empty body
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log("Credit deduction response:", creditResponse.data);
          
          if (!creditResponse.data.success) {
            throw new Error(creditResponse.data.message || 'Credit deduction failed');
          }
          
          console.log("AppContent: Credit deducted successfully:", creditResponse.data.data);
          
          // Record analytics event
          try {
            await axios.post('http://localhost:5000/api/analytics/record', {
              eventType: 'virtual_try_on',
              eventData: { userId: user.id, storeId: user.store_id, clothingImageUrl }
            }, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          } catch (analyticsError) {
            console.error('Analytics recording failed:', analyticsError);
            // Don't fail the try-on for analytics errors
          }
          
          // Update local state with new credits from response
          const newCredits = creditResponse.data.data.credits;
          setUserCredits(newCredits);
          setHasEnoughCredits(newCredits > 0);
          
        } catch (creditError) {
          console.error('Error deducting credit:', creditError);
          console.error('Credit error details:', creditError.response?.data);
          
          if (creditError.response?.status === 401) {
            alert('Session expired. Please log in again.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/auth';
            return;
          } else if (creditError.response?.status === 400) {
            alert('Insufficient credits. Please contact your administrator.');
            return;
          } else {
            alert('Warning: Credit deduction failed. Please contact administrator.');
          }
        }
      }
      
      setTimeout(() => {
        setCurrentView('result');
        setLoading(false);
      }, 500);
      
    } catch (error) {
      console.error("Error during try-on:", error);
      alert(`Error: ${error.message}`);
      setCurrentView('upload');
      setLoading(false);
    }
  };

  const handleReload = () => {
    setCurrentView('upload');
    setResultTryOnImage(null);
    setProgress(0);
    setProgressText('');
    setLoading(false);
  };

  // Simplified ImageUpload for Full Body only
  const ImageUpload = ({ title, imageUrl, imageRef, onChange, icon, onCameraClick }) => {
    const [showUploadOptions, setShowUploadOptions] = useState(false);
    const fileInputRef = useRef(null);

    const handleUploadClick = (e) => {
      e.stopPropagation();
      fileInputRef.current.click();
      setShowUploadOptions(false); // Hide options after selecting file
    };

    const handleCameraClick = (e) => {
      e.stopPropagation();
      onCameraClick(); // Call the parent's handler
      setShowUploadOptions(false); // Hide options
    };

    const handlePlaceholderClick = () => {
      if (!imageUrl) { // Only show options if no image is loaded
        setShowUploadOptions(!showUploadOptions);
      }
    };

    return (
      <div className="upload-container">
        <div className="upload-header">
          <span className="upload-icon">{icon}</span>
          <h3>{title}</h3>
        </div>
        <div className="upload-area">
          {imageUrl ? (
            <div className="image-preview">
              <img ref={imageRef} src={imageUrl} alt={title} crossOrigin="anonymous" />
            <div className="image-overlay">
              <button className="change-image-btn" onClick={() => onChange(null)}>
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <div className="upload-placeholder" onClick={handlePlaceholderClick}>
            <div className="upload-content">
                <span className="upload-camera-icon">📸</span> {/* Camera icon */}
                <span className="upload-plus">+</span>
                <p>Click to upload</p>
                {showUploadOptions && (
                  <div className="upload-options">
                    <button className="upload-option-btn" onClick={handleCameraClick}>Camera</button>
                    <button className="upload-option-btn" onClick={handleUploadClick}>Upload</button>
                  </div>
                )}
              </div>
            </div>
          )}
          <input
            id={title}
            type="file"
            accept="image/*"
            onChange={(e) => onChange(e.target.files[0])}
            className="file-input"
            ref={fileInputRef} // Assign ref to input
          />
        </div>
      </div>
    );
  };

  const ProgressBar = () => (
    <div className="progress-container">
      <div className="progress-header">
        <h3>Creating your virtual try-on...</h3>
        <p className="progress-text">{progressText}</p>
      </div>
      <div className="progress-bar-wrapper">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="progress-percentage">{progress}%</span>
      </div>
    </div>
  );

  const ResultView = () => (
    <div className="result-view">
      <div className="result-container">
        <h3>Your Virtual Try-On Result</h3>
        <div className="result-image-container">
          <img src={resultTryOnImage} alt="Virtual Try-On Result" className="result-image" />
        </div>
        <div className="result-actions">
          <button className="reload-btn" onClick={handleReload}>
            🔄 Try Another Look
          </button>
        </div>
      </div>
    </div>
  );

  const handleSelectClothingFromGallery = (imageUrl) => {
    setClothingImageUrl(imageUrl);
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">👗</span>
            <h1>Virtual Try-On</h1>
          </div>
          <p className="subtitle">Transform your look with AI-powered fashion</p>

          {/* Navigation links removed as per new requirements */}
        </header>

        <div className="main-content">
          {currentView === 'upload' && (
            <>
              <div className="upload-section">
                <ImageUpload
                  title="Full Body"
                  imageUrl={fullBodyImageUrl}
                  imageRef={fullBodyImageRef}
                  onChange={(file) => handleFullBodyImageChange(file, setFullBodyImage, setFullBodyImageUrl, setFullBodyPose, fullBodyImageRef)}
                  icon="👤"
                  onCameraClick={() => setShowCamera(true)}
                />
                {/* Clothing selection area - now fully managed by ClothingGallery */}
                <div className="clothing-selection-area">
                  <ClothingGallery 
                    onSelectClothing={handleSelectClothingFromGallery} 
                    showSelectedImage={showSelectedImage}
                    setShowSelectedImage={setShowSelectedImage}
                  />
                </div>
              </div>


              {poseStatus && (
                <div className={`status-card ${posesMatch === true ? 'success' : posesMatch === false ? 'error' : 'info'}`}>
                  <span className="status-icon">
                    {posesMatch === true ? '✅' : posesMatch === false ? '❌' : '⏳'}
                  </span>
                  <p>{poseStatus}</p>
                </div>
              )}

              <div className="action-section">
                <button 
                  className={`try-on-btn ${!posesMatch ? 'disabled' : ''}`} // Disabled if no pose match OR not enough credits
                  onClick={handleTryOn} 
                  disabled={!posesMatch || !clothingImageUrl} // Also disable if no clothing image is selected
                >
                  <span>✨</span>
                  Try On Clothes
                </button>
              </div>
            </>
          )}
          {currentView === 'processing' && <ProgressBar />}
          {currentView === 'result' && <ResultView />}
        </div>
        {showCamera && (
          <CameraCapture 
            onCapture={(photoUrl) => {
              handleFullBodyImageChange(photoUrl, setFullBodyImage, setFullBodyImageUrl, setFullBodyPose, fullBodyImageRef);
              setShowCamera(false);
            }} 
            onCancel={() => setShowCamera(false)} 
          />
        )}
      </div>
      
      {/* Logout button outside the white container */}
      {user && (
        <div className="logout-section">
          <button 
            className="logout-button-bottom"
            onClick={logout}
            title="Logout"
          >
            🚪
          </button>
        </div>
      )}
    </div>
  );
}

// PrivateRoute component for protecting routes
function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading authentication...</p>; // Or a loading spinner
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <p>Access Denied: You do not have permission to view this page.</p>;
  }

  return children;
}


function App() {
  return (
    <Router>
      <AuthProvider> {/* Wrap the entire application with AuthProvider */}
        <Routes>
          {/* Public route for authentication */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Private routes */}
          <Route
            path="/"
            element={<PrivateRoute allowedRoles={['user', 'admin', 'super-admin']}><AppContent /></PrivateRoute>}
          />
          <Route
            path="/admin"
            element={<PrivateRoute allowedRoles={['admin', 'super-admin']}><AdminDashboard /></PrivateRoute>}
          >
            <Route path="users" element={<ManageUsers />} />
            <Route path="stores" element={<ManageStores />} />
            <Route path="clothing-images" element={<ManageClothingImages />} />
            <Route path="analytics" element={<ViewAnalytics />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
<environment_details>
# VSCode Visible Files
src/App.js

# VSCode Open Tabs
src/admin/ManageClothingImages.js
backend/routes/clothingImageRoutes.js
src/App.css
src/ClothingGallery.js
backend/middleware/authMiddleware.js
backend/routes/storeRoutes.js
src/App.js

# Current Time
8/16/2025, 9:37:34 PM (Asia/Calcutta, UTC+5.5:00)

# Context Window Usage
505,096 / 1,048.576K tokens used (48%)

# Current Mode
ACT MODE
</environment_details>
