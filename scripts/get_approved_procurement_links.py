#!/usr/bin/env python3
"""
Get Approved Procurement Links from Convex Database

Standalone Python script to fetch all approved procurement links from the Convex database.
Can be run independently from the command line.

Usage:
    python get_approved_procurement_links.py [--output FILE] [--format json|table|csv]
    
Environment Variables:
    CONVEX_URL or VITE_CONVEX_URL - Your Convex deployment URL
    (Can also be set in .env.local or .env file)
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

try:
    from convex import ConvexClient
    CONVEX_AVAILABLE = True
except ImportError:
    CONVEX_AVAILABLE = False
    print("Error: convex package not installed.")
    print("Install with: pip install convex python-dotenv")

try:
    from dotenv import load_dotenv
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False
    print("Warning: python-dotenv not installed. Install with: pip install python-dotenv")


def load_convex_url() -> Optional[str]:
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


def format_as_table(links: List[Dict]) -> str:
    """Format links as a readable table."""
    if not links:
        return "No approved procurement links found."
    
    # Calculate column widths
    max_state = max(len(str(link.get("state", ""))) for link in links) if links else 0
    max_capital = max(len(str(link.get("capital", ""))) for link in links) if links else 0
    max_official = max(len(str(link.get("officialWebsite", ""))) for link in links) if links else 0
    max_procurement = max(len(str(link.get("procurementLink", ""))) for link in links) if links else 0
    
    # Set minimum widths
    max_state = max(max_state, 10)
    max_capital = max(max_capital, 10)
    max_official = max(max_official, 20)
    max_procurement = max(max_procurement, 25)
    
    # Header
    header = f"{'State':<{max_state}} | {'Capital':<{max_capital}} | {'Official Website':<{max_official}} | {'Procurement Link':<{max_procurement}}"
    separator = "-" * len(header)
    
    lines = [header, separator]
    
    # Rows
    for link in links:
        state = str(link.get("state", ""))
        capital = str(link.get("capital", ""))
        official = str(link.get("officialWebsite", ""))
        procurement = str(link.get("procurementLink", ""))
        
        # Truncate long URLs
        if len(official) > max_official:
            official = official[:max_official-3] + "..."
        if len(procurement) > max_procurement:
            procurement = procurement[:max_procurement-3] + "..."
        
        line = f"{state:<{max_state}} | {capital:<{max_capital}} | {official:<{max_official}} | {procurement:<{max_procurement}}"
        lines.append(line)
    
    return "\n".join(lines)


def format_as_csv(links: List[Dict]) -> str:
    """Format links as CSV."""
    if not links:
        return "state,capital,officialWebsite,procurementLink,requiresRegistration"
    
    lines = ["state,capital,officialWebsite,procurementLink,requiresRegistration"]
    
    for link in links:
        state = str(link.get("state", "")).replace(",", ";")
        capital = str(link.get("capital", "")).replace(",", ";")
        official = str(link.get("officialWebsite", "")).replace(",", ";")
        procurement = str(link.get("procurementLink", "")).replace(",", ";")
        requires_reg = str(link.get("requiresRegistration", "")).lower() if link.get("requiresRegistration") is not None else ""
        
        line = f"{state},{capital},{official},{procurement},{requires_reg}"
        lines.append(line)
    
    return "\n".join(lines)


def get_approved_links(convex_url: str) -> List[Dict]:
    """Fetch approved procurement links from Convex."""
    if not CONVEX_AVAILABLE:
        raise ImportError("convex package is required. Install with: pip install convex")
    
    client = ConvexClient(convex_url)
    
    # Call the getApproved query
    # The query is at procurementUrls:getApproved
    links = client.query("procurementUrls:getApproved", {})
    
    return links


def main():
    parser = argparse.ArgumentParser(
        description='Get all approved procurement links from Convex database',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Get links and display as table (default)
  python get_approved_procurement_links.py
  
  # Save to JSON file
  python get_approved_procurement_links.py --output links.json --format json
  
  # Export as CSV
  python get_approved_procurement_links.py --output links.csv --format csv
  
  # Display as table in terminal
  python get_approved_procurement_links.py --format table

Environment Variables:
  Set CONVEX_URL or VITE_CONVEX_URL in:
    - .env.local file (highest priority)
    - .env file
    - Environment variables
        """
    )
    parser.add_argument(
        '--output',
        '-o',
        type=str,
        help='Output file path (optional, if not provided prints to stdout)'
    )
    parser.add_argument(
        '--format',
        '-f',
        choices=['json', 'table', 'csv'],
        default='table',
        help='Output format (default: table)'
    )
    parser.add_argument(
        '--convex-url',
        type=str,
        help='Convex deployment URL (overrides environment variables)'
    )
    
    args = parser.parse_args()
    
    # Get Convex URL
    convex_url = args.convex_url or load_convex_url()
    
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
        print("   3. Or pass it directly:", file=sys.stderr)
        print("      python get_approved_procurement_links.py --convex-url https://your-deployment.convex.cloud", file=sys.stderr)
        return 1
    
    print(f"🔗 Connecting to Convex at: {convex_url}", file=sys.stderr)
    
    try:
        # Fetch approved links
        print("📥 Fetching approved procurement links...", file=sys.stderr)
        links = get_approved_links(convex_url)
        
        print(f"✅ Found {len(links)} approved procurement link(s)", file=sys.stderr)
        
        # Format output
        if args.format == 'json':
            output_data = {
                "fetchedAt": datetime.now().isoformat(),
                "totalLinks": len(links),
                "links": links
            }
            output = json.dumps(output_data, indent=2, ensure_ascii=False)
        elif args.format == 'csv':
            output = format_as_csv(links)
        else:  # table
            output = format_as_table(links)
        
        # Write output
        if args.output:
            output_path = Path(args.output)
            output_path.write_text(output, encoding='utf-8')
            print(f"💾 Results saved to: {args.output}", file=sys.stderr)
        else:
            print(output)
        
        return 0
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())

