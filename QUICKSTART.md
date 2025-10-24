# ⚡ ChatFlow - Quick Start

## 1️⃣ Project Setup (Already Done ✅)

```bash
npm install
```

Your `.env` file is created with Supabase credentials.

## 2️⃣ Start Development

```bash
npm run dev
```

App runs at: **http://localhost:5173**

## 3️⃣ Test the App

### Sign Up
1. Go to http://localhost:5173
2. Click **Sign Up**
3. Enter any email and password
4. Click **Sign Up** button
5. See success message

### Login
1. Use the same email and password
2. Click **Login** button
3. See Dashboard page
4. Your email shows in welcome message

### Logout
1. Click **Logout** button in top-right
2. Redirects back to login page

## 📁 Project Structure

```
chatflow/
├── src/
│   ├── components/    ← React components
│   │   └── Navbar.jsx
│   ├── pages/         ← Page components
│   │   ├── Login.jsx
│   │   └── Dashboard.jsx
│   ├── lib/           ← Utilities & configs
│   │   └── supabase.js
│   ├── App.jsx        ← Main app & routing
│   └── *.css          ← Styling files
├── .env               ← Your Supabase credentials
├── vite.config.js     ← Vite config
└── package.json       ← Dependencies
```

## 💾 Using Supabase in Code

### Import
```javascript
import { supabase } from '@/lib/supabase'
```

### Fetch Data
```javascript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId)
```

### Insert Data
```javascript
const { data, error } = await supabase
  .from('table_name')
  .insert({ field: 'value', user_id: userId })
```

### Update Data
```javascript
const { data, error } = await supabase
  .from('table_name')
  .update({ field: 'new_value' })
  .eq('id', record_id)
```

### Delete Data
```javascript
const { data, error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', record_id)
```

## 🎨 Styling

Global styles: `src/App.css`

Component styles: Scoped files like `src/pages/Dashboard.css`

### Available CSS Classes
- `.btn-primary` - Blue button
- `.btn-secondary` - Gray button
- `.card` - White card with shadow
- `.container` - Max-width container
- `.grid` - Grid layout
- `.form-group` - Form input wrapper

## 🔐 Authentication Status

Check if user is logged in:
```javascript
const { data: { user } } = await supabase.auth.getUser()
if (user) {
  // User is logged in
}
```

Get current session:
```javascript
const { data: { session } } = await supabase.auth.getSession()
```

Listen for auth changes:
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
})
```

## 📝 File Guide

| File | Purpose |
|------|---------|
| `App.jsx` | Main app, routing, auth logic |
| `Login.jsx` | Sign up/login forms |
| `Dashboard.jsx` | Main page after login |
| `Navbar.jsx` | Top navigation bar |
| `supabase.js` | Supabase client init |
| `App.css` | Main styles |
| `Auth.css` | Login page styles |
| `Dashboard.css` | Dashboard styles |

## 🐛 Debugging

### Check Console
Open browser DevTools: **F12 → Console tab**
- Shows errors
- Shows network requests to Supabase
- Check for JavaScript errors

### Check Supabase
1. Go to supabase.com
2. Open your project
3. Check **Auth → Users** for created accounts
4. Check tables to verify data

### Common Issues

❌ **"Missing Supabase environment variables"**
- Check `.env` file exists and has credentials
- Restart dev server: Ctrl+C, then `npm run dev`

❌ **Can't login**
- Verify user exists in Supabase Auth → Users
- Check email/password are correct
- Check console for error messages

❌ **Styles not loading**
- Check CSS file is in correct folder
- Restart dev server
- Hard refresh browser: Ctrl+Shift+R

## 🚀 Next Steps

1. **Enable Email Auth** in Supabase settings
2. **Create database tables** (see SETUP_GUIDE.md)
3. **Add task management** - Create/edit/delete
4. **Add time tracking** - Worklog features
5. **Add comments** - With @mentions

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [React Router Docs](https://reactrouter.com)
- [Vite Docs](https://vite.dev)

## ✅ Checklist

- [ ] `.env` file has credentials
- [ ] `npm run dev` works
- [ ] Can sign up at login page
- [ ] Can login with credentials
- [ ] Dashboard shows after login
- [ ] Logout button works
- [ ] Ready to add features!

---

Happy coding! 🎉

