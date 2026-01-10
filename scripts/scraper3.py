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
    print("Warning: python-dotenv not installed.")

try:
    from playwright_stealth import stealth_async
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False
    print("Warning: playwright-stealth not installed.")
    print("Install with: pip install playwright-stealth")

# Global Convex client
client = None

# User data directory for persistent sessions
USER_DATA_DIR = Path("./chromium_user_data")

# Link-specific wait strategies
LINK_WAIT_STRATEGIES = {
    "opengov": "networkidle",
}


def get_wait_strategy(url):
    """Determine wait strategy based on URL pattern."""
    url_lower = url.lower()
    for pattern, strategy in LINK_WAIT_STRATEGIES.items():
        if pattern in url_lower:
            return strategy
    return None


def load_convex_url():
    """Load CONVEX_URL from environment files or environment variables."""
    env_local_path = Path(".env.local")
    if env_local_path.exists() and DOTENV_AVAILABLE:
        load_dotenv(env_local_path)

    env_path = Path(".env")
    if env_path.exists() and DOTENV_AVAILABLE:
        load_dotenv(env_path)

    convex_url = os.getenv("VITE_CONVEX_URL") or os.getenv("CONVEX_URL") or os.getenv("convex_url")
    return convex_url


def init_convex_client():
    """Initialize the Convex client."""
    global client

    if client:
        return client

    convex_url = load_convex_url()
    if not convex_url:
        print("❌ Error: CONVEX_URL not found.", file=sys.stderr)
        print("\n📁 Checked for environment files:", file=sys.stderr)
        print(
            f"   {'✓' if Path('.env.local').exists() else '✗'} .env.local",
            file=sys.stderr,
        )
        print(f"   {'✓' if Path('.env').exists() else '✗'} .env", file=sys.stderr)
        print("\n💡 Solutions:", file=sys.stderr)
        print(
            "   1. Create a .env.local file with:",
            file=sys.stderr,
        )
        print(
            "      VITE_CONVEX_URL=https://your-deployment.convex.cloud",
            file=sys.stderr,
        )
        print("   2. Or set as environment variable:", file=sys.stderr)
        print(
            "      export VITE_CONVEX_URL='https://your-deployment.convex.cloud'",
            file=sys.stderr,
        )
        raise ValueError("CONVEX_URL not configured")

    print(f"🔗 Connecting to Convex at: {convex_url}", file=sys.stderr)
    client = ConvexClient(convex_url)
    return client


def get_links_from_convex():
    """Fetches approved procurement links from Convex database."""
    init_convex_client()

    print("📥 Fetching approved procurement links...", file=sys.stderr)
    links = client.query("procurementUrls:getApproved", {})

    print(f"✅ Found {len(links)} approved link(s)", file=sys.stderr)
    return links


def save_procurement_data_to_convex(link_obj, parsed_data):
    """Save parsed procurement data to Convex."""
    init_convex_client()

    try:
        payload = {
            "procurementUrlId": link_obj.get("_id"),
            "state": link_obj.get("state", "Unknown"),
            "sourceUrl": link_obj.get("procurementLink", ""),
            "data": parsed_data,
            "rowCount": len(parsed_data),
        }

        print("📤 Uploading parsed data to Convex...", file=sys.stderr)
        result = client.mutation("procurementData:create", payload)
        print(f"✅ Data saved (ID: {result})", file=sys.stderr)
        return result

    except Exception as e:
        print(f"❌ Error saving to Convex: {e}", file=sys.stderr)
        return None


def display_link_menu(links, current_index=None):
    """Display menu of available procurement links."""
    print("\n" + "═" * 70)
    print("📋 AVAILABLE PROCUREMENT LINKS")
    print("═" * 70)

    for i, link in enumerate(links):
        url = link.get("procurementLink", "N/A")
        state = link.get("state", "Unknown")
        display_url = url[:50] + "..." if len(url) > 50 else url
        marker = "→ " if i == current_index else "  "
        print(f"{marker}[{i + 1}] {state}: {display_url}")

    print("═" * 70)


