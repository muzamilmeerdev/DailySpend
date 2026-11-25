import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { gsap } from 'gsap'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'

type Transaction = {
  id: number
  type: 'income' | 'expense'
  name: string
  description: string
  category: string
  amount: number
  date: string
}

const categoryColors: Record<string, string> = {
  'Room Rent': '#6c63ff',
  Food: '#12c9b2',
  Books: '#f7b84b',
  Education: '#eb6da7',
  Travel: '#4ca5ff',
  'Personal Expenses': '#a477ff',
  Other: '#7f8a9d',
}

const expenseCategories = ['Room Rent', 'Food', 'Books', 'Education', 'Travel', 'Personal Expenses', 'Other']
const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`
const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const today = new Date()
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const currentDate = `${currentMonth}-${String(today.getDate()).padStart(2, '0')}`

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('hisaab-transactions-v2')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [typeFilter, setTypeFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [newTransactionType, setNewTransactionType] = useState<'income' | 'expense'>('expense')
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => {
    localStorage.setItem('hisaab-transactions-v2', JSON.stringify(transactions))
  }, [transactions])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.animate-in', { y: 18, opacity: 0, duration: 0.65, stagger: 0.07, ease: 'power3.out' })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(selectedMonth)),
    [transactions, selectedMonth],
  )

  const availableMonths = useMemo(() => {
    const months = new Set<string>([currentMonth, selectedMonth])
    transactions.forEach((transaction) => months.add(transaction.date.slice(0, 7)))
    for (let offset = 1; offset < 12; offset += 1) {
      const date = new Date(today.getFullYear(), today.getMonth() - offset, 1)
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    }
    return [...months].sort().reverse()
  }, [transactions, selectedMonth])

  const summary = useMemo(() => {
    const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    const rent = monthTransactions.filter((item) => item.category === 'Room Rent').reduce((sum, item) => sum + item.amount, 0)
    const personal = monthTransactions.filter((item) => item.category === 'Personal Expenses').reduce((sum, item) => sum + item.amount, 0)
    return { income, expenses, rent, personal, balance: income - expenses }
  }, [monthTransactions])

  const filteredTransactions = useMemo(() => {
    const query = search.toLowerCase()
    return monthTransactions.filter((item) => {
      const matchesSearch = `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query)
      const matchesCategory = categoryFilter === 'All categories' || item.category === categoryFilter
      const matchesType = typeFilter === 'All' || item.type === typeFilter.toLowerCase()
      return matchesSearch && matchesCategory && matchesType
    })
  }, [monthTransactions, search, categoryFilter, typeFilter])

  const spendingData = useMemo(() => {
    const grouped = monthTransactions
      .filter((item) => item.type === 'expense')
      .reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + item.amount }), {})
    return Object.entries(grouped).map(([name, value]) => ({ name, value, color: categoryColors[name] || categoryColors.Other }))
  }, [monthTransactions])

  const cashflowData = useMemo(() => {
    const weeks = [
      { name: '01–07', income: 0, expense: 0 },
      { name: '08–14', income: 0, expense: 0 },
      { name: '15–21', income: 0, expense: 0 },
      { name: '22–31', income: 0, expense: 0 },
    ]
    monthTransactions.forEach((item) => {
      const day = Number(item.date.slice(-2))
      const index = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3
      weeks[index][item.type] += item.amount
    })
    return weeks
  }, [monthTransactions])

  const saveTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const type = data.get('type') as 'income' | 'expense'
    const transaction: Transaction = {
      id: editing?.id || Date.now(),
      type,
      name: String(data.get('name')),
      description: String(data.get('description')),
      category: type === 'income' ? 'Family Support' : String(data.get('category')),
      amount: Number(data.get('amount')),
      date: String(data.get('date')),
    }
    setTransactions((current) => editing ? current.map((item) => item.id === editing.id ? transaction : item) : [transaction, ...current])
    setModalOpen(false)
    setEditing(null)
  }

  const openEditor = (transaction?: Transaction, type: 'income' | 'expense' = 'expense') => {
    setEditing(transaction || null)
    setNewTransactionType(transaction?.type || type)
    setModalOpen(true)
  }

  const downloadReport = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const monthLabel = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    doc.setFillColor(15, 18, 35)
    doc.rect(0, 0, 210, 42, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.text('My Personal Hisaab', 16, 19)
    doc.setFontSize(10)
    doc.setTextColor(180, 185, 210)
    doc.text(`${monthLabel} Financial Report`, 16, 29)
    doc.setTextColor(20, 24, 40)
    doc.setFontSize(12)
    doc.text(`Total Received: INR ${summary.income.toLocaleString('en-IN')}`, 16, 56)
    doc.text(`Total Spent: INR ${summary.expenses.toLocaleString('en-IN')}`, 16, 65)
    doc.text(`Remaining Balance: INR ${summary.balance.toLocaleString('en-IN')}`, 16, 74)
    doc.setFontSize(14)
    doc.text('Transactions', 16, 92)
    doc.setFontSize(9)
    monthTransactions.forEach((item, index) => {
      const y = 104 + index * 9
      if (y < 285) doc.text(`${formatDate(item.date)}  |  ${item.name}  |  ${item.category}  |  ${item.type === 'income' ? '+' : '-'} INR ${item.amount.toLocaleString('en-IN')}`, 16, y)
    })
    doc.save(`personal-hisaab-${selectedMonth}.pdf`)
  }

  const monthLabel = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div ref={rootRef} className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><WalletCards size={20} /></div>
          <div><strong>My Personal</strong><span>Hisaab</span></div>
          <button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav>
          <p className="nav-label">Overview</p>
          <a className="nav-item active" href="#"><LayoutDashboard size={19} />Dashboard</a>
          <a className="nav-item" href="#transactions"><CircleDollarSign size={19} />Transactions</a>
          <a className="nav-item" href="#analytics"><PieChartIcon size={19} />Analytics</a>
          <a className="nav-item" href="#reports"><BookOpen size={19} />Reports</a>
          <p className="nav-label space-top">Workspace</p>
          <a className="nav-item" href="#"><CalendarDays size={19} />Monthly records</a>
          <a className="nav-item" href="#"><Settings size={19} />Preferences</a>
        </nav>
        <div className="sidebar-card">
          <div className="mini-icon"><TrendingUp size={17} /></div>
          <strong>{summary.income ? `${Math.max(0, Math.round(summary.balance / summary.income * 100))}% available` : 'Start this month'}</strong>
          <p>{summary.income ? 'Your balance updates with every transaction.' : 'Add money received to begin your monthly record.'}</p>
          <div className="mini-progress"><span style={{ width: `${summary.income ? Math.max(0, Math.min(100, summary.balance / summary.income * 100)) : 0}%` }} /></div>
        </div>
        <button className="profile">
          <div className="avatar">MH</div>
          <span><strong>My account</strong><small>Personal finance</small></span>
          <LogOut size={17} />
        </button>
      </aside>

      {mobileMenu && <button className="backdrop" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}

      <main>
        <header className="topbar animate-in">
          <button className="menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div>
            <p className="eyebrow">Finance overview</p>
            <h1>Welcome to your Hisaab</h1>
          </div>
          <div className="header-actions">
            <div className="month-select">
              <CalendarDays size={16} />
              <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {new Date(`${month}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /><span /></button>
            <button className="primary-button" onClick={() => openEditor(undefined, 'expense')}><Plus size={18} />Add expense</button>
          </div>
        </header>

        <section className="hero-row animate-in">
          <div><h2>Your money, clearly managed.</h2><p>Add money received from home and every expense for {monthLabel}.</p></div>
          <div className="hero-actions">
            <button className="receive-button" onClick={() => openEditor(undefined, 'income')}><ArrowDownLeft size={17} />Money received</button>
            <button className="secondary-button" onClick={downloadReport} disabled={!monthTransactions.length}><Download size={17} />Download report</button>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="Total received" value={summary.income} note="From family" icon={<ArrowDownLeft />} kind="income" />
          <StatCard label="Total spent" value={summary.expenses} note={`${summary.income ? Math.round(summary.expenses / summary.income * 100) : 0}% of income`} icon={<ArrowUpRight />} kind="spent" />
          <StatCard label="Rent paid" value={summary.rent} note="Room rent" icon={<UserRound />} kind="rent" />
          <StatCard label="Personal expenses" value={summary.personal} note="Daily essentials" icon={<WalletCards />} kind="personal" />
          <div className="balance-card animate-in">
            <div className="balance-glow" />
            <div className="stat-heading"><span>Remaining balance</span><div className="balance-icon"><CircleDollarSign size={20} /></div></div>
            <strong>{formatCurrency(summary.balance)}</strong>
            <p><TrendingUp size={15} /> Available to save or spend</p>
          </div>
        </section>

        <section id="analytics" className="analytics-grid">
          <div className="panel chart-panel animate-in">
            <div className="panel-heading">
              <div><h3>Cash flow</h3><p>Income and expenses by week</p></div>
              <div className="chart-legend"><span className="income-dot" />Income <span className="expense-dot" />Expenses</div>
            </div>
            <div className="area-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowData} margin={{ left: 2, right: 10, top: 16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#756bff" stopOpacity=".36" /><stop offset="100%" stopColor="#756bff" stopOpacity="0" /></linearGradient>
                    <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#19cbb7" stopOpacity=".22" /><stop offset="100%" stopColor="#19cbb7" stopOpacity="0" /></linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7f879e', fontSize: 11 }} dy={8} />
                  <Tooltip contentStyle={{ background: '#171a2d', border: '1px solid #2b2f49', borderRadius: 12 }} formatter={(value) => formatCurrency(Number(value))} />
                  <Area type="monotone" dataKey="income" stroke="#756bff" strokeWidth={2.5} fill="url(#incomeFill)" />
                  <Area type="monotone" dataKey="expense" stroke="#19cbb7" strokeWidth={2.5} fill="url(#expenseFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel spending-panel animate-in">
            <div className="panel-heading"><div><h3>Spending breakdown</h3><p>By expense category</p></div></div>
            <div className="spending-content">
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={spendingData} dataKey="value" innerRadius={51} outerRadius={69} paddingAngle={3} stroke="none">{spendingData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <div className="donut-center"><strong>{formatCurrency(summary.expenses)}</strong><span>Total spent</span></div>
              </div>
              <div className="spending-list">
                {spendingData.slice(0, 4).map((item) => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{formatCurrency(item.value)}</strong></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="transactions" className="panel transactions-panel animate-in">
          <div className="transaction-header">
            <div><h3>Recent transactions</h3><p>{filteredTransactions.length} records in {monthLabel}</p></div>
            <div className="filters">
              <label className="search-box"><Search size={16} /><input placeholder="Search transactions" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All</option><option>Income</option><option>Expense</option></select>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th>Amount</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {filteredTransactions.map((item) => (
                  <tr key={item.id}>
                    <td><div className={`transaction-icon ${item.type}`}>{item.type === 'income' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</div><span><strong>{item.name}</strong><small>{item.description}</small></span></td>
                    <td><span className="category-pill"><i style={{ background: item.type === 'income' ? '#35d3b8' : categoryColors[item.category] }} />{item.category}</span></td>
                    <td>{formatDate(item.date)}</td>
                    <td className={item.type}>{item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}</td>
                    <td><div className="row-actions"><button onClick={() => openEditor(item)} aria-label="Edit transaction"><Pencil size={15} /></button><button onClick={() => setTransactions((current) => current.filter((transaction) => transaction.id !== item.id))} aria-label="Delete transaction"><Trash2 size={15} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredTransactions.length && (
              <div className="empty-state">
                <div className="empty-icon"><WalletCards size={22} /></div>
                <strong>{monthTransactions.length ? 'No transactions match your filters' : `Start your ${monthLabel} record`}</strong>
                <p>{monthTransactions.length ? 'Try changing the search or filters.' : 'First add money received from home, then record each expense as it happens.'}</p>
                {!monthTransactions.length && <div><button className="receive-button" onClick={() => openEditor(undefined, 'income')}><ArrowDownLeft size={16} />Add money received</button><button className="primary-button" onClick={() => openEditor(undefined, 'expense')}><Plus size={16} />Add expense</button></div>}
              </div>
            )}
          </div>
        </section>
        <footer><span>Your records are saved automatically on this device.</span><span>My Personal Hisaab · {new Date().getFullYear()}</span></footer>
      </main>

      {modalOpen && <TransactionModal transaction={editing} defaultType={newTransactionType} selectedMonth={selectedMonth} onClose={() => { setModalOpen(false); setEditing(null) }} onSubmit={saveTransaction} />}
    </div>
  )
}

function StatCard({ label, value, note, icon, kind }: { label: string; value: number; note: string; icon: React.ReactNode; kind: string }) {
  return <div className="stat-card animate-in"><div className="stat-heading"><span>{label}</span><div className={`stat-icon ${kind}`}>{icon}</div></div><strong>{formatCurrency(value)}</strong><p>{note}</p></div>
}

function TransactionModal({ transaction, defaultType, selectedMonth, onClose, onSubmit }: { transaction: Transaction | null; defaultType: 'income' | 'expense'; selectedMonth: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type || defaultType)
  return (
    <div className="modal-layer" role="dialog" aria-modal="true">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close modal" />
      <form className="transaction-modal" onSubmit={onSubmit}>
        <div className="modal-heading"><div><p className="eyebrow">{transaction ? 'Update record' : 'New record'}</p><h2>{transaction ? 'Edit transaction' : 'Add transaction'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={18} /></button></div>
        <div className="type-switch"><label className={type === 'income' ? 'selected' : ''}><input type="radio" name="type" value="income" checked={type === 'income'} onChange={() => setType('income')} /><ArrowDownLeft size={17} />Money received</label><label className={type === 'expense' ? 'selected' : ''}><input type="radio" name="type" value="expense" checked={type === 'expense'} onChange={() => setType('expense')} /><ArrowUpRight size={17} />Expense</label></div>
        <div className="form-grid">
          <label><span>{type === 'income' ? 'Sender name' : 'Paid to'}</span><input name="name" required defaultValue={transaction?.name} placeholder={type === 'income' ? 'e.g. Father' : 'e.g. Fresh Basket'} /></label>
          <label><span>Amount (₹)</span><input name="amount" type="number" min="1" required defaultValue={transaction?.amount} placeholder="0" /></label>
          <label><span>Date</span><input name="date" type="date" required defaultValue={transaction?.date || (selectedMonth === currentMonth ? currentDate : `${selectedMonth}-01`)} /></label>
          {type === 'expense' && <label><span>Category</span><select name="category" defaultValue={transaction?.category || 'Food'}>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></label>}
          <label className="full"><span>Description</span><input name="description" required defaultValue={transaction?.description} placeholder="Add a helpful note" /></label>
        </div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{transaction ? 'Save changes' : 'Add transaction'}</button></div>
      </form>
    </div>
  )
}
