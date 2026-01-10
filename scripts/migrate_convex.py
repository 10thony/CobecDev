import os
import subprocess
import time
import threading
import json
import zipfile
from pathlib import Path
from dotenv import load_dotenv

# Load variables from .env.local
SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent
ENV_PATH = PROJECT_ROOT / '.env.local'
TEMP_DIR = PROJECT_ROOT / "convex_migration_temp"
ZIP_PATH = TEMP_DIR / "snapshot.zip"

load_dotenv(dotenv_path=ENV_PATH)

# Configuration

CLOUD_URL = os.getenv("VITE_CONVEX_URL")
LOCAL_URL = os.getenv("CONVEX_SELF_HOSTED_URL")
ADMIN_KEY = os.getenv("CONVEX_SELF_HOSTED_ADMIN_KEY")

def run_command(cmd, env_vars=None, capture=False):
    """Utility to run commands via Bun."""
    current_env = os.environ.copy()
    if env_vars:
        current_env.update(env_vars)

    process = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env=current_env,
        cwd=PROJECT_ROOT
    )
    
    output = []
    for line in process.stdout:
        if not capture:
            print(f"  {line}", end="")
        output.append(line)
    
    process.wait()
    return process.returncode, "".join(output)

def init_local_convex():
    """Runs convex dev --once to authenticate the local instance."""
    print("  [Auth] Initializing local Convex connection...")
    local_env = {
        "CONVEX_DEPLOY_KEY": ADMIN_KEY,
        "CONVEX_URL": LOCAL_URL
    }
    # --run allows it to execute once and exit
    cmd = f'bun x convex dev --once --url {LOCAL_URL}'
    run_command(cmd, env_vars=local_env, capture=True)
    print("  [Auth] Local instance authenticated.")

def inspect_export(zip_path):
    """Inspect the export file to see what tables and data are included."""
    print(f"\n--- Inspecting Export Contents ---")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Get all file names
            file_list = zip_ref.namelist()
            
            print(f"  Found {len(file_list)} files in export")
            
            # Convex exports typically have structure like:
            # - component/table.jsonl (for component tables)
            # - table.jsonl (for main app tables)
            # - metadata files
            
            # Find all JSONL files (table data files)
            jsonl_files = [f for f in file_list if f.endswith('.jsonl')]
            
            # Look for leads table specifically (case-insensitive)
            leads_files = [f for f in file_list if 'leads' in f.lower() and f.endswith('.jsonl')]
            
            if leads_files:
                print(f"  ✓ Found leads table file(s): {len(leads_files)}")
                total_docs = 0
                for f in leads_files:
                    print(f"    - {f}")
                    # Try to count lines in the file
                    try:
                        with zip_ref.open(f) as file:
                            lines = file.readlines()
                            # Count non-empty lines (each line is a JSON document)
                            doc_count = sum(1 for line in lines if line.strip())
                            total_docs += doc_count
                            print(f"      Documents: {doc_count}")
                            
                            # Show first document as sample (if any)
                            if doc_count > 0:
                                file.seek(0)
                                first_line = file.readline().decode('utf-8')
                                try:
                                    sample = json.loads(first_line)
                                    print(f"      Sample ID: {sample.get('_id', 'N/A')}")
                                except:
                                    pass
                    except Exception as e:
                        print(f"      Could not read file: {e}")
                
                if total_docs == 0:
                    print(f"  ⚠ WARNING: Leads file exists but contains 0 documents!")
            else:
                print(f"  ⚠ WARNING: No leads table file found in export!")
            
            # List all table files with document counts
            print(f"\n  All tables in export:")
            table_info = {}
            for f in jsonl_files:
                # Extract table name from path
                parts = f.split('/')
                if len(parts) > 1:
                    table_name = parts[-1].replace('.jsonl', '')
                    component = parts[0]
                    full_name = f"{component}/{table_name}"
                else:
                    table_name = f.replace('.jsonl', '')
                    full_name = table_name
                    component = "main"
                
                # Count documents
                try:
                    with zip_ref.open(f) as file:
                        doc_count = sum(1 for line in file if line.strip())
                    table_info[full_name] = {
                        'component': component,
                        'name': table_name,
                        'count': doc_count,
                        'file': f
                    }
                except:
                    table_info[full_name] = {
                        'component': component,
                        'name': table_name,
                        'count': 'unknown',
                        'file': f
                    }
            
            # Sort by component, then by name
            sorted_tables = sorted(table_info.items(), key=lambda x: (x[1]['component'], x[1]['name']))
            for full_name, info in sorted_tables:
                count_str = str(info['count'])
                marker = "⚠" if info['count'] == 0 else "✓"
                print(f"    {marker} {full_name}: {count_str} documents")
            
            return leads_files, set(table_info.keys())
    except Exception as e:
        print(f"  ❌ Error inspecting export: {e}")
        import traceback
        traceback.print_exc()
        return [], set()

