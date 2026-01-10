# Netlify Cost Protection - Quick Reference

## 🚨 Emergency Actions

### If Costs Are Spiking RIGHT NOW:

1. **Stop Auto-Publishing** (30 seconds)
   - Netlify Dashboard → Site Settings → General
   - Click "Stop auto publishing"
   - ✅ Stops new builds and serving

2. **Check Current Usage** (1 minute)
   - Netlify Dashboard → Site Settings → Usage
   - Look at "Bandwidth" and "Build minutes"
   - If >80% of limit: Take action

3. **Enable Maintenance Mode** (2 minutes)
   - Create `public/maintenance.html` with simple message
   - Update `netlify.toml` redirect to point to it
   - Deploy

## 📊 Quick Status Check

### Before Demo Day (5 minutes)
```
□ Check Netlify usage dashboard
□ Set up email alerts (80% threshold)
□ Verify site is working
□ Make final code changes
□ Don't push to main during demo
```

### During Demo Day (Every Hour)
```
□ Refresh usage dashboard
□ Check bandwidth: _____ GB used
□ Check builds: _____ builds today
□ If >80%: Consider emergency actions
```

## 💰 Cost Estimates

| Traffic Level | Bandwidth | Cost (Free) | Cost (Pro) |
|--------------|-----------|-------------|------------|
| Small (10-50 users) | 1-5 GB | $0 | $0 |
| Medium (50-200) | 5-20 GB | $0 | $0 |
| Large (200-1000) | 20-100 GB | $0 | $0 |
| Viral (1000+) | 100+ GB | $0-55 | $0-55 |

## 🎯 Key Numbers

- **Free Tier Limits**: 100 GB bandwidth, 300 build minutes
- **Pro Tier Limits**: 1 TB bandwidth, 1,000 build minutes
- **Typical Build Time**: 2-5 minutes
- **Typical Bandwidth per User**: ~10-50 MB (with caching)

## 🔍 Red Flags

Watch for:
- ⚠️ Bandwidth >50 GB in one day
- ⚠️ More than 5 builds in one day
- ⚠️ Failed builds (waste minutes)
- ⚠️ Site is slow (users reload = more bandwidth)

## ✅ Protection Already Active

- ✅ Aggressive caching (1 year for static assets)
- ✅ Large files served from CDN
- ✅ Build protection (only on main branch)
- ✅ Security headers configured

## 📞 Support

- Netlify Support: support@netlify.com
- Dashboard: https://app.netlify.com
- Full Guide: See `NETLIFY_COST_PROTECTION.md`

---

**Remember**: Your app uses Convex for backend, not Netlify Functions. Most costs will be bandwidth, not compute.



