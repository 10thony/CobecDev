# Leads Table Migration Issue - Diagnosis & Solutions

## Problem
When running `migrate_convex.py`, the `leads` table shows `0 | 0 of 0` in the import summary, meaning no data was exported/imported, even though data exists in the Convex Cloud dashboard.

## Root Causes

### 1. **Empty Table in Cloud** (Most Likely)
The `convex export` command may not include tables that are empty or have been recently created. However, if you can see data in the dashboard, this is less likely.

**Solution:**
- Verify data exists in Cloud dashboard: https://dashboard.convex.dev
- Check if the data is actually in the `leads` table or another table
- Ensure the table has been properly saved/committed

### 2. **Component Configuration Issue**
Convex uses components to organize code and data. If the `leads` table is in a different component than expected, it might not be included in the default export.

**Solution:**
- Check if `leads` table is in a component (like "agent" component)
- Verify component configuration in `convex.json` or deployment settings
- Export may need component-specific flags

### 3. **Export Command Limitations**
The `convex export` command might have limitations or bugs that prevent certain tables from being exported.

**Solution:**
- Try exporting from the Convex dashboard manually
- Use the dashboard snapshot export feature
- Check Convex CLI version: `bun x convex --version`
- Update Convex CLI if outdated

### 4. **Schema Mismatch**
If the local schema doesn't match the cloud schema, the import might skip the table.

**Solution:**
- Verify `convex/schema.ts` has the `leads` table defined
- Ensure schema is deployed to both cloud and local
- Check for schema validation errors

## Diagnostic Steps

### Step 1: Verify Data in Cloud
1. Go to https://dashboard.convex.dev
2. Navigate to your deployment
3. Go to Data → leads table
4. Verify records exist and count them

### Step 2: Run Enhanced Migration Script
The updated `migrate_convex.py` script now:
- Inspects the export file before importing
- Shows which tables are included
- Counts documents per table
- Warns if leads data is missing

```bash
python scripts/migrate_convex.py
```

### Step 3: Manual Export Inspection
If the script shows leads are missing, you can manually inspect the export:

```python
import zipfile
z = zipfile.ZipFile('convex_migration_temp/snapshot.zip')
# List all files
print(z.namelist())
# Check for leads
leads_files = [f for f in z.namelist() if 'leads' in f.lower()]
print(leads_files)
```

### Step 4: Alternative Export Methods

#### Option A: Dashboard Export
1. Go to Convex Dashboard → Settings → Snapshot Export
2. Create a new snapshot export
3. Download the snapshot
4. Use that file for import

#### Option B: Direct Query Export
Create a custom export function that queries all leads and exports them:

```typescript
// convex/exportLeads.ts
export const exportAllLeads = query({
  handler: async (ctx) => {
    return await ctx.db.query("leads").collect();
  },
});
```

Then use this to export leads separately.

## Solutions

### Solution 1: Re-export with Verification
1. Run the updated migration script
2. When it warns about missing leads, choose 'n' to cancel
3. Verify data in Cloud dashboard
4. Try exporting again

### Solution 2: Manual Data Transfer
If export continues to fail, manually transfer data:

1. Query all leads from cloud:
```typescript
// In Convex dashboard or via CLI
const allLeads = await ctx.db.query("leads").collect();
```

2. Use bulk import function to add to local:
```typescript
// convex/leads.ts - bulkCreateLeads mutation
await ctx.runMutation(api.leads.bulkCreateLeads, { leads: allLeads });
```

### Solution 3: Check Component Structure
If leads is in a component:

1. Check `convex.json` for component configuration
2. Verify the component is included in exports
3. May need to export components separately

### Solution 4: Schema Verification
Ensure schema is consistent:

1. Check `convex/schema.ts` has `leads` table
2. Verify schema is deployed: `bun x convex deploy`
3. Check for TypeScript/schema errors

## Prevention

1. **Always verify exports** before importing
2. **Keep export files** for debugging (script now asks before deleting)
3. **Document component structure** if using components
4. **Test with small datasets** first before full migration

## Next Steps

1. Run the updated `migrate_convex.py` script
2. Review the inspection output
3. If leads are missing, follow the diagnostic steps above
4. Consider using alternative export methods if needed

## Related Files
- `scripts/migrate_convex.py` - Enhanced migration script with inspection
- `scripts/verify_leads_in_cloud.py` - Helper to verify cloud data
- `convex/schema.ts` - Schema definition
- `convex/leads.ts` - Leads table functions
