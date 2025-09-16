'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  userRole: 'admin' | 'customer'
}

const adminNavItems = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { title: 'All Jobs', href: '/admin/jobs', icon: '🧰' },
  { title: 'Customers', href: '/admin/customers', icon: '🏢' },
  { title: 'Users', href: '/admin/users', icon: '👥' },
  { title: 'Invitations', href: '/admin/invitations', icon: '✉️' },
  { title: 'Documents', href: '/admin/documents', icon: '📄' },
  { title: 'Settings', href: '/admin/settings', icon: '⚙️' },
]

const customerNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: '📊' },
  { title: 'My Jobs', href: '/jobs', icon: '🧰' },
  { title: 'Documents', href: '/documents', icon: '📄' },
  { title: 'Payments', href: '/payments', icon: '💳' },
  { title: 'Profile', href: '/profile', icon: '👤' },
]

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const navItems = userRole === 'admin' ? adminNavItems : customerNavItems

  const isActive = (href: string) => {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  return (
    <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">SmartTech Portal</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
            {userRole} Portal
          </p>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              <span className="font-medium">{item.title}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}


