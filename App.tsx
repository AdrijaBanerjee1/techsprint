
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Scan, 
  Settings as SettingsIcon, 
  Plus,
  Bell,
  Sparkles,
  BarChart3,
  AlertCircle,
  Share2,
  Check,
  FileDown,
  Database
} from 'lucide-react';
import { Expense, AppSettings, AppTab, UserProfile } from './types';
import { STORAGE_KEY, SETTINGS_KEY, USER_KEY, CATEGORIES } from './constants';
import Dashboard from './components/Dashboard';
import BillScanner from './components/BillScanner';
import ImageEditor from './components/ImageEditor';
import RegistrationForm from './components/RegistrationForm';
import MonthlySummary from './components/MonthlySummary';
import { subMonths, isAfter, parseISO, format, isFuture } from 'date-fns';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    weeklyLimit: 5000,
    monthlyBudget: 25000,
    phoneNumber: ''
  });
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [historyCopied, setHistoryCopied] = useState(false);
  
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: 0,
    category: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [notifications, setNotifications] = useState<string[]>([]);

  // Real-time validation
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!newExpense.amount || newExpense.amount <= 0) {
      errs.amount = "Amount must be greater than zero.";
    }
    if (!newExpense.category) {
      errs.category = "Please select a category.";
    }
    if (!newExpense.date) {
      errs.date = "Date is required.";
    } else if (isFuture(parseISO(newExpense.date))) {
      errs.date = "Expense date cannot be in the future.";
    }
    return errs;
  }, [newExpense]);

  const isFormValid = Object.keys(errors).length === 0;

  // Load data
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (stored) {
      const parsed = JSON.parse(stored) as Expense[];
      const twoMonthsAgo = subMonths(new Date(), 2);
      const filtered = parsed.filter(e => isAfter(parseISO(e.date), twoMonthsAgo));
      setExpenses(filtered);
    }
    
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings));
    }
  }, []);

  // Save data
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [expenses, settings, user]);

  const handleRegister = (profile: UserProfile) => {
    setUser(profile);
    setSettings(prev => ({ ...prev, phoneNumber: `+91 ${profile.mobile}` }));
  };

  const copyHistoryLink = () => {
    const shareUrl = `https://spendwise.ai/share/history/${Math.random().toString(36).substring(7)}`;
    navigator.clipboard.writeText(shareUrl);
    setHistoryCopied(true);
    setTimeout(() => setHistoryCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ["Date", "Category", "Description", "Amount (INR)"];
    const rows = expenses.map(e => [
      format(parseISO(e.date), 'yyyy-MM-dd'),
      e.category,
      // Wrap description in quotes to handle commas
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `spendwise_expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addExpense = (exp: Partial<Expense>) => {
    const fullExpense: Expense = {
      id: crypto.randomUUID(),
      amount: exp.amount || 0,
      category: exp.category || 'Other',
      description: exp.description || '',
      date: exp.date || new Date().toISOString()
    };
    
    const updatedExpenses = [fullExpense, ...expenses];
    setExpenses(updatedExpenses);
    
    if (fullExpense.amount > settings.weeklyLimit) {
      const msg = `ALERT: Expense of ₹${fullExpense.amount} exceeds weekly limit! SMS sent to ${settings.phoneNumber}`;
      setNotifications(prev => [msg, ...prev]);
    }
    
    setShowAddForm(false);
    setFormTouched(false);
    setActiveTab(AppTab.DASHBOARD);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);
    if (!isFormValid) return;

    addExpense(newExpense);
    setNewExpense({
      amount: 0,
      category: 'Other',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const NavButton = ({ tab, icon: Icon, label }: { tab: AppTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col items-center py-2 px-3 transition-all ${
        activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon size={24} className={activeTab === tab ? 'scale-110' : ''} />
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );

  if (!user) {
    return <RegistrationForm onRegister={handleRegister} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-600 leading-tight">
              SpendWise AI
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Hi, {user.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
            <Bell size={24} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6">
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.slice(0, 1).map((note, idx) => (
              <div key={idx} className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-bounce-short">
                <div className="flex items-center">
                  <Bell className="mr-2" size={18} />
                  <span className="text-sm font-medium">{note}</span>
                </div>
                <button onClick={() => setNotifications([])} className="text-red-400 hover:text-red-600">
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === AppTab.DASHBOARD && <Dashboard expenses={expenses} settings={settings} />}
        {activeTab === AppTab.SCANNER && <BillScanner onExpenseExtracted={addExpense} />}
        {activeTab === AppTab.EDITOR && <ImageEditor />}
        {activeTab === AppTab.SUMMARY && <MonthlySummary expenses={expenses} settings={settings} />}

        {activeTab === AppTab.HISTORY && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-black">Recent Transactions</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                  title="Export to CSV"
                >
                  <FileDown size={14} />
                  Export
                </button>
                <button 
                  onClick={copyHistoryLink}
                  className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all shadow-sm ${
                    historyCopied 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'
                  }`}
                >
                  {historyCopied ? <Check size={14} /> : <Share2 size={14} />}
                  {historyCopied ? 'Link Copied' : 'Share'}
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No expenses found. Start tracking!
                </div>
              ) : (
                expenses.map(exp => (
                  <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                        {exp.category[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-black">{exp.description || exp.category}</p>
                        <p className="text-xs text-slate-400">{format(parseISO(exp.date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <p className="font-bold text-black">-₹{exp.amount.toLocaleString('en-IN')}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === AppTab.SETTINGS && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-black mb-6">Application Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Weekly Expense Limit (₹)</label>
                  <input 
                    type="number" 
                    value={settings.weeklyLimit}
                    onChange={(e) => setSettings({...settings, weeklyLimit: Number(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Monthly Savings Target (₹)</label>
                  <input 
                    type="number" 
                    value={settings.monthlyBudget}
                    onChange={(e) => setSettings({...settings, monthlyBudget: Number(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMS Notification Number</label>
                  <input 
                    type="tel" 
                    disabled
                    value={settings.phoneNumber}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Number linked to your profile</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                <Database className="text-indigo-600" size={20} />
                Data Management
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Download your data for external analysis or clear your local storage to start fresh.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={handleExportCSV}
                  className="w-full py-3 bg-white text-indigo-600 border border-indigo-100 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  <FileDown size={18} />
                  Export All Data (CSV)
                </button>
                <button 
                  onClick={() => {
                      if(confirm("This will permanently delete your profile and all expense history. Are you sure?")) {
                        localStorage.clear();
                        window.location.reload();
                      }
                  }}
                  className="w-full py-3 text-red-500 font-semibold border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
                >
                  Reset App & Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {activeTab !== AppTab.EDITOR && activeTab !== AppTab.SUMMARY && (
        <button 
          onClick={() => {
            setShowAddForm(true);
            setFormTouched(false);
          }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
        >
          <Plus size={32} />
        </button>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-1 flex justify-between items-center z-50 safe-area-inset-bottom shadow-2xl">
        <NavButton tab={AppTab.DASHBOARD} icon={LayoutDashboard} label="Dash" />
        <NavButton tab={AppTab.HISTORY} icon={History} label="History" />
        <NavButton tab={AppTab.SCANNER} icon={Scan} label="Scan" />
        <NavButton tab={AppTab.SUMMARY} icon={BarChart3} label="Summary" />
        <NavButton tab={AppTab.EDITOR} icon={Sparkles} label="Lab" />
        <NavButton tab={AppTab.SETTINGS} icon={SettingsIcon} label="Settings" />
      </nav>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-black">Add Expense</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                Cancel
              </button>
            </div>
            <form onSubmit={handleManualAdd} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <input 
                  autoFocus
                  required
                  type="number" 
                  step="0.01"
                  value={newExpense.amount || ''}
                  onChange={(e) => {
                    setNewExpense({...newExpense, amount: Number(e.target.value)});
                    setFormTouched(true);
                  }}
                  className={`w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 transition-all ${
                    formTouched && errors.amount ? 'ring-red-500' : 'ring-slate-200'
                  } focus:ring-2 focus:ring-indigo-500 text-xl font-bold text-black`}
                />
                {formTouched && errors.amount && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.amount}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                <select 
                  value={newExpense.category}
                  onChange={(e) => {
                    setNewExpense({...newExpense, category: e.target.value});
                    setFormTouched(true);
                  }}
                  className={`w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 transition-all ${
                    formTouched && errors.category ? 'ring-red-500' : 'ring-slate-200'
                  } focus:ring-2 focus:ring-indigo-500 text-black font-medium`}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {formTouched && errors.category && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.category}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <input 
                  type="text" 
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 text-black font-medium"
                  placeholder="What was this for?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                <input 
                  type="date" 
                  value={newExpense.date}
                  onChange={(e) => {
                    setNewExpense({...newExpense, date: e.target.value});
                    setFormTouched(true);
                  }}
                  className={`w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 transition-all ${
                    formTouched && errors.date ? 'ring-red-500' : 'ring-slate-200'
                  } focus:ring-2 focus:ring-indigo-500 text-black font-medium`}
                />
                {formTouched && errors.date && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.date}
                  </p>
                )}
              </div>

              <button 
                type="submit"
                disabled={formTouched && !isFormValid}
                className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg transition-all mt-4 ${
                  !isFormValid && formTouched 
                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                Save Expense
              </button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-short {
          animation: bounce-short 1s infinite ease-in-out;
        }
      `}} />
    </div>
  );
};

export default App;
