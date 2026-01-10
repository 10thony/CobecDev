"""
Helper script to verify leads data exists in Convex Cloud before migration.
This helps diagnose why leads data might not be included in exports.
"""
import os
import subprocess
import json
from pathlib import Path
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent
ENV_PATH = PROJECT_ROOT / '.env.local'

load_dotenv(dotenv_path=ENV_PATH)

CLOUD_URL = os.getenv("VITE_CONVEX_URL")

def run_convex_function(function_name, args=None):
    """Run a Convex function and return the result."""
    cmd_parts = ['bun', 'x', 'convex', 'run', function_name]
    if args:
        cmd_parts.append(json.dumps(args))
    cmd = ' '.join(cmd_parts)
    
    env = os.environ.copy()
    env['CONVEX_URL'] = CLOUD_URL
    
    process = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
        cwd=PROJECT_ROOT
    )
    
    stdout, stderr = process.communicate()
    
    if process.returncode != 0:
        print(f"Error running {function_name}: {stderr}")
        return None
    
    try:
        return json.loads(stdout.strip())
    except:
        return stdout.strip()

def main():
    if not CLOUD_URL:
        print("❌ Error: VITE_CONVEX_URL not set in .env.local")
        return
    
    print(f"🔍 Verifying leads data in Cloud: {CLOUD_URL}\n")
    
    # Try to get leads stats
    print("Attempting to query leads stats...")
    stats = run_convex_function('leads:getLeadsStats', {})
    
    if stats:
        print(f"\n✅ Leads data found in cloud:")
        print(f"   Total leads: {stats.get('total', 'unknown')}")
        print(f"   Active leads: {stats.get('active', 'unknown')}")
        print(f"   Inactive leads: {stats.get('inactive', 'unknown')}")
    else:
        print("\n⚠ Could not retrieve leads stats.")
        print("   This might mean:")
        print("   1. The function doesn't exist or isn't deployed")
        print("   2. There's an authentication issue")
        print("   3. The leads table is empty")
    
    # Try a simple query to count leads
    print("\nAttempting direct query to count leads...")
    # Note: This would require a query function, but we can't easily call queries from CLI
    # The export should include all data regardless
    
    print("\n💡 Next steps:")
    print("   1. Check the Convex dashboard to verify leads data exists")
    print("   2. Run the migration script - it will now inspect the export")
    print("   3. If leads are missing from export, check component configuration")

if __name__ == "__main__":
    main()
