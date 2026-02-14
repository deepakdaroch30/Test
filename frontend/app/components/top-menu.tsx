"use client";

import Link from "next/link";

type Props = {
  current: "workspace" | "integration" | "project" | "requirements";
};

export default function TopMenu({ current }: Props) {
  return (
    <nav className="top-menu" aria-label="Primary navigation">
      <Link href="/workspace" className={current === "workspace" ? "active" : ""}>
        Workspace
      </Link>
      <Link href="/integration" className={current === "integration" ? "active" : ""}>
        Integration Configuration
      </Link>
      <Link href="/project/tenant-acme-JIRA-101/overview" className={current === "project" ? "active" : ""}>
        Project Overview
      </Link>
      <Link href="/requirements" className={current === "requirements" ? "active" : ""}>
        Requirements Intake
      </Link>

      <style jsx>{`
        .top-menu {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px;
          display: inline-flex;
          gap: 6px;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
          margin-bottom: 14px;
        }
        a {
          text-decoration: none;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          padding: 8px 12px;
        }
        a:hover {
          background: #eef2ff;
          color: #1e3a8a;
        }
        .active {
          background: #1e3a8a;
          color: #ffffff;
        }
      `}</style>
    </nav>
  );
}