def get_user_selection(links, current_index):
    """Get user's selection for which link to process."""
    total = len(links)

    while True:
        print("\n📌 NAVIGATION OPTIONS:")
        print(f"   [1-{total}] Jump to specific link")
        print("   [n] Next link")
        print("   [p] Previous link")
        print("   [l] List all links")
        print("   [q] Quit")

        if current_index is not None:
            print(f"\n   Current position: {current_index + 1}/{total}")

        choice = input("\n➤ Enter your choice: ").strip().lower()

        if choice == "q":
            return "quit", None
        elif choice == "l":
            display_link_menu(links, current_index)
            continue
        elif choice == "n":
            if current_index is None:
                return "goto", 0
            elif current_index < total - 1:
                return "goto", current_index + 1
            else:
                print("⚠️  Already at the last link.")
                continue
        elif choice == "p":
            if current_index is None or current_index == 0:
                print("⚠️  Already at the first link.")
                continue
            else:
                return "goto", current_index - 1
        else:
            try:
                num = int(choice)
                if 1 <= num <= total:
                    return "goto", num - 1
                else:
                    print(f"⚠️  Please enter number between 1 and {total}.")
            except ValueError:
                print("⚠️  Invalid input. Please try again.")


def get_post_scrape_action(links, current_index):
    """Get user's action after scraping a link."""
    total = len(links)

    while True:
        print("\n" + "─" * 50)
        print("📌 WHAT WOULD YOU LIKE TO DO?")
        print("─" * 50)
        print(
            f"   [n] Next link ({current_index + 2}/{total})"
            if current_index < total - 1
            else "   [n] Next link (N/A - at last link)"
        )
        print(
            f"   [p] Previous link ({current_index}/{total})"
            if current_index > 0
            else "   [p] Previous link (N/A - at first link)"
        )
        print(f"   [j] Jump to specific link (1-{total})")
        print("   [r] Repeat current link")
        print("   [l] List all links")
        print("   [q] Quit")
        print(f"\n   Current: {current_index + 1}/{total}")

        choice = input("\n➤ Enter your choice: ").strip().lower()

        if choice == "q":
            return "quit", None
        elif choice == "l":
            display_link_menu(links, current_index)
            continue
        elif choice == "n":
            if current_index < total - 1:
                return "goto", current_index + 1
            else:
                print("⚠️  Already at the last link.")
                continue
        elif choice == "p":
            if current_index > 0:
                return "goto", current_index - 1
            else:
                print("⚠️  Already at the first link.")
                continue
        elif choice == "r":
            return "goto", current_index
        elif choice == "j":
            try:
                num = int(input(f"   Enter link number (1-{total}): ").strip())
                if 1 <= num <= total:
                    return "goto", num - 1
                else:
                    print(f"⚠️  Enter number between 1 and {total}.")
            except ValueError:
                print("⚠️  Invalid number.")
        else:
            try:
                num = int(choice)
                if 1 <= num <= total:
                    return "goto", num - 1
                else:
                    print(f"⚠️  Enter number between 1 and {total}.")
            except ValueError:
                print("⚠️  Invalid input. Please try again.")


# ------------------------------------------------------------------
# JAVASCRIPT INJECTION - CLICK TO CAPTURE
# ------------------------------------------------------------------
SELECTOR_JS = """
() => {
    if (window.__playwrightSelectorActive) {
        console.log('Selector already active');
        return;
    }
    window.__playwrightSelectorActive = true;

    const sendToPython = window.returnHTML;
    let lastElement = null;
    let isActive = true;

    const style = document.createElement('style');
    style.innerHTML = `
        .playwright-highlight {
            outline: 3px solid #3b82f6 !important;
            cursor: pointer !important;
            background-color: rgba(59, 130, 246, 0.1) !important;
        }
        .playwright-banner {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: white;
            padding: 12px 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 2147483647;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
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

    const banner = document.createElement('div');
    banner.className = 'playwright-banner';
    banner.innerHTML = `
        <div class="status">
            <span class="dot"></span>
            <span>🎯 Click on the table you want to capture</span>
        </div>
        <div>Hover to highlight • Click to capture</div>
    `;
    document.body.appendChild(banner);

    const mouseOverHandler = (event) => {
        if (!isActive) return;
        if (event.target === banner || banner.contains(event.target)) return;

        if (lastElement) lastElement.classList.remove('playwright-highlight');
        event.target.classList.add('playwright-highlight');
        lastElement = event.target;
    };

    const clickHandler = (event) => {
        if (!isActive) return;
        if (event.target === banner || banner.contains(event.target)) return;
        if (!lastElement) return;

        event.preventDefault();
        event.stopPropagation();

        isActive = false;
        window.__playwrightSelectorActive = false;
        document.removeEventListener('mouseover', mouseOverHandler);
        document.removeEventListener('click', clickHandler, true);

        banner.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
        banner.innerHTML = '<div class="status"><span>✅ Element captured! Processing...</span></div>';

        const target = lastElement;
        target.classList.remove('playwright-highlight');

        const tableObj = target.closest('table') || target;

        setTimeout(() => {
            banner.remove();
            style.remove();
        }, 1500);

        sendToPython(tableObj.outerHTML);
    };

    document.addEventListener('mouseover', mouseOverHandler);
    document.addEventListener('click', clickHandler, { capture: true });

    console.log('%c🎯 Element Selector Active', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
}
"""


