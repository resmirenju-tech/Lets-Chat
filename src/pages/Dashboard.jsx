import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import './Dashboard.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchTasks()
    }
  }, [user])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      // This is a placeholder - you'll create the tasks table in Supabase
      // const { data, error } = await supabase
      //   .from('tasks')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('created_at', { ascending: false })

      // if (error) throw error
      // setTasks(data || [])
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Quick Stats</h2>
          <div className="stat-item">
            <span className="label">Total Tasks</span>
            <span className="value">{tasks.length}</span>
          </div>
        </div>

        <div className="card">
          <h2>Recent Activity</h2>
          <p style={{ color: '#999' }}>No activity yet</p>
        </div>
      </div>

      <div className="card">
        <h2>Tasks</h2>
        {tasks.length === 0 ? (
          <p style={{ color: '#999' }}>No tasks yet. Create one to get started!</p>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <div key={task.id} className="task-item">
                <h3>{task.title}</h3>
                <p>{task.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
