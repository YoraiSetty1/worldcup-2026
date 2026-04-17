import { useState } from 'react';
import { Table, Network } from 'lucide-react';
import { motion } from 'framer-motion';

export function WorldCupTable() {
  // state שיקבע איזה טאב פתוח עכשיו: 'groups' או 'knockout'
  const [activeTab, setActiveTab] = useState('groups');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black flex items-center gap-2">
        <Table className="text-secondary" size={24} /> 
        טבלת המונדיאל
      </h1>

      {/* כפתורי ניווט פנימיים (טאבים) */}
      <div className="flex bg-muted/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
            activeTab === 'groups' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Table size={16} />
          שלב הבתים
        </button>
        <button
          onClick={() => setActiveTab('knockout')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
            activeTab === 'knockout' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Network size={16} />
          שלב הנוקאאוט
        </button>
      </div>

      {/* אזור התוכן המשתנה */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card rounded-xl border border-border p-6 min-h-[400px]"
      >
        {activeTab === 'groups' ? (
          <div>
            <h2 className="text-xl font-bold mb-4">שלב הבתים (בקרוב)</h2>
            <p className="text-muted-foreground">כאן יופיעו הבתים A עד L עם כל הנקודות והפרשי השערים...</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-4">עץ הנוקאאוט (בקרוב)</h2>
            <p className="text-muted-foreground">כאן יופיע עץ הטורניר שמתכנס לגמר באמצא...</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default WorldCupTable;