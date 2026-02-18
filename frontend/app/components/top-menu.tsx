"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import TechMountLogo from "./techmount-logo";

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
      <div className="brand-block" aria-label="Application brand">
        <TechMountLogo size={26} />
        <div>
          <p className="brand-name">TechMount</p>
          <p className="brand-subtitle">AI Quality Hub</p>
        </div>
      </div>

      <div className="menu-links">
        <Link href="/workspace" className={`menu-link ${current === "workspace" ? "active" : ""}`}>
          Workspace
        </Link>
        <Link href="/integration" className={`menu-link ${current === "integration" ? "active" : ""}`}>
          Integration Configuration
        </Link>
        <Link href="/project/tenant-acme-JIRA-101/overview" className={`menu-link ${current === "project" ? "active" : ""}`}>
          Project Overview
        </Link>
        <Link href="/requirements" className={`menu-link ${current === "requirements" ? "active" : ""}`}>
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
          border-radius: 12px;
          padding: 8px 10px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 16px;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
          margin-bottom: 14px;
        }

        .brand-block {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 168px;
        }

        .brand-name {
          margin: 0;
          font-weight: 700;
          color: #183f73;
          font-size: 14px;
          line-height: 1;
        }

        .brand-subtitle {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1;
        }

        .menu-links {
          display: inline-flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .menu-link {
          text-decoration: none;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          padding: 8px 12px;
          display: inline-flex;
          align-items: center;
        }
        .menu-link:hover {
          background: #eef2ff;
          color: #1e3a8a;
        }
        .menu-link.active {
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

        @media (max-width: 980px) {
          .top-menu {
            grid-template-columns: 1fr;
          }

          .brand-block {
            min-width: 0;
          }
        }
      `}</style>
    </nav>
  );
}
