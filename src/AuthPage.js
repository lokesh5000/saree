import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function AuthPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Removed isLogin, role, storeId as they are no longer needed for a login-only page

  const { login } = useAuth(); // Get the login function from AuthContext
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = '/api/auth/login'; // Always login now
    const body = { username, password };

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Login successful!');
        login(data.user, data.token); // Use the login function from AuthContext for redirection
      } else {
        alert(`Error: ${data.msg || 'Something went wrong'}`);
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Network error or server unreachable.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Login</h2>
        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthPage;
