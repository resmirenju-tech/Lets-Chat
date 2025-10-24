# ChatFlow - Complete Setup Guide

## Project Structure

```
chatflow/
├── src/
│   ├── components/
│   │   └── Navbar.jsx          # Navigation component with logout
│   ├── pages/
│   │   ├── Login.jsx           # Login/Sign Up page
│   │   ├── Dashboard.jsx       # Main dashboard
│   │   ├── Auth.css            # Authentication styles
│   │   └── Dashboard.css       # Dashboard styles
│   ├── lib/
│   │   └── supabase.js         # Supabase client initialization
│   ├── App.jsx                 # Main app with routing
│   ├── App.css                 # Main styles
│   ├── index.css               # Global styles
│   └── main.jsx                # React entry point
├── .env                        # Environment variables (YOUR CREDENTIALS HERE)
├── vite.config.js              # Vite configuration with path aliases
└── package.json                # Project dependencies
```

## What's Included

✅ **Authentication**
- Email/password login and sign-up with Supabase Auth
- Protected routes (auto-redirect to login if not authenticated)
- Session persistence

✅ **Core Features**
- Dashboard with user info and task overview
- Navbar with user email and logout button
- Beautiful, responsive UI with modern design

✅ **Configuration**
- Supabase integration ready
- Path aliases (@/ for cleaner imports)
- Toast notifications for user feedback
- Error handling throughout

## Next Steps

### Step 1: Enable Email Auth in Supabase
1. Go to **Supabase Dashboard**
2. Select your project
3. Go to **Authentication → Providers**
4. Make sure **Email** is enabled
5. Click **Enable** if it's not already

### Step 2: Start Development
```bash
npm run dev
```
The app will run at `http://localhost:5173`

### Step 3: Test the App
1. Click **Sign Up** and create an account
2. Use any email and password
3. Login with your credentials
4. You'll see the Dashboard with your email

### Step 4: Build Database Schema (Next Task)

You'll need to create these Supabase tables:

**tasks** table:
```sql
- id (bigint, Primary Key, Auto-increment)
- user_id (uuid, Foreign Key → auth.users)
- title (text)
- description (text)
- status (text: 'pending', 'in_progress', 'completed')
- created_at (timestamp)
- updated_at (timestamp)
```

**worklogs** table (for time tracking):
```sql
- id (bigint, Primary Key)
- task_id (bigint, Foreign Key → tasks)
- user_id (uuid, Foreign Key → auth.users)
- hours (integer)
- minutes (integer)
- description (text)
- created_at (timestamp)
```

**comments** table:
```sql
- id (bigint, Primary Key)
- task_id (bigint, Foreign Key → tasks)
- user_id (uuid, Foreign Key → auth.users)
- content (text)
- created_at (timestamp)
```

### Step 5: Add Row Level Security (RLS)

Add RLS policies so users can only see their own data:

```sql
-- For tasks table
CREATE POLICY "Users can only see their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

-- For worklogs table
CREATE POLICY "Users can only see their own worklogs" ON worklogs
  FOR SELECT USING (auth.uid() = user_id);

-- Similar for comments...
```

## Key Files Explained

### `src/App.jsx`
- Main component with routing
- Checks user authentication on load
- Redirects to /login or /dashboard based on user state

### `src/lib/supabase.js`
- Creates Supabase client using credentials from .env
- Exported so you can use `import { supabase } from '@/lib/supabase'` anywhere

### `src/pages/Login.jsx`
- Authentication form with login and sign-up
- Uses Supabase Auth API
- Toast notifications for feedback

### `src/pages/Dashboard.jsx`
- Main dashboard showing user info
- Placeholder for tasks display
- Ready to fetch from database

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Check code quality
```

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists in project root
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly
- Restart dev server after creating .env

### App shows blank page
- Check browser console for errors
- Make sure Supabase credentials are correct
- Try clearing browser cache and refresh

### Authentication not working
- Verify Email Auth is enabled in Supabase
- Check that the user was created (go to Auth → Users in Supabase)
- Make sure you're using the correct email/password

## Features to Build Next (From Your Memory)

Based on your previous work, consider building:

1. **Task Management**
   - Create/edit/delete tasks
   - Assign tasks to team members
   - Task status tracking

2. **Time Tracking (Worklog)**
   - Log hours and minutes spent on tasks
   - Visual progress bar (blue=on-time, red=overtime)
   - Original estimate vs. actual time

3. **Comments with @Mentions**
   - Add comments to tasks
   - @mention feature that shows team members
   - Real-time filtering

4. **Real-time Features** (using Socket.io)
   - Live updates for task changes
   - Chat/messaging between team members
   - Notifications

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Router Docs](https://reactrouter.com)
- [React Query Docs](https://tanstack.com/query/latest)
- [Vite Docs](https://vite.dev)

Good luck! 🚀