async def apply_stealth(page):
    """Apply stealth patches if available."""
    if STEALTH_AVAILABLE:
        try:
            await stealth_async(page)
            print("   🥷 Stealth patches applied", file=sys.stderr)
        except Exception as e:
            print(f"   ⚠️  Stealth patch failed: {e}", file=sys.stderr)


async def check_for_verification(page):
    """Detect common verification systems."""
    checks = [
        (
            "Cloudflare",
            "div.cf-error-title, div#challenge-running, div.challenge-form",
        ),
        ("reCAPTCHA", "iframe[src*='recaptcha'], div.g-recaptcha"),
        ("hCaptcha", "iframe[src*='hcaptcha'], div.h-captcha"),
        ("DataDome", "div#datadome, script[src*='datadome']"),
    ]

    for name, selector in checks:
        if await page.locator(selector).count() > 0:
            print(f"   🛡️  {name} detected", file=sys.stderr)
            return name

    return None


async def diagnose_detection(page):
    """Check what's revealing automation."""
    try:
        results = await page.evaluate("""
            () => {
                return {
                    webdriver: navigator.webdriver,
                    permissions: navigator.permissions ? 'present' : 'missing',
                    languages: navigator.languages,
                    platform: navigator.platform,
                    hardwareConcurrency: navigator.hardwareConcurrency,
                    deviceMemory: navigator.deviceMemory,
                    plugins: navigator.plugins.length,
                };
            }
        """)

        print("\n🔍 DETECTION DIAGNOSTICS:", file=sys.stderr)
        for key, value in results.items():
            marker = "❌" if (key == "webdriver" and value) else "✅"
            print(f"   {marker} {key}: {value}", file=sys.stderr)

        return results
    except Exception as e:
        print(f"   ⚠️  Diagnostic error: {e}", file=sys.stderr)
        return None


def get_manual_html_input():
    """Prompt user to manually paste HTML content."""
    print("\n" + "─" * 60)
    print("📋 MANUAL HTML INPUT")
    print("─" * 60)
    print("   Instructions:")
    print("   1. Open DevTools (F12 or right-click → Inspect)")
    print("   2. Find the table element in Elements tab")
    print("   3. Right-click <table> → Copy → Copy outerHTML")
    print("   4. Paste HTML below (press Enter twice when done)")
    print("   5. Type 'skip' to skip this link")
    print("─" * 60)

    lines = []
    print("\n📝 Paste HTML here (Enter twice to finish, 'skip' to skip):\n")

    empty_line_count = 0
    while True:
        try:
            line = input()

            if line.strip().lower() == "skip" and not lines:
                return None

            if line == "":
                empty_line_count += 1
                if empty_line_count >= 2:
                    break
                lines.append(line)
            else:
                empty_line_count = 0
                lines.append(line)

        except EOFError:
            break
        except KeyboardInterrupt:
            print("\n⚠️  Input cancelled.")
            return None

    html_content = "\n".join(lines).strip()

    if not html_content:
        return None

    print(f"\n✅ Received {len(html_content)} characters of HTML")
    return html_content


