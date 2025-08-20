import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import './AdminDashboard.css';
import { useAuth } from './AuthContext';

function AdminDashboard() {
  return (
    <div className="admin-app">
      <div className="admin-container">
        <header className="admin-header">
          <div className="header-content">
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">
              Manage your platform with ease and efficiency
            </p>
          </div>
        </header>

        <nav className="admin-nav">
          <ul className="nav-grid">
            <li className="nav-item">
              <Link to="users" className="nav-link">
                <div className="nav-icon">👥</div>
                <span className="nav-text">Manage Users</span>
                <span className="nav-description">User accounts & permissions</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link to="stores" className="nav-link">
                <div className="nav-icon">🏪</div>
                <span className="nav-text">Manage Stores</span>
                <span className="nav-description">Store listings & details</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link to="clothing-images" className="nav-link">
                <div className="nav-icon">👕</div>
                <span className="nav-text">Clothing Images</span>
                <span className="nav-description">Product media & assets</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link to="analytics" className="nav-link">
                <div className="nav-icon">📊</div>
                <span className="nav-text">Analytics</span>
                <span className="nav-description">Performance metrics</span>
              </Link>
            </li>
          </ul>
        </nav>

        <main className="admin-content">
          <Outlet />
        </main>

        <footer className="admin-footer">
          <LogoutButton />
        </footer>
      </div>
    </div>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button onClick={logout} className="logout-button">
      Logout
    </button>
  );
}

export default AdminDashboard;
