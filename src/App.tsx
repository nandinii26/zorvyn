import { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'

type Role = 'viewer' | 'admin'
type Theme = 'dark' | 'light'
type TransactionType = 'income' | 'expense'
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category-asc'

type Transaction = {
  id: number
  date: string
  amount: number
  category: string
  type: TransactionType
  merchant: string
  note: string
}

type DraftTransaction = {
  date: string
  amount: string
  category: string
  type: TransactionType
  merchant: string
  note: string
}

type MonthlyPoint = {
  month: string
  label: string
  income: number
  expense: number
  net: number
  balance: number
}

type BreakdownItem = {
  category: string
  amount: number
  percentage: number
}

const STORAGE_KEY = 'zorvyn-finance-dashboard-v1'
const STARTING_BALANCE = 4825

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
})

const seedTransactions: Transaction[] = [
  { id: 1, date: '2026-04-02', amount: 4800, category: 'Salary', type: 'income', merchant: 'Northstar Labs', note: 'Monthly salary payout' },
  { id: 2, date: '2026-04-01', amount: 1480, category: 'Housing', type: 'expense', merchant: 'Cedar Apartments', note: 'Rent for April' },
  { id: 3, date: '2026-03-29', amount: 420, category: 'Groceries', type: 'expense', merchant: 'Market Basket', note: 'Weekly grocery run' },
  { id: 4, date: '2026-03-28', amount: 620, category: 'Freelance', type: 'income', merchant: 'Blue Ridge Studio', note: 'Landing page project' },
  { id: 5, date: '2026-03-24', amount: 95, category: 'Transport', type: 'expense', merchant: 'City Transit', note: 'Monthly commute pass' },
  { id: 6, date: '2026-03-21', amount: 80, category: 'Subscriptions', type: 'expense', merchant: 'Streamline', note: 'Design software bundle' },
  { id: 7, date: '2026-03-19', amount: 180, category: 'Dining', type: 'expense', merchant: 'Basil Table', note: 'Dinner with friends' },
  { id: 8, date: '2026-03-15', amount: 250, category: 'Wellness', type: 'expense', merchant: 'Pulse Gym', note: 'Quarterly membership renewal' },
  { id: 9, date: '2026-02-28', amount: 2800, category: 'Salary', type: 'income', merchant: 'Northstar Labs', note: 'February salary' },
  { id: 10, date: '2026-02-26', amount: 1480, category: 'Housing', type: 'expense', merchant: 'Cedar Apartments', note: 'Rent for March' },
  { id: 11, date: '2026-02-17', amount: 310, category: 'Groceries', type: 'expense', merchant: 'Fresh Fork', note: 'Stocked up for the month' },
  { id: 12, date: '2026-02-12', amount: 290, category: 'Travel', type: 'expense', merchant: 'RailCo', note: 'Weekend trip ticket' },
  { id: 13, date: '2026-01-30', amount: 520, category: 'Freelance', type: 'income', merchant: 'North Wing Agency', note: 'Content refresh work' },
  { id: 14, date: '2026-01-29', amount: 95, category: 'Utilities', type: 'expense', merchant: 'City Power', note: 'Electric bill' },
  { id: 15, date: '2026-01-21', amount: 220, category: 'Dining', type: 'expense', merchant: 'Harbor Kitchen', note: 'Client lunch' },
]

const readStorage = () => {
  if (typeof window === 'undefined') {
    return { role: 'viewer' as Role, theme: 'light' as Theme, transactions: seedTransactions }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { role: 'viewer' as Role, theme: 'light' as Theme, transactions: seedTransactions }
    }

    const parsed = JSON.parse(raw) as { role?: Role; theme?: Theme; transactions?: Transaction[] }

    return {
      role: parsed.role ?? 'viewer',
      theme: parsed.theme ?? 'dark',
      transactions: Array.isArray(parsed.transactions) && parsed.transactions.length > 0 ? parsed.transactions : seedTransactions,
    }
  } catch {
    return { role: 'viewer' as Role, theme: 'light' as Theme, transactions: seedTransactions }
  }
}

