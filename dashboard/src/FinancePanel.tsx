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
    const sub = s.subscription || { type: 'full', allowedTeachers: [], allowedSubjects: [] };
    if (sub.type === 'limited') {
       limitedCount++;
       const tCount = Array.isArray(sub.allowedTeachers) ? sub.allowedTeachers.length : 0;
       const sCount = Array.isArray(sub.allowedSubjects) ? sub.allowedSubjects.length : 0;
       limitedRev += (tCount + sCount) * prices.itemPrice;
    } else {
       fullCount++;
       fullRev += prices.fullPrice;
    }
  });

  const totalRev = fullRev + limitedRev;
  const arpu = students.length > 0 ? totalRev / students.length : 0;

  return (
    <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ padding: "30px", minHeight: "70vh", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
          <TrendingUp color="var(--emerald-main-main)" />
          التقارير المالية وإيرادات الاشتراكات
        </h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
          تحليل تفصيلي للإيرادات المتوقعة بناءً على أسعار الاشتراكات وأعداد الطلاب المشتركين.
        </p>
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
            <div className="stat-card-icon" style={{ background: "var(--emerald-main-soft)" }}>
              <DollarSign size={22} color="var(--emerald-main-main)" />
            </div>
            <div className="stat-card-trend up">إجمالي</div>
          </div>
          <h3 style={{ fontSize: "1.8rem" }}>{totalRev.toLocaleString()} <span style={{ fontSize: "1rem", color: "var(--text-tertiary)" }}>IQD</span></h3>
          <p>إجمالي الإيرادات المتوقعة</p>
        </motion.div>

        <motion.div className="stat-card glass-card" {...fadeUp(0.3)}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "var(--emerald-main-soft)" }}>
              <Users size={22} color="var(--emerald-main-main)" />
            </div>
            <div className="stat-card-trend up">متوسط</div>
          </div>
          <h3 style={{ fontSize: "1.8rem" }}>{arpu.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: "1rem", color: "var(--text-tertiary)" }}>IQD</span></h3>
          <p>متوسط إيراد الطالب الواحد</p>
        </motion.div>

        <motion.div className="stat-card glass-card" {...fadeUp(0.4)}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "#EEF5F3" }}>
               <TrendingUp size={22} color="#12453D" />
            </div>
            <div className="stat-card-trend up">شامل</div>
          </div>
          <h3 style={{ fontSize: "1.8rem" }}>{fullRev.toLocaleString()} <span style={{ fontSize: "1rem", color: "var(--text-tertiary)" }}>IQD</span></h3>
          <p>إيرادات الاشتراكات الشاملة ({fullCount} طالب)</p>
        </motion.div>

        <motion.div className="stat-card glass-card" {...fadeUp(0.5)}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "var(--gold-soft)" }}>
              <BookOpen size={22} color="var(--gold)" />
            </div>
            <div className="stat-card-trend up">مخصص</div>
          </div>
          <h3 style={{ fontSize: "1.8rem" }}>{limitedRev.toLocaleString()} <span style={{ fontSize: "1rem", color: "var(--text-tertiary)" }}>IQD</span></h3>
          <p>إيرادات الاشتراكات المخصصة ({limitedCount} طالب)</p>
        </motion.div>
      </div>

      {/* Details/Charts Section */}
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
    </motion.div>
  );
}
