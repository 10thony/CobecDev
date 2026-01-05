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
    env_local_path = Path(".env.local")
    if env_local_path.exists() and DOTENV_AVAILABLE:
        load_dotenv(env_local_path)
    
    env_path = Path(".env")
    if env_path.exists() and DOTENV_AVAILABLE:
        load_dotenv(env_path)
    
    convex_url = os.getenv("VITE_CONVEX_URL") or os.getenv("CONVEX_URL")
    
    return convex_url

def get_links_from_convex():
    """
    Fetches approved procurement links from Convex database.
    Returns a list of link objects with procurementLink, state, and other fields.
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
    
    print("📥 Fetching approved procurement links from Convex...", file=sys.stderr)
    links = client.query("procurementUrls:getApproved", {})
    
    print(f"✅ Found {len(links)} approved procurement link(s)", file=sys.stderr)
    return links

# ------------------------------------------------------------------
# JAVASCRIPT INJECTION HELPER
# ------------------------------------------------------------------
SELECTOR_JS = """
() => {
    const sendToPython = window.returnHTML; 

    let lastElement = null;
    let isActive = true;
    
    // 1. Add Highlighting Styles + Notification Banner
    const style = document.createElement('style');
    style.innerHTML = `
        .playwright-highlight {
            outline: 3px solid red !important;
            cursor: crosshair !important;
            background-color: rgba(255, 0, 0, 0.1) !important;
        }
        .playwright-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 2147483647;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .playwright-banner kbd {
            background: rgba(255,255,255,0.2);
            padding: 3px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-weight: bold;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .playwright-banner .status {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .playwright-banner .dot {
            width: 10px;
            height: 10px;
            background: #4ade80;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(style);

    // 2. Create notification banner
    const banner = document.createElement('div');
    banner.className = 'playwright-banner';
    banner.innerHTML = `
        <div class="status">
            <span class="dot"></span>
            <span>Element Selector Active — Hover over the table you want to capture</span>
        </div>
        <div>Press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>S</kbd> to capture highlighted element</div>
    `;
    document.body.prepend(banner);

    // 3. Mouse Over handler (Highlighting)
    const mouseOverHandler = (event) => {
        if (!isActive) return;
        if (event.target === banner || banner.contains(event.target)) return;
        
        if (lastElement) lastElement.classList.remove('playwright-highlight');
        event.target.classList.add('playwright-highlight');
        lastElement = event.target;
    };

    // 4. Keydown handler for Ctrl+Alt+S
    const keydownHandler = (event) => {
        if (!isActive) return;
        
        // Check for Ctrl+Alt+S (case-insensitive)
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            event.stopPropagation();
            
            if (!lastElement) {
                // Flash the banner to indicate no element selected
                banner.style.background = 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';
                banner.querySelector('.status span:last-child').textContent = 
                    '⚠️ No element highlighted! Hover over an element first.';
                setTimeout(() => {
                    banner.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    banner.querySelector('.status span:last-child').textContent = 
                        'Element Selector Active — Hover over the table you want to capture';
                }, 2000);
                return;
            }
            
            // Deactivate and cleanup
            isActive = false;
            document.removeEventListener('mouseover', mouseOverHandler);
            document.removeEventListener('keydown', keydownHandler, true);
            
            // Update banner to show success
            banner.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
            banner.innerHTML = '<div class="status"><span>✅ Element captured! Processing...</span></div>';
            
            // Get the highlighted element
            const target = lastElement;
            target.classList.remove('playwright-highlight');

            // Look for the closest table parent if the user highlighted a cell
            const tableObj = target.closest('table') || target;
            
            // Remove banner after a short delay
            setTimeout(() => banner.remove(), 1500);
            
            // Send data back to Python
            sendToPython(tableObj.outerHTML);
        }
    };

    document.addEventListener('mouseover', mouseOverHandler);
    document.addEventListener('keydown', keydownHandler, { capture: true });
    
    // Log instructions to console as well
    console.log('%c🎯 Element Selector Active', 'font-size: 16px; font-weight: bold; color: #667eea;');
    console.log('%cHover over the element you want to capture, then press Ctrl+Alt+S', 'font-size: 12px; color: #666;');
    console.log('%cYou can complete CAPTCHAs or other verifications first — clicking won\\'t trigger capture.', 'font-size: 12px; color: #666;');
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

    # Define the callback that JS will call when user presses hotkey
    def on_selection(html_content):
        if not future.done():
            future.set_result(html_content)

    # Expose the python function to the browser window
    await page.expose_function("returnHTML", on_selection)

    print("━" * 60)
    print("👉 ACTION REQUIRED:")
    print("   1. Complete any CAPTCHAs or human verification if needed")
    print("   2. Hover over the data table you want to capture")
    print("   3. Press Ctrl+Alt+S to capture the highlighted element")
    print("━" * 60)
    
    # Inject the selection logic
    await page.evaluate(SELECTOR_JS)

    try:
        # Wait for the user to trigger capture (no timeout, user might need time)
        html_data = await future
        print("✅ Element captured!")
        
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
        dfs = pd.read_html(StringIO(html_content))
        
        if not dfs:
            print("⚠️  No standard HTML tables found in selection.")
            return

        main_df = dfs[0]
        main_df = main_df.dropna(how='all').dropna(axis=1, how='all')
        
        print("\n--- EXTRACTED DATA SAMPLE (First 5 Rows) ---")
        print(main_df.head().to_markdown(index=False))
        print(f"\nTotal Rows Found: {len(main_df)}")

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
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        
        for link in links:
            await process_link(context, link)
            
            cont = input("\n[Enter] to go to next site, [q] to quit: ")
            if cont.lower() == 'q':
                break
        
        await browser.close()
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code if exit_code else 0)