def manual_html_fallback(source_url=None, max_retries=3):
    """Fallback for manual HTML pasting when parsing fails."""
    errors = []

    for attempt in range(1, max_retries + 1):
        print(f"\n{'═' * 60}")
        print(f"🔄 MANUAL INPUT ATTEMPT {attempt}/{max_retries}")
        print(f"{'═' * 60}")

        html_content = get_manual_html_input()

        if html_content is None:
            print("⏭️  Skipping manual input...")
            return None

        try:
            dfs = pd.read_html(StringIO(html_content))

            if not dfs:
                error_msg = "No HTML tables found in pasted content"
                errors.append(f"Attempt {attempt}: {error_msg}")
                print(f"⚠️  {error_msg}")

                if attempt < max_retries:
                    retry = input("\n   Try again? [y/n]: ").strip().lower()
                    if retry != "y":
                        break
                continue

            print(f"✅ Found {len(dfs)} table(s) in pasted HTML")

            main_df = dfs[0]
            main_df = main_df.dropna(how="all").dropna(axis=1, how="all")

            if main_df.empty:
                error_msg = "Table is empty after cleaning"
                errors.append(f"Attempt {attempt}: {error_msg}")
                print(f"⚠️  {error_msg}")

                if attempt < max_retries:
                    retry = input("\n   Try again? [y/n]: ").strip().lower()
                    if retry != "y":
                        break
                continue

            main_df = main_df.fillna("")
            for col in main_df.columns:
                main_df[col] = main_df[col].astype(str)

            records = main_df.to_dict(orient="records")
            print(f"✅ Parsed {len(records)} rows from manual input")

            # Show preview
            print("\n--- DATA PREVIEW ---")
            preview_df = pd.DataFrame(records[:5])
            print(preview_df.to_markdown(index=False))

            confirm = input("\n   Does this look correct? [y/n]: ").strip().lower()
            if confirm == "y":
                return records
            else:
                errors.append(f"Attempt {attempt}: User rejected parsed data")
                if attempt < max_retries:
                    print("   Let's try again with different HTML...")
                continue

        except ValueError as e:
            error_msg = f"pandas parsing error: {e}"
            errors.append(f"Attempt {attempt}: {error_msg}")
            print(f"❌ {error_msg}")

            # Try AI agent as fallback
            print("   Attempting AI agent parsing...")
            try:
                result = parse_with_ai_agent(html_content, source_url)
                if result:
                    return result
            except Exception as ai_error:
                errors.append(f"Attempt {attempt} (AI): {ai_error}")
                print(f"❌ AI agent also failed: {ai_error}")

            if attempt < max_retries:
                retry = input("\n   Try again? [y/n]: ").strip().lower()
                if retry != "y":
                    break

        except Exception as e:
            error_msg = f"Unexpected error: {e}"
            errors.append(f"Attempt {attempt}: {error_msg}")
            print(f"❌ {error_msg}")

            if attempt < max_retries:
                retry = input("\n   Try again? [y/n]: ").strip().lower()
                if retry != "y":
                    break

    # All attempts failed
    print("\n" + "═" * 60)
    print("❌ MANUAL INPUT FAILED - ERROR SUMMARY")
    print("═" * 60)
    for error in errors:
        print(f"   • {error}")
    print("═" * 60)

    return None


