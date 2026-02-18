import { useState } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import { Button as AriaButton } from 'react-aria-components'
import { Books, Tag, Circuitry, BracketsCurly, Sliders, ArrowLineLeft, ArrowLineRight } from '@phosphor-icons/react'
import { StatusBar } from './StatusBar'
import { NavItem } from '../ui'

import type { ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'

interface NavRoute {
  to: string
  label: string
  icon: ComponentType<PhosphorIconProps>
  disabled?: boolean
}

const topRoutes: NavRoute[] = [
  { to: '/', label: 'Overview', icon: Books },
  { to: '/meta', label: 'Meta Data Tool', icon: Tag },
  { to: '/sync', label: 'RAG Tool', icon: Circuitry },
  { to: '/api', label: 'API Monitoring', icon: BracketsCurly, disabled: true },
]

const bottomRoutes: NavRoute[] = [
  { to: '/settings', label: 'Settings', icon: Sliders },
]

export function AppShell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-full flex-col">
      <StatusBar />

      <div className="flex min-h-0 flex-1">
        {/* ── Sidebar ── */}
        <nav
          aria-label="Main navigation"
          className={`flex flex-col border-r border-base-subtle-border-default bg-white p-4
            ${collapsed ? 'w-[68px]' : 'w-48'}`}
        >
          {/* Top: scrollable nav items */}
          <ul className="-m-1 flex flex-1 flex-col gap-3 overflow-y-auto p-1">
            {topRoutes.map(({ to, label, icon, disabled }) => {
              const active = !disabled && location.pathname === to
              return (
                <li key={to}>
                  <NavItem
                    href={to}
                    label={label}
                    icon={icon}
                    active={active}
                    collapsed={collapsed}
                    disabled={disabled}
                  />
                </li>
              )
            })}
          </ul>

          {/* Bottom: settings + collapse toggle */}
          <ul className="-m-1 flex flex-col gap-3 p-1">
            {bottomRoutes.map(({ to, label, icon, disabled }) => {
              const active = !disabled && location.pathname === to
              return (
                <li key={to}>
                  <NavItem
                    href={to}
                    label={label}
                    icon={icon}
                    active={active}
                    collapsed={collapsed}
                    disabled={disabled}
                  />
                </li>
              )
            })}
            <li>
              <AriaButton
                onPress={() => setCollapsed((c) => !c)}
                className={`flex h-9 items-center rounded-md ring-inset ring-0 bg-white outline-focus transition-[background-color,box-shadow]
                  hover:ring-1 hover:ring-base-border-hover hover:bg-base-subtle-background-default
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  ${collapsed ? 'w-9 justify-center' : 'gap-2 px-2'}`}
              >
                {collapsed ? (
                  <ArrowLineRight size={20} weight="regular" className="shrink-0 text-base-foreground-default" />
                ) : (
                  <>
                    <ArrowLineLeft size={20} weight="regular" className="shrink-0 text-base-foreground-default" />
                    <span className="text-base font-normal leading-6 text-base-foreground-default">Collapse</span>
                  </>
                )}
              </AriaButton>
            </li>
          </ul>
        </nav>

        {/* ── Content ── */}
        <main className="flex-1 overflow-auto bg-base-subtle-background-default p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
