"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type SidebarProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
};

const navItems = [
  { href: "/workspace", label: "Workspace", icon: "🏠", match: (path: string) => path.startsWith("/workspace") },
  { href: "/integration", label: "Integration Configuration", icon: "🔌", match: (path: string) => path.startsWith("/integration") },
  { href: "/project/tenant-acme-JIRA-101/overview", label: "Project Overview", icon: "📊", match: (path: string) => path.startsWith("/project/") },
  { href: "/requirements", label: "Requirements Intake", icon: "🧾", match: (path: string) => path.startsWith("/requirements") },
];

export default function Sidebar({ isCollapsed, isMobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? "collapsed" : "expanded"} ${isMobileOpen ? "mobile-open" : ""}`}>
        <button className="collapse-toggle" onClick={onToggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {isCollapsed ? "»" : "«"}
        </button>

        <div className="brand" title="Veloryn">
          <strong className="brand-title">Veloryn</strong>
          {!isCollapsed && <span className="brand-subtitle">AI Engineering Intelligence Platform</span>}
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`nav-item ${active ? "active" : ""}`}
                title={isCollapsed ? item.label : undefined}
                onClick={onCloseMobile}
              >
                <span className="icon" aria-hidden="true">{item.icon}</span>
                {!isCollapsed && <span className="label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => router.push("/")} title={isCollapsed ? "Logout" : undefined}>
            <span aria-hidden="true">⎋</span>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          background: #fff;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          z-index: 40;
          transition: width 0.25s ease, transform 0.25s ease;
          overflow: hidden;
        }
        .expanded { width: 260px; }
        .collapsed { width: 70px; }

        .collapse-toggle {
          align-self: flex-end;
          margin: 12px;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: #fff;
          cursor: pointer;
          color: #374151;
        }

        .brand { padding: 0 14px 12px; }
        .brand-title { color: #1e3a8a; font-size: 24px; line-height: 1.2; display: block; }
        .brand-subtitle { color: #64748b; font-size: 12px; line-height: 1.35; display: block; margin-top: 4px; }

        .nav { display: grid; gap: 6px; padding: 8px; }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 10px;
          text-decoration: none;
          color: #334155;
          padding: 10px;
          font-weight: 500;
        }
        .nav-item:hover { background: #f1f5f9; }
        .nav-item.active { background: #e0e7ff; color: #1e3a8a; font-weight: 700; }
        .icon { width: 24px; display: inline-flex; justify-content: center; }

        .sidebar-footer { margin-top: auto; padding: 12px 8px 16px; }
        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          background: #fff;
          color: #334155;
          padding: 10px;
          cursor: pointer;
          font-weight: 600;
        }
        .logout-btn:hover { background: #f8fafc; }

        @media (max-width: 900px) {
          .sidebar {
            width: 260px;
            transform: translateX(-100%);
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
          .collapsed { width: 260px; }
          .brand-subtitle, .label { display: inline; }
        }
      `}</style>
    </>
  );
}
