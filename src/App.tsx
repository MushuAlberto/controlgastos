import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  updateDoc,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, smartSignIn, logOut, getResult } from './firebase';
import { Expense, Goal, CATEGORIES, Category } from './types';
import { parseExpenseWithAI, getFinancialInsight, scanReceiptWithAI } from './services/aiService';
import { 
  Plus, 
  Trash2, 
  LogOut, 
  PieChart as PieChartIcon, 
  List as ListIcon, 
  Wallet,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Info,
  Mic,
  Camera,
  Target,
  Trophy,
  Zap,
  X,
  Upload
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

export default function App() {
  const [user, setUser] = useState<any>({
    uid: 'guest_user',
    displayName: 'Invitado',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mushu'
  });
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [magicInput, setMagicInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [insight, setInsight] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: CATEGORIES[0],
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '',
    deadline: format(new Date(), 'yyyy-MM-dd')
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log("Testing Firestore connection...");
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection successful.");
      } catch (error) {
        console.error("Firestore connection test failed:", error);
        if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
          console.error("Please check your Firebase configuration or network connection.");
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    // Identity loop bypassed for "MushuAlberto" (Móvil Fix)
    console.log("Modo Invitado Activo");
  }, []);

  // Listen for Expenses
  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(docs);
    }, (error) => {
      console.error("Error fetching expenses:", error);
    });

    return unsubscribe;
  }, [user]);

  // Listen for Goals
  useEffect(() => {
    if (!user) {
      setGoals([]);
      return;
    }

    const q = query(
      collection(db, 'goals'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Goal[];
      setGoals(docs);
    }, (error) => {
      console.error("Error fetching goals:", error);
    });

    return unsubscribe;
  }, [user]);

  // Get AI Insight
  useEffect(() => {
    if (expenses.length > 0 && user) {
      const fetchInsight = async () => {
        const text = await getFinancialInsight(expenses.slice(0, 20), goals);
        setInsight(text);
      };
      fetchInsight();
    }
  }, [expenses.length, goals.length, user]);

  const totalMonthly = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return expenses
      .filter(e => isWithinInterval(parseISO(e.date), { start, end }))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const lastMonthTotal = useMemo(() => {
    const start = startOfMonth(subMonths(new Date(), 1));
    const end = endOfMonth(subMonths(new Date(), 1));
    return expenses
      .filter(e => isWithinInterval(parseISO(e.date), { start, end }))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const diffPercent = useMemo(() => {
    if (lastMonthTotal === 0) return 0;
    return Math.round(((totalMonthly - lastMonthTotal) / lastMonthTotal) * 100);
  }, [totalMonthly, lastMonthTotal]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newExpense.amount) return;

    try {
      await addDoc(collection(db, 'expenses'), {
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description,
        date: newExpense.date,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewExpense({
        amount: '',
        category: CATEGORIES[0],
        description: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGoal.targetAmount) return;

    try {
      await addDoc(collection(db, 'goals'), {
        title: newGoal.title,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentAmount: 0,
        deadline: newGoal.deadline,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsAddingGoal(false);
      setNewGoal({
        title: '',
        targetAmount: '',
        deadline: format(new Date(), 'yyyy-MM-dd')
      });
    } catch (error) {
      console.error("Error adding goal:", error);
    }
  };

  const handleMagicEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicInput || !user) return;

    setIsParsing(true);
    const parsed = await parseExpenseWithAI(magicInput);
    setIsParsing(false);

    if (parsed) {
      setNewExpense({
        amount: parsed.amount.toString(),
        category: parsed.category as Category,
        description: parsed.description,
        date: format(new Date(), 'yyyy-MM-dd')
      });
      setIsAdding(true);
      setMagicInput('');
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMagicInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const parsed = await scanReceiptWithAI(base64);
      setIsScanning(false);
      if (parsed) {
        setNewExpense({
          amount: parsed.amount.toString(),
          category: parsed.category as Category,
          description: parsed.description,
          date: format(new Date(), 'yyyy-MM-dd')
        });
        setIsAdding(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'goals', id));
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  // Login screen bypassed

  return (
    <div className="min-h-screen bg-stone-50 pb-24 text-stone-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-stone-50/80 backdrop-blur-xl sticky top-0 z-30 border-b border-stone-200/50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-black text-2xl tracking-tighter">MushuAlberto</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">Hola,</div>
              <div className="font-black text-sm">{user.displayName?.split(' ')[0]}</div>
            </div>
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt={user.displayName || ''} 
                className="w-10 h-10 rounded-2xl border-2 border-white shadow-sm object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            <button 
              onClick={logOut}
              className="p-2.5 text-stone-400 hover:text-stone-900 transition-colors rounded-2xl hover:bg-white shadow-sm"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* AI Insight Bar */}
        <AnimatePresence>
          {insight && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-stone-900 text-white p-6 rounded-[2rem] flex items-center gap-4 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 bg-emerald-400/20 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-base font-bold leading-tight relative z-10">{insight}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Magic Entry Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200/50 flex flex-col justify-between">
            <div>
              <div className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Entrada Inteligente</div>
              <form onSubmit={handleMagicEntry} className="relative">
                <input 
                  type="text"
                  placeholder="¿Qué gastaste hoy? Ej: 5000 en café..."
                  value={magicInput}
                  onChange={(e) => setMagicInput(e.target.value)}
                  disabled={isParsing}
                  className="w-full bg-stone-50 border-2 border-transparent focus:border-stone-900 focus:bg-white px-6 py-6 rounded-3xl text-xl font-bold transition-all outline-none pr-16"
                />
                <div className="absolute right-3 top-3 bottom-3 flex gap-2">
                  <button 
                    type="button"
                    onClick={handleVoiceInput}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-stone-100 text-stone-400 hover:text-stone-900'}`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button 
                    type="submit"
                    disabled={!magicInput || isParsing}
                    className="w-12 h-12 bg-stone-900 text-white rounded-2xl flex items-center justify-center hover:bg-stone-800 disabled:bg-stone-100 transition-colors"
                  >
                    {isParsing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm font-black text-stone-900 bg-stone-50 py-3 px-5 rounded-2xl hover:bg-stone-100 transition-colors"
              >
                {isScanning ? <div className="w-4 h-4 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" /> : <Camera className="w-4 h-4" />}
                Escanear Recibo
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            </div>
          </div>

          <div className="bg-stone-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <div className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-2">Gasto Mensual</div>
              <div className="text-5xl font-black tracking-tighter mb-4">
                ${totalMonthly.toLocaleString('es-CL')}
              </div>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${diffPercent > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                <TrendingUp className={`w-3 h-3 ${diffPercent > 0 ? 'rotate-0' : 'rotate-180'}`} />
                {Math.abs(diffPercent)}% vs mes pasado
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Goals */}
          <div className="lg:col-span-2 space-y-8">
            {/* Goals Section */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200/50">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight">Metas de Ahorro</h2>
                </div>
                <button 
                  onClick={() => setIsAddingGoal(true)}
                  className="p-2 bg-stone-50 text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {goals.map(goal => (
                  <div key={goal.id} className="bg-stone-50 p-6 rounded-3xl border border-stone-100 group relative">
                    <button 
                      onClick={() => goal.id && handleDeleteGoal(goal.id)}
                      className="absolute top-4 right-4 p-2 text-stone-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Trophy className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="font-black text-stone-900">{goal.title}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-stone-400">Progreso</span>
                        <span className="text-stone-900">${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-stone-200 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }}
                          className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {goals.length === 0 && (
                  <div className="col-span-2 py-10 text-center border-2 border-dashed border-stone-100 rounded-[2rem]">
                    <p className="text-stone-400 font-bold">No tienes metas activas</p>
                    <button onClick={() => setIsAddingGoal(true)} className="text-emerald-600 font-black text-sm mt-2">Crear mi primera meta</button>
                  </div>
                )}
              </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200/50">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <PieChartIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-black tracking-tight">Distribución de Gastos</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-50 rounded-2xl flex items-center justify-center">
                  <ListIcon className="w-5 h-5 text-stone-900" />
                </div>
                <h2 className="text-xl font-black tracking-tight">Actividad</h2>
              </div>
            </div>
            
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {expenses.slice(0, 10).map((expense) => (
                  <motion.div
                    key={expense.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-900 font-black text-sm border border-stone-100 group-hover:bg-stone-900 group-hover:text-white transition-all">
                        {expense.category[0]}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 text-sm truncate max-w-[120px]">{expense.description || expense.category}</div>
                        <div className="text-[10px] text-stone-400 font-black uppercase tracking-widest">
                          {format(parseISO(expense.date), 'd MMM', { locale: es })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-black text-stone-900">
                        ${expense.amount.toLocaleString('es-CL')}
                      </div>
                      <button 
                        onClick={() => expense.id && handleDeleteExpense(expense.id)}
                        className="p-2 text-stone-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {expenses.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-stone-300 font-bold">Sin actividad reciente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAdding(true)}
        className="fixed bottom-8 right-8 w-20 h-20 bg-stone-900 text-white rounded-[2.5rem] shadow-2xl flex items-center justify-center z-40 group"
      >
        <Plus className="w-10 h-10 group-hover:text-emerald-400 transition-colors" />
      </motion.button>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden p-10"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-stone-900 tracking-tighter">Nuevo Gasto</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 bg-stone-50 rounded-xl"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] px-1">Monto</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-stone-300 text-2xl">$</span>
                    <input
                      type="number"
                      required
                      autoFocus
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="w-full pl-12 pr-6 py-6 bg-stone-50 border-2 border-transparent focus:border-stone-900 rounded-3xl text-3xl font-black outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] px-1">Categoría</label>
                  <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewExpense({ ...newExpense, category: cat })}
                        className={`py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${newExpense.category === cat ? 'bg-stone-900 text-white border-stone-900 shadow-lg' : 'bg-stone-50 text-stone-400 border-transparent hover:border-stone-200'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] px-1">Descripción</label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full px-6 py-5 bg-stone-50 border-2 border-transparent focus:border-stone-900 rounded-3xl font-bold outline-none transition-all text-lg"
                    placeholder="¿En qué gastaste?"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-6 bg-stone-900 text-white font-black rounded-3xl shadow-2xl hover:bg-stone-800 transition-all uppercase tracking-[0.2em] text-sm mt-4"
                >
                  Guardar Gasto
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isAddingGoal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingGoal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden p-10"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-stone-900 tracking-tighter">Nueva Meta</h3>
                <button onClick={() => setIsAddingGoal(false)} className="p-2 bg-stone-50 rounded-xl"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddGoal} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] px-1">Título de la Meta</label>
                  <input
                    type="text"
                    required
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    className="w-full px-6 py-5 bg-stone-50 border-2 border-transparent focus:border-stone-900 rounded-3xl font-bold outline-none transition-all text-lg"
                    placeholder="Ej: Viaje a Japón"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] px-1">Monto Objetivo</label>
                  <input
                    type="number"
                    required
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    className="w-full px-6 py-5 bg-stone-50 border-2 border-transparent focus:border-stone-900 rounded-3xl font-black outline-none transition-all text-2xl"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] px-1">Fecha Límite</label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    className="w-full px-6 py-5 bg-stone-50 border-2 border-transparent focus:border-stone-900 rounded-3xl font-bold outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-6 bg-stone-900 text-white font-black rounded-3xl shadow-2xl hover:bg-stone-800 transition-all uppercase tracking-[0.2em] text-sm mt-4"
                >
                  Crear Meta
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