const emptyDraft = (date = new Date().toISOString().slice(0, 10)): DraftTransaction => ({
  date,
  amount: '',
  category: '',
  type: 'expense',
  merchant: '',
  note: '',
})

const formatCurrency = (value: number) => currencyFormatter.format(value)
const formatDate = (value: string) => dateFormatter.format(new Date(value))
const formatMonth = (value: string) => monthFormatter.format(new Date(`${value}-01`))
const getMonthKey = (value: string) => value.slice(0, 7)
const compareValues = (left: string, right: string) => left.localeCompare(right)
const buildPath = (points: { x: number; y: number }[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')

function App() {
  const snapshot = readStorage()
  const [transactions, setTransactions] = useState<Transaction[]>(snapshot.transactions)
  const [role, setRole] = useState<Role>(snapshot.role)
  const [theme, setTheme] = useState<Theme>(snapshot.theme)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftTransaction>(() => emptyDraft())
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, theme, transactions }))
  }, [role, theme, transactions])

  useEffect(() => {
    if (!statusMessage) {
      return
    }

    const timeout = window.setTimeout(() => setStatusMessage(''), 2500)
    return () => window.clearTimeout(timeout)
  }, [statusMessage])

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>(['all'])
    transactions.forEach((transaction) => categories.add(transaction.category))

    return Array.from(categories).sort((left, right) => {
      if (left === 'all') {
        return -1
      }

      if (right === 'all') {
        return 1
      }

      return compareValues(left, right)
    })
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    return [...transactions]
      .filter((transaction) => {
        const matchesSearch =
          searchTerm.length === 0 ||
          [transaction.merchant, transaction.category, transaction.note].join(' ').toLowerCase().includes(searchTerm)
        const matchesType = typeFilter === 'all' || transaction.type === typeFilter
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter

        return matchesSearch && matchesType && matchesCategory
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'date-asc':
            return new Date(left.date).getTime() - new Date(right.date).getTime()
          case 'amount-desc':
            return right.amount - left.amount
          case 'amount-asc':
            return left.amount - right.amount
          case 'category-asc':
            return compareValues(left.category, right.category)
          case 'date-desc':
          default:
            return new Date(right.date).getTime() - new Date(left.date).getTime()
        }
      })
  }, [categoryFilter, search, sortBy, transactions, typeFilter])

  const summaries = useMemo(() => {
    const income = transactions.filter((transaction) => transaction.type === 'income').reduce((total, transaction) => total + transaction.amount, 0)
    const expenses = transactions.filter((transaction) => transaction.type === 'expense').reduce((total, transaction) => total + transaction.amount, 0)
    const balance = STARTING_BALANCE + income - expenses
    const savingsRate = income > 0 ? Math.max(0, ((income - expenses) / income) * 100) : 0

    return { income, expenses, balance, savingsRate }
  }, [transactions])

  const monthlySeries = useMemo<MonthlyPoint[]>(() => {
    const monthMap = new Map<string, MonthlyPoint>()

    transactions.forEach((transaction) => {
      const month = getMonthKey(transaction.date)
      const existing = monthMap.get(month)

      if (existing) {
        if (transaction.type === 'income') {
          existing.income += transaction.amount
        } else {
          existing.expense += transaction.amount
        }
        return
      }

      monthMap.set(month, {
        month,
        label: formatMonth(month),
        income: transaction.type === 'income' ? transaction.amount : 0,
        expense: transaction.type === 'expense' ? transaction.amount : 0,
        net: 0,
        balance: 0,
      })
    })

    const series = Array.from(monthMap.values()).sort((left, right) => left.month.localeCompare(right.month))

    return series
      .reduce<{ points: MonthlyPoint[]; balance: number }>(
        (accumulator, point) => {
          const net = point.income - point.expense
          const balance = accumulator.balance + net

          return {
            balance,
            points: [...accumulator.points, { ...point, net, balance }],
          }
        },
        { points: [], balance: STARTING_BALANCE },
      )
      .points
  }, [transactions])

  const breakdown = useMemo<BreakdownItem[]>(() => {
    const categoryTotals = new Map<string, number>()

    transactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + transaction.amount)
      })

    const total = Array.from(categoryTotals.values()).reduce((sum, value) => sum + value, 0)

    return Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({ category, amount, percentage: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((left, right) => right.amount - left.amount)
  }, [transactions])

  const highestSpendingCategory = breakdown[0]
  const latestMonth = monthlySeries[monthlySeries.length - 1]
  const previousMonth = monthlySeries[monthlySeries.length - 2]

  const monthlyComparison = useMemo(() => {
    if (!latestMonth || !previousMonth) {
      return null
    }

    const change = latestMonth.expense - previousMonth.expense
    const percentage = previousMonth.expense > 0 ? (change / previousMonth.expense) * 100 : 0

    return {
      currentLabel: latestMonth.label,
      previousLabel: previousMonth.label,
      currentExpense: latestMonth.expense,
      previousExpense: previousMonth.expense,
      change,
      percentage,
    }
  }, [latestMonth, previousMonth])

  const averageMonthlyExpense =
    monthlySeries.length > 0
      ? monthlySeries.reduce((total, point) => total + point.expense, 0) / monthlySeries.length
      : 0

  const netFlow = summaries.income - summaries.expenses
  const monthlyRunway = summaries.expenses > 0 ? summaries.balance / summaries.expenses : 0

  const trendChart = useMemo(() => {
    const width = 680
    const height = 260
    const padding = 28

    if (monthlySeries.length === 0) {
      return { width, height, padding, path: '', points: [] as { x: number; y: number }[] }
    }

    const values = monthlySeries.map((point) => point.balance)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max === min ? 1 : max - min
    const usableWidth = width - padding * 2
    const usableHeight = height - padding * 2
    const points = monthlySeries.map((point, index) => {
      const x = monthlySeries.length === 1 ? width / 2 : padding + (index * usableWidth) / (monthlySeries.length - 1)
      const y = padding + ((max - point.balance) / span) * usableHeight
      return { x, y }
    })

    return { width, height, padding, path: buildPath(points), points }
  }, [monthlySeries])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (role !== 'admin') {
      return
    }

    const amount = Number(draft.amount)

    if (!draft.date || !draft.category.trim() || !draft.merchant.trim() || !Number.isFinite(amount)) {
      setStatusMessage('Fill in the required fields before saving.')
      return
    }

    const normalized: Transaction = {
      id: editingId ?? Date.now(),
      date: draft.date,
      amount: Math.round(Math.abs(amount)),
      category: draft.category.trim(),
      type: draft.type,
      merchant: draft.merchant.trim(),
      note: draft.note.trim(),
    }

    setTransactions((current) =>
      editingId ? current.map((transaction) => (transaction.id === editingId ? normalized : transaction)) : [normalized, ...current],
    )
    setEditingId(null)
    setDraft(emptyDraft(draft.date))
    setStatusMessage(editingId ? 'Transaction updated.' : 'Transaction added.')
  }

  const handleDelete = (id: number) => {
    if (role !== 'admin') {
      return
    }

    setTransactions((current) => current.filter((transaction) => transaction.id !== id))
    setStatusMessage('Transaction removed.')

    if (editingId === id) {
      setEditingId(null)
      setDraft(emptyDraft())
    }
  }

  const startEditing = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setDraft({
      date: transaction.date,
      amount: String(transaction.amount),
      category: transaction.category,
      type: transaction.type,
      merchant: transaction.merchant,
      note: transaction.note,
    })
    setStatusMessage(`Editing ${transaction.merchant}.`)
  }

  const clearEditor = () => {
    setEditingId(null)
    setDraft(emptyDraft())
  }

  const downloadReport = (format: 'csv' | 'json') => {
    const rows = filteredTransactions.length > 0 ? filteredTransactions : transactions

    if (rows.length === 0) {
      setStatusMessage('No data available to export.')
      return
    }

    const fileName = `zorvyn-dashboard.${format}`
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'
    const payload =
      format === 'csv'
        ? [
            ['Date', 'Merchant', 'Category', 'Type', 'Amount', 'Note'],
            ...rows.map((transaction) => [transaction.date, transaction.merchant, transaction.category, transaction.type, String(transaction.amount), transaction.note]),
          ]
            .map((entry) => entry.map((field) => `"${field.replace(/"/g, '""')}"`).join(','))
            .join('\n')
        : JSON.stringify(rows, null, 2)

    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([payload], { type: mimeType }))
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
    setStatusMessage(`${format.toUpperCase()} exported.`)
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-bg dashboard-bg-one" aria-hidden="true" />
      <div className="dashboard-bg dashboard-bg-two" aria-hidden="true" />

      <header className="hero card">
        <div className="hero-copy">
          <p className="eyebrow">Finance dashboard</p>
          <h1>Read the money story at a glance.</h1>
          <p className="hero-text">Track cash flow, inspect patterns, and move between pages for overview, transactions, and insights.</p>
          <div className="hero-meta">
            <span className="pill pill-accent">{monthlySeries.length} active months</span>
            <span className="pill">Starting balance {formatCurrency(STARTING_BALANCE)}</span>
            <span className="pill">{transactions.length} transactions</span>
          </div>

          <nav className="page-nav" aria-label="Dashboard pages">
            <NavLink to="/overview" className={({ isActive }) => `page-link ${isActive ? 'active' : ''}`}>
              Overview
            </NavLink>
            <NavLink to="/transactions" className={({ isActive }) => `page-link ${isActive ? 'active' : ''}`}>
              Transactions
            </NavLink>
            <NavLink to="/insights" className={({ isActive }) => `page-link ${isActive ? 'active' : ''}`}>
              Insights
            </NavLink>
          </nav>
        </div>

        <div className="hero-actions">
          <label className="control-group">
            <span>Role</span>
            <select
              value={role}
              onChange={(event) => {
                const nextRole = event.target.value as Role
                setRole(nextRole)
                if (nextRole === 'viewer') {
                  setEditingId(null)
                  setDraft(emptyDraft())
                }
              }}
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="control-group">
            <span>Theme</span>
            <button type="button" className="toggle-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </button>
          </label>

          <div className="export-actions">
            <button type="button" className="secondary-button" onClick={() => downloadReport('csv')}>
              Export CSV
            </button>
            <button type="button" className="secondary-button" onClick={() => downloadReport('json')}>
              Export JSON
            </button>
          </div>

          <p className={`status-pill ${statusMessage ? 'visible' : ''}`}>{statusMessage || ' '}</p>
        </div>
      </header>

      <Routes>
        <Route
          path="/overview"
          element={
            <OverviewPage
              summaries={summaries}
              monthlySeries={monthlySeries}
              trendChart={trendChart}
              breakdown={breakdown}
              formatCurrency={formatCurrency}
            />
          }
        />
        <Route
          path="/transactions"
          element={
            <TransactionsPage
              role={role}
              categoryOptions={categoryOptions}
              search={search}
              setSearch={setSearch}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              filteredTransactions={filteredTransactions}
              startEditing={startEditing}
              handleDelete={handleDelete}
              draft={draft}
              setDraft={setDraft}
              handleSubmit={handleSubmit}
              editingId={editingId}
              clearEditor={clearEditor}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          }
        />
        <Route
          path="/insights"
          element={
            <InsightsPage
              summaries={summaries}
              highestSpendingCategory={highestSpendingCategory}
              monthlyComparison={monthlyComparison}
              formatCurrency={formatCurrency}
            />
          }
        />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>

      <section className="quick-stats" aria-label="Quick financial metrics">
        <article className="quick-stat card">
          <p>Net cash flow</p>
          <strong className={netFlow >= 0 ? 'positive' : 'negative'}>
            {netFlow >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netFlow))}
          </strong>
          <span>Income minus expense</span>
        </article>

        <article className="quick-stat card">
          <p>Average monthly spend</p>
          <strong>{formatCurrency(Math.round(averageMonthlyExpense))}</strong>
          <span>Across {monthlySeries.length || 0} month(s)</span>
        </article>

        <article className="quick-stat card">
          <p>Estimated runway</p>
          <strong>{monthlyRunway > 0 ? `${monthlyRunway.toFixed(1)} mo` : 'N/A'}</strong>
          <span>Based on current balance and spend</span>
        </article>
      </section>
    </div>
  )
}