async def process_link(browser, link_obj, index, total):
    """Process a single procurement link with FRESH page."""
    url = link_obj.get("procurementLink")
    state = link_obj.get("state", "Unknown")

    if not url:
        print("⚠️  Link has no URL, skipping.")
        return False

    print("\n" + "═" * 70)
    print(f"🌐 PROCESSING LINK {index + 1}/{total} (Chromium)")
    print(f"   State: {state}")
    print(f"   URL: {url}")
    print("═" * 70)

    wait_strategy = get_wait_strategy(url)
    if wait_strategy:
        print(f"   ⏳ Using wait strategy: {wait_strategy}")

    # CREATE FRESH PAGE for each link
    page = await browser.new_page()
    await apply_stealth(page)

    try:
        # Navigate with proper wait strategy
        print(f"   🌐 Navigating to {url}...")
        if wait_strategy:
            await page.goto(url, wait_until=wait_strategy, timeout=60000)
        else:
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)

        # Wait for network idle
        try:
            await page.wait_for_load_state("networkidle", timeout=30000)
        except Exception:
            pass  # Continue even if networkidle times out

        await page.wait_for_timeout(3000)

    except Exception as e:
        print(f"⚠️  Could not load {url}: {e}")
        await page.close()
        return False

    # Diagnostics
    print("\n🔍 DIAGNOSTICS:")
    print(f"   Current URL: {page.url}")
    try:
        title = await page.title()
        print(f"   Page title: {title}")
        tables_count = await page.locator("table").count()
        print(f"   Tables found: {tables_count}")
    except Exception as e:
        print(f"   Diagnostic error: {e}")

    # Check for verification
    verification_type = await check_for_verification(page)
    if verification_type:
        print(f"\n{'━' * 60}")
        print(f"👉 {verification_type} VERIFICATION REQUIRED")
        print(f"{'━' * 60}")
        print("   Complete verification in the browser...")

    # Run detection diagnostics
    await diagnose_detection(page)

    print("\n" + "━" * 60)
    print("👉 STEP 1: Complete any CAPTCHAs or verification")
    print("━" * 60)
    print("   [Enter] - Continue after verification")
    print("   [s]     - Skip this link")

    skip_choice = (
        input("\n   Press [Enter] to continue or [s] to skip: ").strip().lower()
    )
    if skip_choice == "s":
        print("⏭️  Skipping this link...")
        await page.close()
        return False

    # Post-verification check
    print("\n🔍 POST-VERIFICATION:")
    try:
        tables_count = await page.locator("table").count()
        print(f"   Tables found: {tables_count}")
    except Exception:
        pass

    print("\n🎯 Activating element selector...")

    # Create future for callback
    loop = asyncio.get_running_loop()
    future = loop.create_future()

    def on_selection(html_content):
        if not future.done():
            future.set_result(html_content)

    # Expose function ONCE per fresh page
    try:
        await page.expose_function("returnHTML", on_selection)
    except Exception as e:
        print(f"⚠️  Could not expose function: {e}")
        await page.close()
        return False

    # Inject selector
    try:
        await page.evaluate(SELECTOR_JS)
    except Exception as e:
        print(f"❌ Failed to inject selector: {e}")
        await page.close()
        return False

    print("━" * 60)
    print("👉 STEP 2: Select the data table")
    print("   • Hover over elements to highlight")
    print("   • Click on the table to capture")
    print("━" * 60)

    try:
        html_data = await future
        print("✅ Element captured!")

        parsed_data = parse_html_to_records(html_data, source_url=url)

        if parsed_data:
            print(f"\n📊 Parsed {len(parsed_data)} rows")
            df = pd.DataFrame(parsed_data)
            print("\n--- DATA SAMPLE (First 5 Rows) ---")
            print(df.head().to_markdown(index=False))

            save_procurement_data_to_convex(link_obj, parsed_data)
            await page.close()
            return True
        else:
            print("\n⚠️  Automatic parsing failed.")
            manual_choice = input(
                "   Manually paste HTML? [y/n]: "
            ).strip().lower()

            if manual_choice == "y":
                parsed_data = manual_html_fallback(source_url=url, max_retries=3)
                if parsed_data:
                    print(f"\n📊 Parsed {len(parsed_data)} rows from manual input")
                    save_procurement_data_to_convex(link_obj, parsed_data)
                    await page.close()
                    return True

            print("⚠️  No data parsed for this link.")
            await page.close()
            return False

    except Exception as e:
        print(f"❌ Error during selection/parsing: {e}")

        print("\n⚠️  An error occurred during capture.")
        manual_choice = input(
            "   Manually paste HTML? [y/n]: "
        ).strip().lower()

        if manual_choice == "y":
            parsed_data = manual_html_fallback(source_url=url, max_retries=3)
            if parsed_data:
                print(f"\n📊 Parsed {len(parsed_data)} rows from manual input")
                save_procurement_data_to_convex(link_obj, parsed_data)
                await page.close()
                return True

        await page.close()
        return False


def save_debug_html(html_content, source_url=None):
    """Save HTML content to debug file for troubleshooting."""
    debug_dir = Path("./debug_html")
    debug_dir.mkdir(exist_ok=True)

    import hashlib
    from datetime import datetime

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    url_hash = hashlib.md5((source_url or "").encode()).hexdigest()[:8]
    filename = f"parse_failure_{timestamp}_{url_hash}.html"
    filepath = debug_dir / filename

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"<!-- Source URL: {source_url or 'Unknown'} -->\n")
            f.write(f"<!-- Saved at: {datetime.now().isoformat()} -->\n")
            f.write(f"<!-- HTML Length: {len(html_content)} chars -->\n\n")
            f.write(html_content)

        print(f"💾 Debug HTML saved to: {filepath}")
        return str(filepath)
    except Exception as e:
        print(f"⚠️  Failed to save debug HTML: {e}")
        return None


