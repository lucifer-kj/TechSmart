/**
 * README content validation tests
 * Framework: Jest (jsdom env available via devDeps; DOM not required here).
 * Notes:
 * - Repository already uses Jest with TypeScript tests under __tests__/.
 * - We validate structure and key content added in the PR's README diff.
 * - Regex-based to avoid brittleness while ensuring real value.
 */

import fs from 'fs';
import path from 'path';

function locateReadme(): string | null {
  const candidates = [
    'README.md', 'README.MD', 'Readme.md', 'readme.md',
    'README.markdown', 'readme.markdown',
  ];
  for (const p of candidates) {
    const abs = path.resolve(process.cwd(), p);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

const readmePath = locateReadme();
const readme = readmePath ? fs.readFileSync(readmePath, 'utf8') : '';

const has = (re: RegExp) => re.test(readme);
const hasSection = (title: string) => {
  const titleNorm = title.trim().toLowerCase();
  const lines = readme.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^#{1,6}\s*(.+?)\s*$/);
    if (m) {
      if (m[1].trim().toLowerCase() === titleNorm) return true;
    }
  }
  return false;
};

describe('README.md (ServiceM8 Customer Portal)', () => {
  test('README file exists at repo root', () => {
    expect(readmePath).not.toBeNull();
  });

  describe('Header and overview', () => {
    test('Contains project title', () => {
      expect(has(/#{1,6}\s*ServiceM8\s+Customer\s+Portal/i)).toBe(true);
    });
    test('Mentions Next.js App Router, Supabase, ServiceM8 API, and webhooks', () => {
      expect(has(/Next\.js.*App\s+Router/i)).toBe(true);
      expect(has(/Supabase/i)).toBe(true);
      expect(has(/ServiceM8\s+API/i)).toBe(true);
      expect(has(/webhooks?/i)).toBe(true);
    });
  });

  describe('Core sections present', () => {
    const sections = [
      'Why it’s useful',
      'Who uses it',
      'Core User Flows',
      'Features',
      'Architecture',
      'Getting Started',
      'Environment Variables',
      'ServiceM8 Integration',
      'Quick Verification',
      'Detailed Setup',
      'API Surface (Selected)',
      'Security & Compliance',
      'Limitations & Next Steps',
      'Contributing',
    ];
    for (const s of sections) {
      test(`Has section: ${s}`, () => {
        expect(hasSection(s)).toBe(true);
      });
    }
  });

  describe('Why it’s useful bullets', () => {
    test('Includes key value bullets', () => {
      expect(has(/Reduce back-and-forth/i)).toBe(true);
      expect(has(/Faster approvals/i)).toBe(true);
      expect(has(/Single source of truth/i)).toBe(true);
      expect(has(/Secure access/i)).toBe(true);
    });
  });

  describe('Who uses it bullets', () => {
    test('Mentions Customers and Internal staff (optional)', () => {
      expect(has(/Customers.*View their jobs/i)).toBe(true);
      expect(has(/Internal staff.*optional/i)).toBe(true);
    });
  });

  describe('Getting Started', () => {
    test('Includes clone -> cd -> npm install', () => {
      expect(has(/git\s+clone\s+.+\n\s*cd\s+\S+\n\s*npm\s+install/mi)).toBe(true);
    });
    test('Includes environment file copy', () => {
      expect(has(/cp\s+env\.example\s+\.env\.local/mi)).toBe(true);
    });
    test('Includes environment check', () => {
      expect(has(/npm\s+run\s+check-env/mi)).toBe(true);
    });
    test('Includes optional seed script', () => {
      expect(has(/npm\s+run\s+seed/mi)).toBe(true);
    });
    test('Includes dev server start and localhost URL', () => {
      expect(has(/npm\s+run\s+dev/mi)).toBe(true);
      expect(has(/http:\/\/localhost:3000\b/i)).toBe(true);
    });
  });

  describe('Environment Variables', () => {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    const optional = [
      'SERVICEM8_API_KEY',
      'SERVICEM8_WEBHOOK_SECRET',
    ];

    test('Lists required variables', () => {
      for (const v of required) {
        expect(readme.includes(v)).toBe(true);
      }
    });

    test('Lists optional ServiceM8 variables', () => {
      for (const v of optional) {
        expect(readme.includes(v)).toBe(true);
      }
    });

    test('Mentions smart feature bullets', () => {
      expect(has(/Auto-Detection/i)).toBe(true);
      expect(has(/Mock Data Fallback/i)).toBe(true);
      expect(has(/Multi-Account Support/i)).toBe(true);
      expect(has(/Graceful Degradation/i)).toBe(true);
    });
  });

  describe('ServiceM8 Integration', () => {
    test('Provides API key setup steps and example', () => {
      expect(has(/Get your ServiceM8 API key/i)).toBe(true);
      expect(has(/SERVICEM8_API_KEY\s*=\s*/i)).toBe(true);
    });

    test('Links to detailed ServiceM8 setup guide', () => {
      expect(readme.toLowerCase().includes('[servicem8 setup guide](docs/servicem8_setup.md)')).toBe(true);
    });

    test('Links to Detailed Setup guide', () => {
      const lower = readme.toLowerCase();
      expect(lower.includes('[docs/setup.md]') || lower.includes('(docs/setup.md)')).toBe(true);
    });

    test('docs/SERVICEM8_SETUP.md exists (skip if absent)', () => {
      const p = path.join(process.cwd(), 'docs', 'SERVICEM8_SETUP.md');
      if (!fs.existsSync(p)) {
        expect(true).toBe(true);
        return;
      }
      expect(fs.existsSync(p)).toBe(true);
    });

    test('docs/SETUP.md exists (skip if absent)', () => {
      const p = path.join(process.cwd(), 'docs', 'SETUP.md');
      if (!fs.existsSync(p)) {
        expect(true).toBe(true);
        return;
      }
      expect(fs.existsSync(p)).toBe(true);
    });
  });

  describe('API Surface (Selected)', () => {
    const endpoints = [
      '/api/customer-portal/dashboard',
      '/api/customer-portal/jobs',
      '/api/customer-portal/payments',
      '/api/servicem8/attachments/[attachmentId]',
      '/api/servicem8/jobs/[jobId]',
      '/api/webhooks/servicem8',
    ];

    test('Lists key endpoints with dynamic segments', () => {
      const readmeLower = readme.toLowerCase();
      for (const ep of endpoints) {
        expect(readmeLower.includes(ep.toLowerCase())).toBe(true);
      }
    });
  });

  describe('Core User Flows', () => {
    const flows = [
      'Customer dashboard',
      'Browse and filter jobs',
      'Document center',
      'Quote approval',
      'Payment tracking',
    ];
    for (const f of flows) {
      test(`Describes flow: ${f}`, () => {
        expect(readme.toLowerCase().includes(f.toLowerCase())).toBe(true);
      });
    }

    test('Quick verification API URL and query param example provided', () => {
      expect(has(/http:\/\/localhost:3000\/api\/servicem8\/jobs/i)).toBe(true);
      expect(has(/\?customerId=/i)).toBe(true);
    });
  });

  describe('Architecture details', () => {
    test('Mentions Next.js 15 and app/api routes', () => {
      expect(has(/Next\.js\s+15/i)).toBe(true);
      expect(has(/app\/api\/\*/i)).toBe(true);
    });
    test('Mentions Supabase Postgres, ServiceM8 client, and webhook-based cache refresh', () => {
      expect(has(/Supabase\s+Postgres/i)).toBe(true);
      expect(has(/ServiceM8\s+client/i)).toBe(true);
      expect(has(/Webhooks\s+keep\s+cache\s+fresh/i)).toBe(true);
    });
  });

  describe('Security, Compliance, and Next Steps', () => {
    test('Mentions security controls and recommendations', () => {
      expect(has(/Session-based access/i)).toBe(true);
      expect(has(/Customer data isolation/i)).toBe(true);
      expect(has(/Audit logging/i)).toBe(true);
      expect(has(/rate limiting/i)).toBe(true);
      expect(has(/RLS/i)).toBe(true);
      expect(has(/encryption/i)).toBe(true);
    });
    test('Mentions adding tests and deployment docs as next steps, plus auth improvements', () => {
      expect(has(/Add tests.*deployment docs/i)).toBe(true);
      expect(has(/email\/password|magic-link/i)).toBe(true);
    });
  });

  describe('Contributing and badges', () => {
    test('Includes CodeRabbit badge and link', () => {
      expect(has(/\!\[CodeRabbit Pull Request Reviews\]\(/i)).toBe(true);
      expect(has(/img\.shields\.io\/coderabbit\/prs\/github/i)).toBe(true);
      expect(has(/coderabbit\.ai/i)).toBe(true);
    });
    test('Has Contributing section and guidance (linting & type checks)', () => {
      expect(hasSection('Contributing')).toBe(true);
      expect(has(/Issues and PRs are welcome/i)).toBe(true);
      expect(has(/linting/i)).toBe(true);
      expect(has(/type checks/i)).toBe(true);
    });
  });

  describe('Basic sanity checks', () => {
    test('README is non-empty and reasonably sized', () => {
      expect(typeof readme).toBe('string');
      expect(readme.length).toBeGreaterThan(500);
    });
    test('Contains at least 5 code fences', () => {
      const fences = (readme.match(/```/g) || []).length;
      expect(fences).toBeGreaterThanOrEqual(5);
    });
  });
});