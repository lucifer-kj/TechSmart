"""
Tests for README/documentation integrity.

Testing library/framework: pytest

These tests validate that the README (or equivalent top-level documentation)
contains required sections, examples, routes, env var names, and relative links.
They also verify that relative links resolve to existing files in the repo.

If your project uses a different primary README file name or location, adjust
READMES under the fixture accordingly.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
import pytest

# --- Test fixtures and helpers ------------------------------------------------

@pytest.fixture(scope="module")
def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]

@pytest.fixture(scope="module")
def readmes(repo_root: Path) -> list[Path]:
    # Common README names (case-insensitive)
    candidates = []
    for name in ("README.md", "Readme.md", "readme.md"):
        p = repo_root / name
        if p.exists():
            candidates.append(p)
    # Fallback: a docs/README.md if root is missing
    p = repo_root / "docs" / "README.md"
    if p.exists():
        candidates.append(p)
    assert candidates, "No README.md found at repo root or docs/README.md"
    return candidates

@pytest.fixture(scope="module", params=lambda readmes: readmes)  # parametrize over all readmes found
def readme_path(request) -> Path:
    return request.param

@pytest.fixture(scope="module")
def readme_text(readme_path: Path) -> str:
    return readme_path.read_text(encoding="utf-8", errors="ignore")

def has_heading(text: str, heading: str) -> bool:
    # Match markdown headings like '# Heading', '## Heading', etc.
    pattern = rf"^\s*#+\s+{re.escape(heading)}\s*$"
    return re.search(pattern, text, flags=re.MULTILINE) is not None

def grep(text: str, pattern: str, flags=0) -> list[re.Match]:
    return list(re.finditer(pattern, text, flags))

# --- Core content tests (based on provided diff) -------------------------------

def test_title_and_intro_present(readme_text: str):
    assert has_heading(readme_text, "ServiceM8 Customer Portal")
    assert "A secure, self-service customer portal" in readme_text

@pytest.mark.parametrize("heading", [
    "Why it's useful",
    "Who uses it",
    "Core User Flows",
    "Features",
    "Architecture",
    "Getting Started",
    "Environment Variables",
    "ServiceM8 Integration",
    "Quick Verification",
    "Detailed Setup",
    "API Surface (Selected)",
    "Security & Compliance",
    "Limitations & Next Steps",
    "Contributing",
])
def test_expected_sections_exist(readme_text: str, heading: str):
    assert has_heading(readme_text, heading), f"Missing section: {heading}"

def test_core_user_flows_include_expected_items(readme_text: str):
    expected_bullets = [
        "Customer dashboard",
        "Browse and filter jobs",
        "Document center (quotes, invoices, photos)",
        "Quote approval",
        "Payment tracking",
    ]
    for bullet in expected_bullets:
        assert bullet in readme_text, f"Missing core user flow: {bullet}"

def test_api_routes_documented(readme_text: str):
    routes = [
        r"GET /api/customer-portal/dashboard",
        r"GET /api/customer-portal/jobs",
        r"GET /api/customer-portal/payments",
        r"GET /api/servicem8/attachments/\[attachmentId\]",
        r"POST /api/servicem8/jobs/\[jobId\]/approve",
        r"POST /api/webhooks/servicem8",
    ]
    for route in routes:
        assert re.search(route, readme_text), f"Missing API route: {route}"

def test_environment_variables_list(readme_text: str):
    required = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]
    optional = [
        "SERVICEM8_API_KEY",
        "SERVICEM8_WEBHOOK_SECRET",
    ]
    for key in required + optional:
        assert key in readme_text, f"Env var not mentioned: {key}"

def test_smart_features_bullets_present(readme_text: str):
    bullets = [
        "Auto-Detection",
        "Mock Data Fallback",
        "Multi-Account Support",
        "Graceful Degradation",
    ]
    for label in bullets:
        assert label in readme_text, f"Missing Smart Feature: {label}"

def test_quick_setup_has_steps_and_code_blocks(readme_text: str):
    # Expect numbered steps 1..5 and fenced bash code blocks
    steps = [
        r"1\.\s+\*\*Clone and install dependencies:\*\*",
        r"2\.\s+\*\*Set up environment variables:\*\*",
        r"3\.\s+\*\*Check your environment setup:\*\*",
        r"4\.\s+\*\*Seed development data \(optional\):\*\*",
        r"5\.\s+\*\*Start the development server:\*\*",
    ]
    for s in steps:
        assert re.search(s, readme_text), f"Missing Quick Setup step: {s}"

    # At least one bash code block under Quick Setup
    assert "```bash" in readme_text, "Expected fenced bash code blocks in Quick Setup"

def test_localhost_note_present(readme_text: str):
    assert "http://localhost:3000" in readme_text

def test_serviceM8_integration_instructions(readme_text: str):
    assert "Get your ServiceM8 API key" in readme_text
    assert "SERVICEM8_API_KEY=your_servicem8_api_key" in readme_text
    for phrase in ("Detects your company information", "Fetches your real ServiceM8 data", "Configures itself for your account"):
        assert phrase in readme_text

def test_quick_verification_endpoints(readme_text: str):
    assert "http://localhost:3000/api/servicem8/jobs" in readme_text
    assert "?customerId=YOUR_COMPANY_UUID" in readme_text

def test_security_and_compliance_mentions(readme_text: str):
    for phrase in (
        "Session-based access with Supabase Auth",
        "Customer data isolation",
        "Audit logging and rate limiting",
        "RLS policies and encryption",
    ):
        assert phrase in readme_text

def test_limitations_next_steps_mentions_tests_and_deployment_docs(readme_text: str):
    assert "Add tests (unit/integration/E2E) and deployment docs" in readme_text

def test_badge_image_link_format(readme_text: str):
    # Validate that the badge image markdown exists and uses an HTTPS shields.io URL
    m = re.search(r"\!\[CodeRabbit Pull Request Reviews\]\((https://img\.shields\.io/[^)]+)\)", readme_text)
    assert m, "Expected CodeRabbit badge image with shields.io URL"
    url = m.group(1)
    assert url.startswith("https://img.shields.io/")

# --- Link validation tests (relative links resolve) ----------------------------

@pytest.mark.parametrize("rel_path", [
    "docs/SERVICEM8_SETUP.md",
    "docs/SETUP.md",
])
def test_relative_links_exist_on_disk(repo_root: Path, readme_text: str, rel_path: str):
    # Only assert existence if the README actually references the link
    if rel_path in readme_text:
        target = repo_root / rel_path
        assert target.exists(), f"Referenced link target missing: {rel_path}"

# --- Markdown structure sanity checks -----------------------------------------

def test_no_tbd_placeholders(readme_text: str):
    # Discourage placeholders that suggest incomplete documentation
    assert "TBD" not in readme_text.upper()

def test_has_horizontal_rules_between_major_sections(readme_text: str):
    # The diff shows several '---' separators
    count = readme_text.count("\n---\n")
    assert count >= 4, "Expected multiple horizontal rules to separate sections"

# --- Regex conformance for route docs -----------------------------------------

@pytest.mark.parametrize("pattern", [
    r"^-\s+`GET /api/customer-portal/dashboard`",
    r"^-\s+`GET /api/customer-portal/jobs`",
    r"^-\s+`GET /api/customer-portal/payments`",
    r"^-\s+`GET /api/servicem8/attachments/\[attachmentId\]`",
    r"^-\s+`POST /api/servicem8/jobs/\[jobId\]/approve`",
    r"^-\s+`POST /api/webhooks/servicem8`",
])
def test_api_surface_bulleted_format(readme_text: str, pattern: str):
    # Ensure endpoints are presented as bulleted list items with code formatting
    assert re.search(pattern, readme_text, flags=re.MULTILINE), f"Endpoint list item missing or misformatted: {pattern}"

# --- Code block correctness checks --------------------------------------------

def test_code_blocks_use_bash_for_shell_snippets(readme_text: str):
    # Ensure shell snippets are marked as bash for syntax highlighting
    fences = grep(readme_text, r"```bash")
    assert len(fences) >= 4, "Expected at least 4 bash code blocks (clone/install, env setup, check-env, seed/dev)"

def test_env_copy_command_present(readme_text: str):
    assert "cp env.example .env.local" in readme_text

# --- App router and stack references ------------------------------------------

def test_stack_references_present(readme_text: str):
    for phrase in (
        "Next.js 15 App Router",
        "Supabase",
        "ServiceM8 API",
        "webhooks",
        "caching",
    ):
        assert phrase.lower().split()[0] in readme_text.lower(), f"Missing stack reference: {phrase}"

# --- Contributing guidance present --------------------------------------------

def test_contributing_section_has_quality_gates(readme_text: str):
    assert "avoid committing secrets" in readme_text.lower()
    assert "ensure changes pass linting and type checks" in readme_text.lower()

# --- Smoke test that README is not empty and reasonable length ----------------

def test_readme_non_empty_and_reasonable_size(readme_text: str):
    assert len(readme_text.strip()) > 500, "README appears too short; missing substantive content?"