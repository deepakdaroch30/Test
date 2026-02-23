"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarWidth = isCollapsed ? 70 : 260;

  return (
    <div className="app-container">
      {isMobileOpen && <button className="backdrop" aria-label="Close navigation" onClick={() => setIsMobileOpen(false)} />}

      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onToggleCollapse={() => setIsCollapsed((current) => !current)}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <main className="main-content" style={{ marginLeft: `${sidebarWidth}px` }}>
        <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(true)} aria-label="Open navigation menu">
          ☰
        </button>
        {children}
      </main>

      <style jsx>{`
        .app-container {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: #f8fafc;
        }
        .main-content {
          width: 100%;
          overflow: auto;
          padding: 24px;
          transition: margin-left 0.25s ease;
          background: #f8fafc;
        }
        .mobile-menu-btn {
          display: none;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: #fff;
          margin-bottom: 12px;
          cursor: pointer;
        }
        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.35);
          z-index: 30;
          border: 0;
        }
        @media (max-width: 900px) {
          .main-content {
            margin-left: 0 !important;
            padding: 16px;
          }
          .mobile-menu-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
