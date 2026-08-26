'use client';
import type { ReactNode } from 'react';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  ChevronsUpDown,
  Check,
  ChevronRight,
  Server,
  ArrowUpRight,
  Square,
} from 'lucide-react';
import { engines, moduleGroups, type Engine } from '@/lib/lab/engines';
import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
  module: Engine;
  onModule: (id: string) => void;
  onHome: () => void;
  navigation: ReactNode;
  runtime: boolean;
  onRuntime: () => void;
  statusLabel: string;
  statusState: string;
  model: string;
  busy: boolean;
  onCancel: () => void;
  tail: string;
  badgeText: string;
  atHome: boolean;
};
export function LabShell(p: Props) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <button className="brand" onClick={p.onHome}>
            <span className="brand-mark">⌁</span>Inference Lab
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="engine-picker" disabled={p.busy}>
              <span className="engine-symbol">{p.module.name[0]}</span>
              <span>
                <strong>{p.module.name}</strong>
                <small>{p.module.description}</small>
              </span>
              <ChevronsUpDown size={15} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {moduleGroups.map((group) => (
                <DropdownMenuGroup key={group}>
                  <DropdownMenuLabel>{group}</DropdownMenuLabel>
                  {engines
                    .filter((e) => e.group === group)
                    .map((engine) => (
                      <DropdownMenuItem
                        key={engine.id}
                        onClick={() => p.onModule(engine.id)}
                      >
                        <span>
                          <strong>{engine.name}</strong>
                          <small className="engine-description">
                            {engine.description}
                          </small>
                        </span>
                        {engine.id === p.module.id && <Check size={14} />}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarHeader>
        <SidebarContent>
          {p.navigation}
          {!p.atHome && p.module.available && (
            <>
              <div className="section-label">Environment</div>
              <div className="nav-wrap">
                <button
                  className={'nav-demo ' + (p.runtime ? 'selected' : '')}
                  onClick={p.onRuntime}
                >
                  <Server size={17} />
                  Runtime
                </button>
              </div>
            </>
          )}
        </SidebarContent>
        <SidebarFooter>
          <button className="runtime-shortcut" onClick={p.onRuntime}>
            <span className={'dot ' + p.statusState} />
            <span>vLLM · {p.statusLabel}</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="footer-note">Personal lab · local execution</div>
        </SidebarFooter>
      </Sidebar>
      <main className="lab-main">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <button className="crumb-home" onClick={p.onHome}>
              Inference Lab
            </button>
            <ChevronRight size={13} />
            {!p.atHome && (
              <>
                <strong>{p.module.name}</strong>
                <ChevronRight size={13} />
              </>
            )}
            <span>{p.tail}</span>
          </div>
          <div className="topbar-right">
            {p.busy ? (
              <Button className="secondary-btn" onClick={p.onCancel}>
                <Square size={12} />
                Cancel run
              </Button>
            ) : (
              <span className="model-name">
                {!p.atHome && p.module.available ? p.model : ''}
              </span>
            )}
            <span className="badge">{p.badgeText}</span>
          </div>
        </header>
        <div className="workspace">{p.children}</div>
      </main>
    </SidebarProvider>
  );
}
