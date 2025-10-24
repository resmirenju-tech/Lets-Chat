import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import './Auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Login successful!')
      navigate('/chat')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!fullName.trim()) {
        toast.error('Please enter your full name')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      // Update profile with full name
      if (data.user) {
        await supabase
          .from('user_profiles')
          .update({ full_name: fullName })
          .eq('id', data.user.id)
      }

      toast.success('Sign up successful! You can now log in.')
      // Clear form
      setEmail('')
      setPassword('')
      setFullName('')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {/* Hero Section (Right) */}
      <div className="auth-hero">
        <div className="hero-icon">💬</div>
        <h2 className="hero-title">Lets Chat</h2>
        <p className="hero-subtitle">Real-time messaging, calls, and team collaboration all in one place</p>

        {/* Features Grid */}
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">💬</div>
            <p className="feature-name">Instant Messaging</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">☎️</div>
            <p className="feature-name">Voice & Video</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎥</div>
            <p className="feature-name">Screen Share</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <p className="feature-name">End-to-End Safe</p>
          </div>
        </div>
      </div>

      {/* Form Section (Left) */}
      <div className="auth-form-section">
        <div className="auth-card">
          <h1>Lets Chat</h1>
          <p className="subtitle">Connect with your team instantly</p>

          <form>
            {isSignUp && (
              <div className="form-group">
                <label>Full Name</label>
                <div className="form-input-wrapper">
                  <span className="form-input-icon">👤</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon">🔐</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {isSignUp ? (
              <>
                <button
                  type="submit"
                  className="btn-primary"
                  onClick={handleSignUp}
                  disabled={loading}
                >
                  {loading ? '⏳ Creating account...' : '+ Create Account'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIsSignUp(false)
                    setFullName('')
                  }}
                  disabled={loading}
                >
                  ← Back to Login
                </button>
              </>
            ) : (
              <>
                <button
                  type="submit"
                  className="btn-primary"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? '⏳ Logging in...' : '✓ Login'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsSignUp(true)}
                  disabled={loading}
                >
                  + Create Account
                </button>
              </>
            )}
          </form>

          <p className="demo-note">
            🎯 Demo: Use any email and password to create or log in to an account
          </p>
        </div>
      </div>
    </div>
  )
}