function OverviewPage({
  summaries,
  monthlySeries,
  trendChart,
  breakdown,
  formatCurrency,
}: {
  summaries: { income: number; expenses: number; balance: number; savingsRate: number }
  monthlySeries: MonthlyPoint[]
  trendChart: { width: number; height: number; padding: number; path: string; points: { x: number; y: number }[] }
  breakdown: BreakdownItem[]
  formatCurrency: (value: number) => string
}) {
  return (
    <>
      <section className="summary-grid">
        <article className="card summary-card balance-card">
          <p className="card-label">Total balance</p>
          <h2>{formatCurrency(summaries.balance)}</h2>
          <p className="card-note">Current standing after all recorded income and expenses.</p>
        </article>
        <article className="card summary-card">
          <p className="card-label">Income</p>
          <h2 className="positive">{formatCurrency(summaries.income)}</h2>
          <p className="card-note">Money received this period.</p>
        </article>
        <article className="card summary-card">
          <p className="card-label">Expenses</p>
          <h2 className="negative">{formatCurrency(summaries.expenses)}</h2>
          <p className="card-note">Total outflow across tracked categories.</p>
        </article>
        <article className="card summary-card">
          <p className="card-label">Savings rate</p>
          <h2>{summaries.savingsRate.toFixed(1)}%</h2>
          <p className="card-note">Income retained after expenses.</p>
        </article>
      </section>

      <section className="content-grid single-main-grid">
        <div className="content-column">
          <section className="card chart-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Time-based trend</p>
                <h3>Balance trend</h3>
              </div>
              <span className="muted-copy">Running balance by month</span>
            </div>

            {monthlySeries.length > 0 ? (
              <div className="trend-chart-wrap">
                <svg viewBox={`0 0 ${trendChart.width} ${trendChart.height}`} className="trend-chart" role="img" aria-label="Balance trend line chart">
                  <defs>
                    <linearGradient id="trendStroke" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="var(--accent-strong)" />
                      <stop offset="100%" stopColor="var(--accent)" />
                    </linearGradient>
                    <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-strong)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="var(--accent-strong)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${trendChart.path} L ${trendChart.points[trendChart.points.length - 1]?.x ?? 0} ${trendChart.height - trendChart.padding} L ${trendChart.points[0]?.x ?? 0} ${trendChart.height - trendChart.padding} Z`}
                    fill="url(#trendFill)"
                  />
                  <path d={trendChart.path} fill="none" stroke="url(#trendStroke)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  {trendChart.points.map((point, index) => (
                    <g key={monthlySeries[index].month}>
                      <circle cx={point.x} cy={point.y} r="5" fill="var(--panel-strong)" stroke="var(--accent-strong)" strokeWidth="3" />
                    </g>
                  ))}
                </svg>

                <div className="trend-legend">
                  {monthlySeries.map((point) => (
                    <div key={point.month} className="legend-item">
                      <span>{point.label}</span>
                      <strong>{formatCurrency(point.balance)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No balance history yet" description="Add a transaction to generate the trend chart." />
            )}
          </section>

          <section className="card chart-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Categorical view</p>
                <h3>Spending breakdown</h3>
              </div>
              <span className="muted-copy">Expense share by category</span>
            </div>

            {breakdown.length > 0 ? (
              <div className="breakdown-list">
                {breakdown.map((item) => (
                  <div key={item.category} className="breakdown-row">
                    <div className="breakdown-meta">
                      <span>{item.category}</span>
                      <strong>{formatCurrency(item.amount)}</strong>
                    </div>
                    <div className="progress-track">
                      <span className="progress-fill" style={{ width: `${Math.max(item.percentage, 8)}%` }} />
                    </div>
                    <span className="breakdown-percentage">{item.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No expense data" description="Expenses will appear here once they are added." />
            )}
          </section>
        </div>
      </section>
    </>
  )
}

function TransactionsPage({
  role,
  categoryOptions,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  filteredTransactions,
  startEditing,
  handleDelete,
  draft,
  setDraft,
  handleSubmit,
  editingId,
  clearEditor,
  formatDate,
  formatCurrency,
}: {
  role: Role
  categoryOptions: string[]
  search: string
  setSearch: React.Dispatch<React.SetStateAction<string>>
  typeFilter: 'all' | TransactionType
  setTypeFilter: React.Dispatch<React.SetStateAction<'all' | TransactionType>>
  categoryFilter: string
  setCategoryFilter: React.Dispatch<React.SetStateAction<string>>
  sortBy: SortOption
  setSortBy: React.Dispatch<React.SetStateAction<SortOption>>
  filteredTransactions: Transaction[]
  startEditing: (transaction: Transaction) => void
  handleDelete: (id: number) => void
  draft: DraftTransaction
  setDraft: React.Dispatch<React.SetStateAction<DraftTransaction>>
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  editingId: number | null
  clearEditor: () => void
  formatDate: (value: string) => string
  formatCurrency: (value: number) => string
}) {
  return (
    <section className="content-grid">
      <div className="content-column">
        <section className="card transactions-card">
          <div className="section-heading transactions-heading">
            <div>
              <p className="eyebrow">Activity feed</p>
              <h3>Transactions</h3>
            </div>
            <span className="muted-copy">Search, filter, and sort records</span>
          </div>

          <div className="filters-grid">
            <label className="field field-wide">
              <span>Search</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Merchant, category, or note" />
            </label>

            <label className="field">
              <span>Type</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | TransactionType)}>
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>

            <label className="field">
              <span>Category</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All categories' : category}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Amount high to low</option>
                <option value="amount-asc">Amount low to high</option>
                <option value="category-asc">Category A to Z</option>
              </select>
            </label>
          </div>

          <div className="table-card">
            <div className="table-header table-row">
              <span>Date</span>
              <span>Merchant</span>
              <span>Category</span>
              <span>Type</span>
              <span className="amount-column">Amount</span>
              {role === 'admin' && <span className="actions-column">Actions</span>}
            </div>

            <div className="table-body">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <article key={transaction.id} className="table-row transaction-row">
                    <span className="date-cell">{formatDate(transaction.date)}</span>
                    <div className="merchant-cell">
                      <strong>{transaction.merchant}</strong>
                      <span>{transaction.note}</span>
                    </div>
                    <span className="category-chip">{transaction.category}</span>
                    <span className={`type-chip ${transaction.type}`}>{transaction.type}</span>
                    <strong className={`amount-cell ${transaction.type}`}>
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </strong>
                    {role === 'admin' ? (
                      <div className="row-actions">
                        <button type="button" className="text-button" onClick={() => startEditing(transaction)}>
                          Edit
                        </button>
                        <button type="button" className="text-button danger" onClick={() => handleDelete(transaction.id)}>
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="row-lock">Read only</span>
                    )}
                  </article>
                ))
              ) : (
                <EmptyState title="No transactions match the current filters" description="Adjust your search or filter settings." />
              )}
            </div>
          </div>
        </section>
      </div>

      <aside className="sidebar-column">
        <section className="card editor-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Admin tools</p>
              <h3>{editingId ? 'Edit transaction' : 'Add transaction'}</h3>
            </div>
            <span className={`role-badge ${role}`}>{role}</span>
          </div>

          {role === 'admin' ? (
            <form className="editor-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Date</span>
                <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
              </label>

              <div className="two-up">
                <label className="field">
                  <span>Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.amount}
                    onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="0"
                  />
                </label>

                <label className="field">
                  <span>Type</span>
                  <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as TransactionType }))}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Merchant</span>
                <input type="text" value={draft.merchant} onChange={(event) => setDraft((current) => ({ ...current, merchant: event.target.value }))} placeholder="Merchant or source" />
              </label>

              <label className="field">
                <span>Category</span>
                <input type="text" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Housing, Salary, Dining..." />
              </label>

              <label className="field">
                <span>Note</span>
                <textarea rows={4} value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Optional memo" />
              </label>

              <div className="editor-actions">
                <button type="submit" className="primary-button">
                  {editingId ? 'Save changes' : 'Add transaction'}
                </button>
                <button type="button" className="secondary-button" onClick={clearEditor}>
                  Clear
                </button>
              </div>
            </form>
          ) : (
            <EmptyState title="Viewer mode is read only" description="Switch role to Admin to add, edit, or delete transactions." />
          )}
        </section>
      </aside>
    </section>
  )
}

