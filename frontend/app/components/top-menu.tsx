"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  current: "workspace" | "integration" | "project" | "requirements";
};

export default function TopMenu({ current }: Props) {
  const router = useRouter();

  const onLogout = () => {
    router.push("/");
  };

  return (
    <nav className="top-menu" aria-label="Primary navigation">
      <div className="menu-links">
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
      </div>

      <button type="button" className="logout-btn" onClick={onLogout}>
        Logout
      </button>

      <style jsx>{`
        .top-menu {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
          margin-bottom: 14px;
        }

        .menu-links {
          display: inline-flex;
          gap: 6px;
          flex-wrap: wrap;
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

        .logout-btn {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #ffffff;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .logout-btn:hover {
          background: #f8fafc;
        }
      `}</style>
    </nav>
  );
}
