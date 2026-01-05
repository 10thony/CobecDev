import asyncio
import json
import os
import sys
import pandas as pd
from pathlib import Path
from playwright.async_api import async_playwright
from io import StringIO

# ------------------------------------------------------------------
# CONFIGURATION
# ------------------------------------------------------------------

try:
    from convex import ConvexClient
    CONVEX_AVAILABLE = True
except ImportError:
    CONVEX_AVAILABLE = False
    print("Error: convex package not installed.")
    print("Install with: pip install convex python-dotenv")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False
    print("Warning: python-dotenv not installed. Install with: pip install python-dotenv")

# Global Convex client (initialized in main)
client = None

def load_convex_url():
    """Load CONVEX_URL from environment files or environment variables."""
    # Try loading from .env.local first (highest priority)
    env_local_path = Path(".env.local")
    if env_local_path.exists() and DOTENV_AVAILABLE:
        load_dotenv(env_local_path)
    
    # Then try .env
    env_path = Path(".env")
    if env_path.exists() and DOTENV_AVAILABLE:
        load_dotenv(env_path)
    
    # Check environment variables (VITE_CONVEX_URL takes precedence, then CONVEX_URL)
    convex_url = os.getenv("VITE_CONVEX_URL") or os.getenv("CONVEX_URL")
    
    return convex_url

def get_links_from_convex():
    """
    Fetches approved procurement links from Convex database.
    Returns a list of link objects with procurementLink, state, and other fields.
    Note: This is a synchronous function because Convex client queries are synchronous.
    """
    global client
    
    if not client:
        convex_url = load_convex_url()
        if not convex_url:
            print("❌ Error: CONVEX_URL not found.", file=sys.stderr)
            print("\n📁 Checked for environment files:", file=sys.stderr)
            print(f"   {'✓' if Path('.env.local').exists() else '✗'} .env.local", file=sys.stderr)
            print(f"   {'✓' if Path('.env').exists() else '✗'} .env", file=sys.stderr)
            print("\n💡 Solutions:", file=sys.stderr)
            print("   1. Create a .env.local file in the project root with:", file=sys.stderr)
            print("      VITE_CONVEX_URL=https://your-deployment.convex.cloud", file=sys.stderr)
            print("   2. Or set it as an environment variable:", file=sys.stderr)
            print("      export VITE_CONVEX_URL='https://your-deployment.convex.cloud'", file=sys.stderr)
            raise ValueError("CONVEX_URL not configured")
        
        print(f"🔗 Connecting to Convex at: {convex_url}", file=sys.stderr)
        client = ConvexClient(convex_url)
    
    # Query the getApproved function from procurementUrls module
    print("📥 Fetching approved procurement links from Convex...", file=sys.stderr)
    links = client.query("procurementUrls:getApproved", {})
    
    print(f"✅ Found {len(links)} approved procurement link(s)", file=sys.stderr)
    return links

# ------------------------------------------------------------------
# JAVASCRIPT INJECTION HELPER
# ------------------------------------------------------------------
# This JS runs inside the browser to handle the highlighting and clicking.
# FIX: Removed argument 'callback' and using 'window.returnHTML' directly.
SELECTOR_JS = """
() => {
    // We grab the python function we exposed earlier
    const sendToPython = window.returnHTML; 

    let lastElement = null;
    
    // 1. Add Highlighting Styles
    const style = document.createElement('style');
    style.innerHTML = `
        .playwright-highlight {
            outline: 3px solid red !important;
            cursor: crosshair !important;
            background-color: rgba(255, 0, 0, 0.1) !important;
        }
    `;
    document.head.appendChild(style);

    // 2. Mouse Over handler (Highlighting)
    const mouseOverHandler = (event) => {
        if (lastElement) lastElement.classList.remove('playwright-highlight');
        event.target.classList.add('playwright-highlight');
        lastElement = event.target;
    };

    // 3. Click handler (Selection)
    const clickHandler = (event) => {
        event.preventDefault(); // Stop the link/button from actually working
        event.stopPropagation();
        
        const target = event.target;
        
        // Remove listeners/styles so we don't mess up the scrape
        document.removeEventListener('mouseover', mouseOverHandler);
        document.removeEventListener('click', clickHandler, true);
        if (lastElement) lastElement.classList.remove('playwright-highlight');

        // Return the outerHTML of the element the user clicked
        // We look for the closest table parent if the user clicked a cell
        const tableObj = target.closest('table') || target;
        
        // Send data back to Python
        sendToPython(tableObj.outerHTML);
    };

    document.addEventListener('mouseover', mouseOverHandler);
    document.addEventListener('click', clickHandler, { capture: true });
}
"""

async def process_link(context, link_obj):
    url = link_obj.get('procurementLink')
    if not url:
        return

    print(f"\n🔵 Opening: {url}")
    
    page = await context.new_page()
    
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    except Exception as e:
        print(f"⚠️  Could not load {url}: {e}")
        await page.close()
        return

    # Create a Future object to pause Python until JS returns data
    loop = asyncio.get_running_loop()
    future = loop.create_future()

    # Define the callback that JS will call when user clicks
    def on_selection(html_content):
        if not future.done():
            future.set_result(html_content)

    # Expose the python function to the browser window
    await page.expose_function("returnHTML", on_selection)

    print("👉 ACTION REQUIRED: Hover over the data table in the browser and CLICK it.")
    
    # Inject the selection logic
    # FIX: No string replacement needed anymore
    await page.evaluate(SELECTOR_JS)

    try:
        # Wait for the user to click something (no timeout, user might be slow)
        html_data = await future
        print("✅ Element selected!")
        
        # Parse logic
        await parse_html_generic(html_data)

    except Exception as e:
        print(f"❌ Error during selection/parsing: {e}")
    finally:
        await page.close()

async def parse_html_generic(html_content):
    """
    Attempts to turn raw HTML into a DataFrame regardless of structure.
    """
    try:
        # Pandas is excellent at finding <table> tags within HTML chunks
        dfs = pd.read_html(StringIO(html_content))
        
        if not dfs:
            print("⚠️  No standard HTML tables found in selection.")
            return

        # Usually the first table found in the selection is the one we want
        main_df = dfs[0]
        
        # Basic cleanup: Drop empty rows/cols
        main_df = main_df.dropna(how='all').dropna(axis=1, how='all')
        
        print("\n--- EXTRACTED DATA SAMPLE (First 5 Rows) ---")
        print(main_df.head().to_markdown(index=False))
        print(f"\nTotal Rows Found: {len(main_df)}")
        
        # Here you would save to CSV or update Convex
        # main_df.to_csv("output.csv", mode='a', header=False)

    except ValueError:
        print("⚠️  Pandas could not parse a table from that selection.")
    except Exception as e:
        print(f"⚠️  Parsing error: {e}")

async def main():
    try:
        links = get_links_from_convex()
        print(f"Loaded {len(links)} links from DB.")
        
        if not links:
            print("⚠️  No approved procurement links found in database.")
            return
        
    except Exception as e:
        print(f"❌ Error fetching links from Convex: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

    async with async_playwright() as p:
        # Launch generic Chromium
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        
        for link in links:
            await process_link(context, link)
            
            # Simple CLI flow control
            cont = input("\n[Enter] to go to next site, [q] to quit: ")
            if cont.lower() == 'q':
                break
        
        await browser.close()
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code if exit_code else 0)