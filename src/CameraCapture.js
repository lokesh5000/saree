import React from 'react';
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';

function CameraCapture({ onCapture, onCancel }) {
  const handleTakePhoto = (dataUri) => {
    onCapture(dataUri);
  };

  return (
    <div className="camera-capture-container">
      <Camera
        onTakePhoto={(dataUri) => { handleTakePhoto(dataUri); }}
        idealResolution={{ width: 640, height: 480 }}
      />
      <div className="camera-controls">
        <button className="camera-cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default CameraCapture;
