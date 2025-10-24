import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import './Settings.css'

export default function Settings() {
  const [expandedSection, setExpandedSection] = useState('account') // Start with account expanded
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    theme: 'light',
    notificationsEnabled: true,
    soundEnabled: true,
    messagePreview: true,
    onlineStatus: true,
    disappearingMessages: false,
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setLoading(false)
    }
  }

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    toast.success('Setting updated')
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const SettingToggle = ({ label, value, onChange, description }) => (
    <div className="setting-item">
      <div className="setting-info">
        <p className="setting-label">{label}</p>
        {description && <p className="setting-description">{description}</p>}
      </div>
      <label className="toggle-switch">
        <input 
          type="checkbox" 
          checked={value} 
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  )

  const SettingButton = ({ icon, label, description, onClick }) => (
    <button className="setting-button" onClick={onClick}>
      <div className="setting-icon">{icon}</div>
      <div className="setting-info">
        <p className="setting-label">{label}</p>
        {description && <p className="setting-description">{description}</p>}
      </div>
      <span className="arrow">›</span>
    </button>
  )

  if (loading) {
    return <div className="settings-loading">Loading settings...</div>
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
      </div>

      <div className="settings-search">
        <input 
          type="text" 
          placeholder="🔍 Search settings..." 
          className="settings-search-input"
        />
      </div>

      {/* Account Section */}
      <div className="settings-section">
        <button 
          className={`section-header ${expandedSection === 'account' ? 'expanded' : ''}`}
          onClick={() => setExpandedSection(expandedSection === 'account' ? null : 'account')}
        >
          <span className="section-icon">🔐</span>
          <div className="section-title">
            <h3>Account</h3>
            <p>Security notifications, account info</p>
          </div>
          <span className="section-chevron">›</span>
        </button>
        {expandedSection === 'account' && (
          <div className="section-content">
            <div className="account-info">
              <div className="account-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} />
                ) : (
                  <div className="avatar-placeholder">{profile?.full_name?.charAt(0)}</div>
                )}
              </div>
              <div className="account-details">
                <p className="account-name">{profile?.full_name || 'User'}</p>
                <p className="account-email">{profile?.email}</p>
              </div>
            </div>
            <SettingButton 
              icon="📞" 
              label="Phone Number" 
              description="Not set"
            />
            <SettingButton 
              icon="🔐" 
              label="Change Password" 
              description="Update your password"
            />
            <SettingButton 
              icon="🗑️" 
              label="Delete Account" 
              description="Permanently delete your account"
            />
          </div>
        )}
      </div>

      {/* Privacy Section */}
      <div className="settings-section">
        <button 
          className={`section-header ${expandedSection === 'privacy' ? 'expanded' : ''}`}
          onClick={() => setExpandedSection(expandedSection === 'privacy' ? null : 'privacy')}
        >
          <span className="section-icon">🔒</span>
          <div className="section-title">
            <h3>Privacy</h3>
            <p>Blocked contacts, disappearing messages</p>
          </div>
          <span className="section-chevron">›</span>
        </button>
        {expandedSection === 'privacy' && (
          <div className="section-content">
            <SettingToggle 
              label="Show Online Status" 
              value={settings.onlineStatus}
              onChange={(val) => handleSettingChange('onlineStatus', val)}
              description="Let others see when you're online"
            />
            <SettingToggle 
              label="Read Receipts" 
              value={true}
              onChange={(val) => {}}
              description="Show when you've read messages"
            />
            <SettingToggle 
              label="Disappearing Messages" 
              value={settings.disappearingMessages}
              onChange={(val) => handleSettingChange('disappearingMessages', val)}
              description="Messages disappear after 24 hours"
            />
            <SettingButton 
              icon="🚫" 
              label="Blocked Contacts" 
              description="Manage blocked users"
            />
          </div>
        )}
      </div>

      {/* Chats Section */}
      <div className="settings-section">
        <button 
          className={`section-header ${expandedSection === 'chats' ? 'expanded' : ''}`}
          onClick={() => setExpandedSection(expandedSection === 'chats' ? null : 'chats')}
        >
          <span className="section-icon">💬</span>
          <div className="section-title">
            <h3>Chats</h3>
            <p>Theme, wallpaper, chat settings</p>
          </div>
          <span className="section-chevron">›</span>
        </button>
        {expandedSection === 'chats' && (
          <div className="section-content">
            <SettingButton 
              icon="🎨" 
              label="Theme" 
              description="Light • Dark • System"
            />
            <SettingButton 
              icon="🖼️" 
              label="Wallpaper" 
              description="Change chat background"
            />
            <SettingToggle 
              label="Chat Bubbles" 
              value={true}
              onChange={(val) => {}}
              description="Rounded message bubbles"
            />
            <SettingButton 
              icon="📏" 
              label="Font Size" 
              description="Adjust text size"
            />
          </div>
        )}
      </div>

      {/* Notifications Section */}
      <div className="settings-section">
        <button 
          className={`section-header ${expandedSection === 'notifications' ? 'expanded' : ''}`}
          onClick={() => setExpandedSection(expandedSection === 'notifications' ? null : 'notifications')}
        >
          <span className="section-icon">🔔</span>
          <div className="section-title">
            <h3>Notifications</h3>
            <p>Message notifications</p>
          </div>
          <span className="section-chevron">›</span>
        </button>
        {expandedSection === 'notifications' && (
          <div className="section-content">
            <SettingToggle 
              label="Notifications" 
              value={settings.notificationsEnabled}
              onChange={(val) => handleSettingChange('notificationsEnabled', val)}
              description="Enable message notifications"
            />
            <SettingToggle 
              label="Sound" 
              value={settings.soundEnabled}
              onChange={(val) => handleSettingChange('soundEnabled', val)}
              description="Play notification sound"
            />
            <SettingToggle 
              label="Message Preview" 
              value={settings.messagePreview}
              onChange={(val) => handleSettingChange('messagePreview', val)}
              description="Show message content in notifications"
            />
            <SettingButton 
              icon="🔊" 
              label="Notification Tone" 
              description="Select notification sound"
            />
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="settings-section">
        <button 
          className={`section-header ${expandedSection === 'help' ? 'expanded' : ''}`}
          onClick={() => setExpandedSection(expandedSection === 'help' ? null : 'help')}
        >
          <span className="section-icon">❓</span>
          <div className="section-title">
            <h3>Help</h3>
            <p>Help center, contact us, privacy policy</p>
          </div>
          <span className="section-chevron">›</span>
        </button>
        {expandedSection === 'help' && (
          <div className="section-content">
            <SettingButton 
              icon="📚" 
              label="Help Center" 
              description="Browse FAQs and guides"
            />
            <SettingButton 
              icon="💬" 
              label="Contact Us" 
              description="Send us a message"
            />
            <SettingButton 
              icon="📋" 
              label="Privacy Policy" 
              description="Read our privacy terms"
            />
            <SettingButton 
              icon="📜" 
              label="Terms of Service" 
              description="View terms and conditions"
            />
          </div>
        )}
      </div>

      {/* About Section */}
      <div className="settings-section">
        <button 
          className={`section-header ${expandedSection === 'about' ? 'expanded' : ''}`}
          onClick={() => setExpandedSection(expandedSection === 'about' ? null : 'about')}
        >
          <span className="section-icon">ℹ️</span>
          <div className="section-title">
            <h3>About</h3>
            <p>App information and version</p>
          </div>
          <span className="section-chevron">›</span>
        </button>
        {expandedSection === 'about' && (
          <div className="section-content">
            <div className="about-info">
              <div className="about-item">
                <span className="about-label">App Name</span>
                <span className="about-value">Lets Chat</span>
              </div>
              <div className="about-item">
                <span className="about-label">Version</span>
                <span className="about-value">1.0.0</span>
              </div>
              <div className="about-item">
                <span className="about-label">Built with</span>
                <span className="about-value">React + Supabase</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout Button Section */}
      <div className="logout-section">
        <button 
          className="logout-button"
          onClick={handleLogout}
        >
          🚪 Logout
        </button>
      </div>

      <div className="settings-footer">
        <p>© 2025 Lets Chat. All rights reserved.</p>
      </div>
    </div>
  )
}