function InsightsPage({
  summaries,
  highestSpendingCategory,
  monthlyComparison,
  formatCurrency,
}: {
  summaries: { income: number; expenses: number; balance: number; savingsRate: number }
  highestSpendingCategory?: BreakdownItem
  monthlyComparison: {
    currentLabel: string
    previousLabel: string
    currentExpense: number
    previousExpense: number
    change: number
    percentage: number
  } | null
  formatCurrency: (value: number) => string
}) {
  return (
    <section className="content-grid single-main-grid">
      <div className="content-column">
        <section className="card insights-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Insights</p>
              <h3>What stands out</h3>
            </div>
            <span className="muted-copy">Auto-derived from the data</span>
          </div>

          <div className="insight-stack">
            <InsightCard
              title="Highest spending category"
              value={highestSpendingCategory ? highestSpendingCategory.category : 'None yet'}
              detail={highestSpendingCategory ? `${formatCurrency(highestSpendingCategory.amount)} (${highestSpendingCategory.percentage.toFixed(0)}% of spending)` : 'No expenses recorded.'}
            />

            <InsightCard
              title="Monthly comparison"
              value={monthlyComparison ? `${monthlyComparison.change >= 0 ? '+' : '-'}${formatCurrency(Math.abs(monthlyComparison.change))}` : 'Not enough data'}
              detail={
                monthlyComparison
                  ? `${monthlyComparison.currentLabel} spending vs ${monthlyComparison.previousLabel} spending, ${monthlyComparison.percentage >= 0 ? '+' : ''}${monthlyComparison.percentage.toFixed(1)}%`
                  : 'Need at least two months of activity.'
              }
            />

            <InsightCard
              title="Cash flow observation"
              value={summaries.savingsRate >= 35 ? 'Healthy runway' : 'Watch expenses'}
              detail={summaries.savingsRate >= 35 ? 'The data shows strong savings relative to income.' : 'Spending is taking a larger share of income than ideal.'}
            />
          </div>
        </section>
      </div>
    </section>
  )
}

function InsightCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="insight-card">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  )
}

export default App