def parse_with_ai_agent(html_content, source_url=None):
    """Fallback: Use Convex AI agent to parse HTML."""
    init_convex_client()

    print("\n🤖 Attempting intelligent parsing with AI agent...")

    try:
        result = client.action(
            "htmlParsingActions:parseHtmlIntelligently",
            {
                "htmlContent": html_content,
                "sourceUrl": source_url,
            },
        )

        if result.get("success") and result.get("data"):
            records = result["data"]
            print(
                f"✅ AI agent parsed {result.get('rowCount', len(records))} rows"
            )
            if result.get("notes"):
                print(f"📝 Notes: {result.get('notes')}")
            return records
        else:
            error_msg = result.get("error", "Unknown error")
            print(f"❌ AI agent parsing failed: {error_msg}")
            return None

    except Exception as e:
        print(f"❌ Error calling AI agent: {e}")
        import traceback

        traceback.print_exc()
        return None


def parse_html_to_records(html_content, source_url=None):
    """Parse HTML into list of dicts. Attempts AI fallback if needed."""
    print(f"DEBUG: Parsing HTML ({len(html_content)} chars)")

    try:
        dfs = pd.read_html(StringIO(html_content))

        if not dfs:
            print("⚠️  No HTML tables found with pandas.")
            save_debug_html(html_content, source_url)
            return parse_with_ai_agent(html_content, source_url)

        print(f"DEBUG: Found {len(dfs)} table(s)")

        main_df = dfs[0]
        main_df = main_df.dropna(how="all").dropna(axis=1, how="all")

        if main_df.empty:
            print("⚠️  Table is empty after cleaning.")
            save_debug_html(html_content, source_url)
            return parse_with_ai_agent(html_content, source_url)

        main_df = main_df.fillna("")
        for col in main_df.columns:
            main_df[col] = main_df[col].astype(str)

        records = main_df.to_dict(orient="records")
        print(f"✅ Parsed {len(records)} rows using pandas")
        return records

    except ValueError as e:
        print(f"⚠️  Could not parse table with pandas: {e}")
        save_debug_html(html_content, source_url)
        return parse_with_ai_agent(html_content, source_url)
    except Exception as e:
        print(f"⚠️  Parsing error: {e}")
        save_debug_html(html_content, source_url)
        return parse_with_ai_agent(html_content, source_url)


async def main():
    print("🌐 Chromium Stealth Scraper")
    print("=" * 50)

    try:
        links = get_links_from_convex()
        print(f"Loaded {len(links)} links from DB.")

        if not links:
            print("⚠️  No approved procurement links found.")
            return 0

    except Exception as e:
        print(f"❌ Error fetching links: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        return 1

    USER_DATA_DIR.mkdir(exist_ok=True)
    display_link_menu(links)

    action, current_index = get_user_selection(links, None)

    if action == "quit":
        print("👋 Goodbye!")
        return 0

    async with async_playwright() as p:
        # Chromium launch with stealth arguments
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=str(USER_DATA_DIR),
            headless=False,
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            timezone_id="America/New_York",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--disable-dev-shm-usage",
                "--disable-browser-side-navigation",
                "--disable-gpu",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-extensions",
                "--disable-popup-blocking",
                "--disable-background-networking",
                "--disable-sync",
                "--disable-translate",
                "--metrics-recording-only",
                "--safebrowsing-disable-auto-update",
                "--password-store=basic",
                "--use-mock-keychain",
            ],
            ignore_default_args=["--enable-automation"],
        )

        # Apply stealth to initial page if it exists
        if browser.pages:
            await apply_stealth(browser.pages[0])

        while True:
            link = links[current_index]
            await process_link(browser, link, current_index, len(links))

            action, new_index = get_post_scrape_action(links, current_index)

            if action == "quit":
                print("\n👋 Goodbye!")
                break

            current_index = new_index

        await browser.close()

    return 0


if __name__ == "__main__":
    print("\n📦 Required packages:")
    print(
        "   pip install playwright playwright-stealth convex python-dotenv pandas"
    )
    print("   playwright install chromium\n")

    exit_code = asyncio.run(main())
    sys.exit(exit_code if exit_code else 0)