def migrate():
    if not all([CLOUD_URL, LOCAL_URL, ADMIN_KEY]):
        print(f"❌ Error: Missing env vars.")
        return

    if not TEMP_DIR.exists():
        TEMP_DIR.mkdir(parents=True, exist_ok=True)

    print(f"🚀 Starting migration...")

    # Start Phase 2 Auth in a background thread while Phase 1 Downloads
    auth_thread = threading.Thread(target=init_local_convex)
    auth_thread.start()

    # --- Phase 1: Export ---
    print(f"\n--- Phase 1: Exporting Cloud Snapshot ---")
    print(f"  Exporting from: {CLOUD_URL}")
    export_cmd = f'bun x convex export --url {CLOUD_URL} --path "{ZIP_PATH}"'
    exit_code, output = run_command(export_cmd)
    
    if exit_code != 0:
        print("❌ Export failed.")
        print(f"  Output: {output}")
        return
    
    if not ZIP_PATH.exists():
        print(f"❌ Export file not found at {ZIP_PATH}")
        return
    
    # Inspect the export to verify contents
    leads_files, table_names = inspect_export(ZIP_PATH)
    
    if not leads_files:
        print(f"\n⚠ WARNING: No leads table data found in export!")
        print(f"  This could mean:")
        print(f"    1. The leads table is empty in the cloud deployment")
        print(f"    2. The leads table is in a different component not included in export")
        print(f"    3. There's an issue with the export process")
        print(f"\n  Available tables: {', '.join(sorted(table_names))}")
        
        response = input("\n  Continue with import anyway? (y/n): ").strip().lower()
        if response != 'y':
            print("  Migration cancelled by user.")
            return

    # Wait for the background auth to finish if it hasn't already
    auth_thread.join()

    # --- Phase 2: Import ---
    print(f"\n--- Phase 2: Importing to Local Instance ---")
    local_env = {
        "CONVEX_DEPLOY_KEY": ADMIN_KEY,
        "CONVEX_SELF_HOSTED_URL": LOCAL_URL, # Some CLI versions prefer this
        "CONVEX_URL": LOCAL_URL
    }
    
    # We add --admin-key explicitly to the command to bypass cloud checks
    import_cmd = f'bun x convex import "{ZIP_PATH}" --url {LOCAL_URL} --replace --admin-key "{ADMIN_KEY}"'
    
    exit_code, _ = run_command(import_cmd, env_vars=local_env)
    
    if exit_code != 0:
        print("❌ Import failed.")
    else:
        print("\n✅ Migration completed successfully!")

    # Cleanup (optional - keep for debugging)
    cleanup = input("\n  Delete export file? (y/n, default=n): ").strip().lower()
    if cleanup == 'y':
        if ZIP_PATH.exists():
            os.remove(ZIP_PATH)
            print(f"  ✓ Deleted {ZIP_PATH}")
        if TEMP_DIR.exists() and not any(TEMP_DIR.iterdir()):
            os.rmdir(TEMP_DIR)
            print(f"  ✓ Deleted {TEMP_DIR}")
    else:
        print(f"  Export file kept at: {ZIP_PATH}")
        print(f"  You can inspect it manually or delete it later.")

if __name__ == "__main__":
    migrate()