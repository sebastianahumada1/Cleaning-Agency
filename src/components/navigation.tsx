'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Panel' },
  { href: '/employees', label: 'Empleados' },
  { href: '/locations', label: 'Ubicaciones' },
  { href: '/schedule', label: 'Horarios' },
  { href: '/report', label: 'Reporte' },
  { href: '/workdays', label: 'Días Trabajados' },
  { href: '/payperiods', label: 'Períodos de Pago' },
  { href: '/payroll', label: 'Nómina' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto flex h-16 items-center space-x-6 px-4">
        <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-indigo-700 transition-all">
          Gestor de Nómina
        </Link>
        <div className="flex space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
                className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                pathname === item.href
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

