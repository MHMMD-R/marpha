import { collection, doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Users, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from './firebase';

const fadeUp = (delay = 0): any => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.8, 0.25, 1] }
});

export function FinancePanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [prices, setPrices] = useState({ fullPrice: 0, itemPrice: 0 });

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'students'), snap => {
      setStudents(snap.docs.map(t => ({ id: t.id, ...t.data() })));
    });
    const unsubSettings = onSnapshot(doc(db, 'settings', 'subscription_price'), docSnap => {
      if (docSnap.exists()) {
        setPrices({
           fullPrice: docSnap.data().fullPrice || 0,
           itemPrice: docSnap.data().itemPrice || 0
        });
      }
    });

    return () => { unsubStudents(); unsubSettings(); };
  }, []);

  let fullCount = 0;
  let limitedCount = 0;
  let fullRev = 0;
  let limitedRev = 0;

  students.forEach(s => {
    const sub = s.subscription || { type: 'none', allowedTeachers: [], allowedSubjects: [] };
    if (sub.type === 'limited') {
       limitedCount++;
       if (sub.cost !== undefined && sub.cost !== null && sub.cost !== 0) {
          limitedRev += Number(sub.cost);
       } else {
          const tCount = Array.isArray(sub.allowedTeachers) ? sub.allowedTeachers.length : 0;
          const sCount = Array.isArray(sub.allowedSubjects) ? sub.allowedSubjects.length : 0;
          limitedRev += (tCount + sCount) * prices.itemPrice;
       }
    } else if (sub.type === 'full') {
       fullCount++;
       if (sub.cost !== undefined && sub.cost !== null && sub.cost !== 0) {
          fullRev += Number(sub.cost);
       } else {
          fullRev += prices.fullPrice;
       }
    }
  });

  const totalRev = fullRev + limitedRev;
  const arpu = students.length > 0 ? totalRev / students.length : 0;

  return (
    <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ padding: "30px", minHeight: "70vh", display: "flex", flexDirection: "column" }}>
      
      {/* 1. Dashboard UI (Hidden when printing) */}
      <div className="no-print">
        <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
              <TrendingUp color="var(--emerald-main-main)" />
              التقارير المالية وإيرادات الاشتراكات
            </h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
              تحليل تفصيلي للإيرادات المتوقعة بناءً على أسعار الاشتراكات وأعداد الطلاب المشتركين.
            </p>
          </div>
          <button 
            onClick={() => window.print()}
            className="btn-print"
            style={{ background: "var(--emerald-main-main)", color: "white", padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <BookOpen size={18} />
            طباعة التقرير
          </button>
        </div>

        {prices.fullPrice === 0 && prices.itemPrice === 0 && (
          <div style={{ background: "rgba(255, 184, 0, 0.1)", color: "#F59E0B", padding: "16px", borderRadius: "12px", marginBottom: "24px", fontWeight: "bold" }}>
              تنبيه: أسعار الاشتراكات غير محددة أو تساوي صفر. يرجى ضبط الأسعار من صفحة المعاملات و"الاشتراكات" للحصول على تقرير دقيق.
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: "40px" }}>
          <motion.div className="stat-card glass-card" {...fadeUp(0.2)}>
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{ background: "var(--emerald-main-main)" }}>
                <DollarSign size={22} color="white" />
              </div>
              <div className="stat-card-trend up">إجمالي</div>
            </div>
            <h3 style={{ fontSize: "1.8rem" }}>{totalRev.toLocaleString()} <span style={{ fontSize: "1rem", color: "var(--text-tertiary)" }}>IQD</span></h3>
            <p>إجمالي الإيرادات المتوقعة</p>
          </motion.div>

          <motion.div className="stat-card glass-card" {...fadeUp(0.3)}>
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{ background: "var(--emerald-main-main)" }}>
                <Users size={22} color="white" />
              </div>
              <div className="stat-card-trend up">متوسط</div>
            </div>
            <h3 style={{ fontSize: "1.8rem" }}>{arpu.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: "1rem", color: "var(--text-tertiary)" }}>IQD</span></h3>
            <p>متوسط إيراد الطالب الواحد</p>
          </motion.div>

          <motion.div className="stat-card glass-card" {...fadeUp(0.4)}>
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{ background: "#EEF5F3" }}>
                <TrendingUp size={22} color="var(--emerald-main-main)" />
              </div>
              <div className="stat-card-trend up">شامل</div>
            </div>
            <h3 style={{ fontSize: "1.8rem" }}>{fullRev.toLocaleString()} <span style={{ fontSize: "1rem", color: "var(--text-tertiary)" }}>IQD</span></h3>
            <p>إيرادات الاشتراكات الشاملة ({fullCount} طالب)</p>
          </motion.div>

          <motion.div className="stat-card glass-card" {...fadeUp(0.5)}>
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{ background: "var(--gold)" }}>
                <BookOpen size={22} color="white" />
              </div>
              <div className="stat-card-trend up">مخصص</div>
            </div>
            <h3 style={{ fontSize: "1.8rem" }}>{limitedRev.toLocaleString()} <span style={{ fontSize: "1rem", color: "var(--text-tertiary)" }}>IQD</span></h3>
            <p>إيرادات الاشتراكات المخصصة ({limitedCount} طالب)</p>
          </motion.div>
        </div>

        {/* Pricing Details */}
        <motion.div className="panel-card glass-card" {...fadeUp(0.6)} style={{ marginBottom: "auto" }}>
            <div className="panel-header">
              <h3>تفاصيل تسعيرة النظام الحالية</h3>
            </div>
            <div className="panel-body" style={{ display: "flex", gap: "20px", padding: "20px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "250px", background: "var(--bg-body)", padding: "20px", borderRadius: "16px", border: "1px solid var(--border-light)" }}>
                <h4 style={{ color: "var(--emerald-main-main)", margin: "0 0 10px 0" }}>الاشتراك الشامل</h4>
                <p style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0" }}>{prices.fullPrice.toLocaleString()} IQD <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "normal" }}>/ للمشترك</span></p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "10px" }}>وصول غير محدود لجميع المواد والمعلمين في المنصة.</p>
              </div>
              <div style={{ flex: 1, minWidth: "250px", background: "var(--bg-body)", padding: "20px", borderRadius: "16px", border: "1px solid var(--border-light)" }}>
                <h4 style={{ color: "var(--gold)", margin: "0 0 10px 0" }}>الاشتراك المخصص</h4>
                <p style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0" }}>{prices.itemPrice.toLocaleString()} IQD <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "normal" }}>/ مادة أو معلم</span></p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "10px" }}>سعر مرن يُحسب بعدد المواد والمعلمين للطالب الواحد.</p>
              </div>
            </div>
        </motion.div>
      </div>

      {/* 2. Professional Print Report (Visible only when printing) */}
      <div className="print-report print-only" style={{ display: "none", direction: "rtl", fontFamily: "Cairo", color: "#111A18" }}>
        {/* Formal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #12453D", paddingBottom: "20px", marginBottom: "30px" }}>
          <div>
            <h1 style={{ fontSize: "2.2rem", margin: 0, color: "#12453D" }}>منصة معرفة التعليمية</h1>
            <p style={{ fontSize: "1.1rem", margin: "5px 0 0", color: "#5A7A74" }}>نظام الإدارة المالية الشامل</p>
          </div>
          <div style={{ textAlign: "left" }}>
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>تقرير الإيرادات</h2>
            <p style={{ margin: "5px 0 0", fontSize: "0.9rem" }}>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            <p style={{ margin: "2px 0 0", fontSize: "0.9rem" }}>الوقت: {new Date().toLocaleTimeString('ar-EG')}</p>
          </div>
        </div>

        {/* Summary Boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "40px" }}>
          <div style={{ border: "2px solid #E8EDEC", padding: "15px", borderRadius: "12px", textAlign: "center" }}>
            <p style={{ margin: "0 0 10px", fontSize: "1rem", color: "#5A7A74", fontWeight: "bold" }}>إجمالي الطلاب</p>
            <h3 style={{ fontSize: "1.8rem", margin: 0 }}>{students.length}</h3>
          </div>
          <div style={{ border: "2px solid #12453D", padding: "15px", borderRadius: "12px", textAlign: "center", background: "#F4F7F6" }}>
            <p style={{ margin: "0 0 10px", fontSize: "1rem", color: "#12453D", fontWeight: "bold" }}>إجمالي الإيرادات</p>
            <h3 style={{ fontSize: "1.8rem", margin: 0, color: "#12453D" }}>{totalRev.toLocaleString()} IQD</h3>
          </div>
          <div style={{ border: "2px solid #E3A736", padding: "15px", borderRadius: "12px", textAlign: "center" }}>
            <p style={{ margin: "0 0 10px", fontSize: "1rem", color: "#E3A736", fontWeight: "bold" }}>متوسط إيراد الطالب</p>
            <h3 style={{ fontSize: "1.8rem", margin: 0 }}>{arpu.toLocaleString(undefined, { maximumFractionDigits: 0 })} IQD</h3>
          </div>
        </div>

        {/* Breakdown Table */}
        <div style={{ marginBottom: "40px" }}>
          <h3 style={{ borderRight: "4px solid #12453D", paddingRight: "10px", marginBottom: "15px" }}>تفاصيل المشتركين</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#12453D", color: "white" }}>
                <th style={{ padding: "12px", textAlign: "right", border: "1px solid #12453D" }}>ID</th>
                <th style={{ padding: "12px", textAlign: "right", border: "1px solid #12453D" }}>اسم الطالب</th>
                <th style={{ padding: "12px", textAlign: "right", border: "1px solid #12453D" }}>نوع الاشتراك</th>
                <th style={{ padding: "12px", textAlign: "right", border: "1px solid #12453D" }}>المواد/المعلمين</th>
                <th style={{ padding: "12px", textAlign: "right", border: "1px solid #12453D" }}>التكلفة</th>
              </tr>
            </thead>
            <tbody>
              {students.filter(s => s.subscription?.type !== 'none').map(s => {
                const sub = s.subscription;
                const count = (sub.allowedTeachers?.length || 0) + (sub.allowedSubjects?.length || 0);
                const calcCost = sub.type === 'full' ? prices.fullPrice : (count * prices.itemPrice);
                const finalCost = (sub.cost !== undefined && sub.cost !== 0) ? sub.cost : calcCost;

                return (
                  <tr key={s.id}>
                    <td style={{ padding: "10px", border: "1px solid #E8EDEC", fontWeight: "bold" }}>{s.userId || '—'}</td>
                    <td style={{ padding: "10px", border: "1px solid #E8EDEC" }}>{s.name}</td>
                    <td style={{ padding: "10px", border: "1px solid #E8EDEC" }}>{sub.type === 'full' ? 'شامل' : 'مخصص'}</td>
                    <td style={{ padding: "10px", border: "1px solid #E8EDEC" }}>{sub.type === 'full' ? 'الكل' : `${count} مادة/معلم`}</td>
                    <td style={{ padding: "10px", border: "1px solid #E8EDEC", fontWeight: "bold" }}>{finalCost.toLocaleString()} IQD</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Official Footer */}
        <div style={{ marginTop: "80px", display: "flex", justifyContent: "space-between", padding: "0 40px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: "bold", marginBottom: "40px" }}>توقيع المحاسب</p>
            <div style={{ width: "150px", borderBottom: "1px solid #111A18" }}></div>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: "bold", marginBottom: "40px" }}>ختم الإدارة</p>
            <div style={{ width: "150px", height: "80px", border: "2px dashed #D0D9D6", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#D0D9D6" }}>
              الختم الرسمي
            </div>
          </div>
        </div>

        <div style={{ position: "fixed", bottom: "20px", left: 0, right: 0, textAlign: "center", fontSize: "0.8rem", color: "#8A9E99" }}>
          هذا التقرير تم إنشاؤه آلياً بواسطة نظام إدارة منصة معرفة
        </div>
      </div>
    </motion.div>
  );
}
