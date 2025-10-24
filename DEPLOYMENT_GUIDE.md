# ChatFlow - Deployment Guide

## 🚀 Quick Deployment Steps

### **Option 1: Deploy to Vercel (Recommended - Easiest)**

#### Step 1: Build the Project
```bash
npm run build
```
This creates a `dist/` folder with your production build.

#### Step 2: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - ChatFlow"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chatflow.git
git push -u origin main
```

#### Step 3: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select "React" as the framework
5. Add Environment Variables:
   - `VITE_SUPABASE_URL` = Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase Anon Key
6. Click "Deploy"

**Your site will be live at:** `your-project.vercel.app`

---

### **Option 2: Deploy to Netlify**

#### Step 1: Build the Project
```bash
npm run build
```

#### Step 2: Connect to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Add Environment Variables in Site Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy

**Your site will be live at:** `your-project.netlify.app`

---

### **Option 3: Deploy to AWS Amplify**

#### Step 1: Install Amplify CLI
```bash
npm install -g @aws-amplify/cli
amplify configure
```

#### Step 2: Initialize & Deploy
```bash
amplify init
amplify publish
```

---

### **Option 4: Deploy to Firebase Hosting**

#### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

#### Step 2: Initialize & Deploy
```bash
npm run build
firebase init hosting
firebase deploy
```

---

## 📋 Pre-Deployment Checklist

- [ ] All environment variables are set (Supabase URL & Key)
- [ ] `.env` file is in `.gitignore` (don't commit secrets)
- [ ] Run `npm run build` locally and verify no errors
- [ ] Test the build locally: `npm run preview`
- [ ] Check that all features work (chat, calls, profile, etc.)
- [ ] Verify responsive design on mobile
- [ ] Check console for any errors/warnings

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Enable RLS in Supabase** - All tables should have Row Level Security
4. **Set proper CORS** in Supabase settings
5. **Verify Supabase bucket is public** for avatars
6. **Use HTTPS only** - All hosting platforms provide this

---

## 📊 Environment Variables

Your app needs these variables to work:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from:
1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Settings → API → Project URL & Anon Key

---

## ✅ Verification After Deployment

1. Visit your live URL
2. Test signup/login
3. Send a message to verify chat works
4. Try voice call feature
5. Upload profile photo
6. Check call history
7. Verify timestamps are in IST

---

## 🆘 Troubleshooting

**White screen or 404 errors:**
- Check that build command was run
- Verify `dist/` folder exists
- Check publish directory is set to `dist`

**Environment variables not loading:**
- Verify variables are set in hosting platform settings
- They must start with `VITE_` to be exposed to browser
- Redeploy after adding variables

**Supabase connection errors:**
- Check URL and Anon Key are correct
- Verify network request in browser DevTools
- Check Supabase dashboard for errors

**CORS errors:**
- Go to Supabase Settings → API → CORS
- Add your domain (e.g., `https://your-app.vercel.app`)

---

## 🎉 Congratulations!

Your ChatFlow is now live! Share the link with your friends and start chatting! 🚀

