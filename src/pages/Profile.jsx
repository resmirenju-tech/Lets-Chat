import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { userService } from '@/services/userService'
import toast from 'react-hot-toast'
import './Profile.css'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({
    full_name: '',
    avatar_url: '',
    status: 'online',
  })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeMenu, setActiveMenu] = useState('account')
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        setResetEmail(user?.email || '')

        if (user) {
          const result = await userService.getCurrentProfile()
          if (result.success) {
            setProfile(result.data)
          } else {
            toast.error(result.error)
          }
        }
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    }

    getCurrentUser()
  }, [])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await userService.updateProfile({
        full_name: profile.full_name,
        status: profile.status,
      })

      if (result.success) {
        setProfile(result.data)
        toast.success('Profile updated!')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await userService.uploadProfilePhoto(file)
      if (result.success) {
        setProfile(prev => ({
          ...prev,
          avatar_url: result.avatar_url,
        }))
        toast.success('Photo updated!')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setResetLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail)
      if (error) throw error

      toast.success('Password reset link sent to your email!')
      setShowPasswordReset(false)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setResetLoading(false)
    }
  }

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>
  }

  const menuItems = [
    { id: 'account', label: 'Account', icon: '🔐' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'security', label: 'Security', icon: '🔑' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ]

  return (
    <div className="profile-container">
      {/* Sidebar Menu */}
      <div className="profile-sidebar">
        <div className="profile-top">
          <h2>Profile</h2>
        </div>
        <nav className="profile-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.id)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="profile-content">
        {activeMenu === 'account' && (
          <div className="profile-section">
            <div className="profile-header">
              <div className="profile-photo-container">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="profile-photo" />
                ) : (
                  <div className="profile-photo-placeholder">{profile?.full_name?.charAt(0) || '👤'}</div>
                )}
                <label className="photo-upload-btn">
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div className="profile-info">
                <h3>{profile?.full_name || 'User'}</h3>
                <p>{user?.email}</p>
              </div>
            </div>

            <form className="profile-form" onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={profile?.status || 'online'}
                  onChange={(e) => setProfile(prev => ({ ...prev, status: e.target.value }))}
                  disabled={loading}
                >
                  <option value="online">🟢 Online</option>
                  <option value="away">🟡 Away</option>
                  <option value="busy">🔴 Busy</option>
                  <option value="offline">⚪ Offline</option>
                </select>
              </div>

              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? '⏳ Saving...' : '✓ Save Changes'}
              </button>
            </form>

            <button className="btn-password" onClick={() => setShowPasswordReset(true)}>
              🔐 Reset Password
            </button>
          </div>
        )}

        {activeMenu === 'privacy' && (
          <div className="profile-section">
            <h3>Privacy Settings</h3>
            <div className="setting-item">
              <span>Show online status</span>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="setting-item">
              <span>Read receipts</span>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="setting-item">
              <span>Allow calls</span>
              <input type="checkbox" defaultChecked />
            </div>
          </div>
        )}

        {activeMenu === 'security' && (
          <div className="profile-section">
            <h3>Security Settings</h3>
            <div className="security-option">
              <h4>🔐 Change Password</h4>
              <p>Update your password</p>
              <button className="btn-secondary" onClick={() => setShowPasswordReset(true)}>
                Change Password
              </button>
            </div>
            <div className="security-option">
              <h4>📋 Login Activity</h4>
              <p>View your recent login history</p>
            </div>
          </div>
        )}

        {activeMenu === 'about' && (
          <div className="profile-section">
            <h3>About</h3>
            <div className="about-item">
              <span className="about-label">Email</span>
              <span className="about-value">{user?.email}</span>
            </div>
            <div className="about-item">
              <span className="about-label">Version</span>
              <span className="about-value">1.0.0</span>
            </div>
            <div className="about-item">
              <span className="about-label">Account Created</span>
              <span className="about-value">{new Date(user?.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="modal-overlay" onClick={() => setShowPasswordReset(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <form onSubmit={handlePasswordReset}>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={resetLoading}
              />
              <button type="submit" disabled={resetLoading}>
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <button className="btn-close" onClick={() => setShowPasswordReset(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
