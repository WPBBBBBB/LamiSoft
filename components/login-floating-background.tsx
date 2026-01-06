"use client"

import { BarChart3, Calculator, Coins, FileText, PieChart, Receipt, Settings } from "lucide-react"
import styles from "./login-floating-background.module.css"

export function LoginFloatingBackground() {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.vignette} />

      <div className={styles.textLayer}>
        <div className={styles.text} dir="rtl">
          <div className={styles.title}>AL-LamiSoft</div>
          <div className={styles.subtitle}>نظام الحسابات والإدارة</div>
          <div className={styles.ribbon}>
            <span>المبيعات</span>
            <span className={styles.dot}>•</span>
            <span>المشتريات</span>
            <span className={styles.dot}>•</span>
            <span>المخزون</span>
            <span className={styles.dot}>•</span>
            <span>التقارير</span>
          </div>
        </div>
      </div>

      {/* Top-left cluster */}
      <div
        className={`${styles.item} ${styles.itemA}`}
        style={{ top: "10%", left: "10%", ['--dur' as never]: "13s", ['--delay' as never]: "-2s" }}
      >
        <Coins className="h-14 w-14 text-foreground" />
      </div>

      <div
        className={`${styles.item} ${styles.itemSoft} ${styles.itemB}`}
        style={{ top: "18%", left: "22%", ['--dur' as never]: "17s", ['--delay' as never]: "-6s" }}
      >
        <PieChart className="h-12 w-12 text-foreground" />
      </div>

      {/* Top-right */}
      <div
        className={`${styles.item} ${styles.itemA}`}
        style={{ top: "12%", right: "12%", ['--dur' as never]: "15s", ['--delay' as never]: "-4s" }}
      >
        <BarChart3 className="h-16 w-16 text-foreground" />
      </div>

      <div
        className={`${styles.item} ${styles.itemSoft} ${styles.itemC}`}
        style={{ top: "24%", right: "24%", ['--dur' as never]: "19s", ['--delay' as never]: "-9s" }}
      >
        <Receipt className="h-12 w-12 text-foreground" />
      </div>

      {/* Mid-left */}
      <div
        className={`${styles.item} ${styles.itemB}`}
        style={{ top: "46%", left: "6%", ['--dur' as never]: "18s", ['--delay' as never]: "-8s" }}
      >
        <Calculator className="h-16 w-16 text-foreground" />
      </div>

      {/* Mid-right */}
      <div
        className={`${styles.item} ${styles.itemC}`}
        style={{ top: "52%", right: "8%", ['--dur' as never]: "16s", ['--delay' as never]: "-5s" }}
      >
        <FileText className="h-14 w-14 text-foreground" />
      </div>

      {/* Subtle spinning gear behind */}
      <div
        className={`${styles.item} ${styles.itemSoft} ${styles.spin}`}
        style={{ bottom: "-6%", left: "38%", opacity: 0.06 }}
      >
        <Settings className="h-40 w-40 text-foreground" />
      </div>
    </div>
  )
}
