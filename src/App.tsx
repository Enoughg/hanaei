import React, { useState, useEffect } from 'react';
import {
  Worker,
  WorkRecord,
  FinancialAdjustment,
  Payment,
  AppSettings,
  ViewTab,
} from './types';
import {
  loadWorkers,
  saveWorkers,
  loadWorkRecords,
  saveWorkRecords,
  loadAdjustments,
  saveAdjustments,
  loadPayments,
  savePayments,
  loadSettings,
  saveSettings,
  loadSavedPeriod,
  saveSavedPeriod,
  isUserAuthenticated,
  setUserAuthenticated,
} from './services/storage';
import { getCurrentJalaliDate } from './utils/jalali';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AttendanceMatrixView } from './components/AttendanceMatrixView';
import { WorkersView } from './components/WorkersView';
import { PaymentsView } from './components/PaymentsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { WorkerPortalModal } from './components/WorkerPortalModal';
import { DailyWorkModal } from './components/DailyWorkModal';

export default function App() {
  const currentDate = getCurrentJalaliDate();

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Navigation & Persistent Period State
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const initialPeriod = loadSavedPeriod(settings.defaultYear, settings.defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(initialPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialPeriod.month);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    isUserAuthenticated(settings.authConfig)
  );

  // Core Data Collections
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([]);
  const [adjustments, setAdjustments] = useState<FinancialAdjustment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Modal States
  const [activePortalWorker, setActivePortalWorker] = useState<Worker | null>(null);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  // Daily Work Modal from within Portal or shortcuts
  const [dailyWorkTarget, setDailyWorkTarget] = useState<{
    worker: Worker;
    day: number;
    year: number;
    month: number;
  } | null>(null);

  // Load all initial data on mount
  useEffect(() => {
    setWorkers(loadWorkers());
    setWorkRecords(loadWorkRecords());
    setAdjustments(loadAdjustments());
    setPayments(loadPayments());
  }, []);

  // Sync auth state if settings change
  useEffect(() => {
    setIsAuthenticated(isUserAuthenticated(settings.authConfig));
  }, [settings.authConfig?.isEnabled]);

  // Persistent Period setters
  const handleSetYear = (year: number) => {
    setSelectedYear(year);
    saveSavedPeriod(year, selectedMonth);
  };

  const handleSetMonth = (month: number) => {
    setSelectedMonth(month);
    saveSavedPeriod(selectedYear, month);
  };

  // Reload handler (e.g. after backup restore or reset)
  const handleReloadAllData = () => {
    setWorkers(loadWorkers());
    setWorkRecords(loadWorkRecords());
    setAdjustments(loadAdjustments());
    setPayments(loadPayments());
    const freshSettings = loadSettings();
    setSettings(freshSettings);
    setIsAuthenticated(isUserAuthenticated(freshSettings.authConfig));
  };

  // Auth Handlers
  const handleLoginSuccess = () => {
    setUserAuthenticated(true);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUserAuthenticated(false);
    setIsAuthenticated(false);
  };

  // --- Worker Handlers ---
  const handleSaveWorker = (worker: Worker) => {
    const exists = workers.some((w) => w.id === worker.id);
    let updated: Worker[];
    if (exists) {
      updated = workers.map((w) => (w.id === worker.id ? worker : w));
    } else {
      updated = [worker, ...workers];
    }
    setWorkers(updated);
    saveWorkers(updated);

    // Also update activePortalWorker if open
    if (activePortalWorker && activePortalWorker.id === worker.id) {
      setActivePortalWorker(worker);
    }
  };

  const handleDeleteWorker = (workerId: string) => {
    const updatedWorkers = workers.filter((w) => w.id !== workerId);
    setWorkers(updatedWorkers);
    saveWorkers(updatedWorkers);

    // Clean up orphaned records
    const updatedRecords = workRecords.filter((r) => r.workerId !== workerId);
    setWorkRecords(updatedRecords);
    saveWorkRecords(updatedRecords);

    const updatedAdjs = adjustments.filter((a) => a.workerId !== workerId);
    setAdjustments(updatedAdjs);
    saveAdjustments(updatedAdjs);

    const updatedPays = payments.filter((p) => p.workerId !== workerId);
    setPayments(updatedPays);
    savePayments(updatedPays);

    if (activePortalWorker?.id === workerId) {
      setActivePortalWorker(null);
    }
  };

  // --- Daily Work & Adjustments Handler ---
  const handleSaveDailyWork = (record: WorkRecord, dayAdjustments: FinancialAdjustment[]) => {
    // 1. Update/Add Work Record
    const otherRecords = workRecords.filter(
      (r) =>
        !(
          r.workerId === record.workerId &&
          r.year === record.year &&
          r.month === record.month &&
          r.day === record.day
        )
    );
    const updatedRecords = [...otherRecords, record];
    setWorkRecords(updatedRecords);
    saveWorkRecords(updatedRecords);

    // 2. Replace Adjustments for this specific day
    const otherAdjs = adjustments.filter(
      (a) =>
        !(
          a.workerId === record.workerId &&
          a.year === record.year &&
          a.month === record.month &&
          a.day === record.day
        )
    );
    const updatedAdjs = [...otherAdjs, ...dayAdjustments];
    setAdjustments(updatedAdjs);
    saveAdjustments(updatedAdjs);
  };

  // --- Delete Daily Work Record Handler ---
  const handleDeleteDailyWork = (
    workerId: string,
    year: number,
    month: number,
    day: number
  ) => {
    // 1. Remove Work Record
    const updatedRecords = workRecords.filter(
      (r) => !(r.workerId === workerId && r.year === year && r.month === month && r.day === day)
    );
    setWorkRecords(updatedRecords);
    saveWorkRecords(updatedRecords);

    // 2. Remove Adjustments for this specific day
    const updatedAdjs = adjustments.filter(
      (a) => !(a.workerId === workerId && a.year === year && a.month === month && a.day === day)
    );
    setAdjustments(updatedAdjs);
    saveAdjustments(updatedAdjs);
  };

  // --- Batch Save Work Records ---
  const handleBatchSaveRecords = (newRecords: WorkRecord[]) => {
    const updatedMap = new Map<string, WorkRecord>();
    workRecords.forEach((r) => {
      updatedMap.set(`${r.workerId}-${r.year}-${r.month}-${r.day}`, r);
    });

    newRecords.forEach((r) => {
      updatedMap.set(`${r.workerId}-${r.year}-${r.month}-${r.day}`, r);
    });

    const updated = Array.from(updatedMap.values());
    setWorkRecords(updated);
    saveWorkRecords(updated);
  };

  // --- Batch Delete Work Records Handler ---
  const handleBatchDeleteRecords = (
    itemsToDelete: { workerId: string; year: number; month: number; day: number }[]
  ) => {
    const toDeleteSet = new Set(
      itemsToDelete.map((i) => `${i.workerId}-${i.year}-${i.month}-${i.day}`)
    );

    const updatedRecords = workRecords.filter(
      (r) => !toDeleteSet.has(`${r.workerId}-${r.year}-${r.month}-${r.day}`)
    );
    setWorkRecords(updatedRecords);
    saveWorkRecords(updatedRecords);

    const updatedAdjs = adjustments.filter(
      (a) => !toDeleteSet.has(`${a.workerId}-${a.year}-${a.month}-${a.day}`)
    );
    setAdjustments(updatedAdjs);
    saveAdjustments(updatedAdjs);
  };

  // --- Standalone Adjustment Handlers ---
  const handleSaveAdjustment = (adj: FinancialAdjustment) => {
    const exists = adjustments.some((a) => a.id === adj.id);
    const updated = exists
      ? adjustments.map((a) => (a.id === adj.id ? adj : a))
      : [adj, ...adjustments];
    setAdjustments(updated);
    saveAdjustments(updated);
  };

  const handleDeleteAdjustment = (id: string) => {
    const updated = adjustments.filter((a) => a.id !== id);
    setAdjustments(updated);
    saveAdjustments(updated);
  };

  // --- Payment Handlers ---
  const handleSavePayment = (payment: Payment) => {
    const exists = payments.some((p) => p.id === payment.id);
    const updated = exists
      ? payments.map((p) => (p.id === payment.id ? payment : p))
      : [payment, ...payments];
    setPayments(updated);
    savePayments(updated);
  };

  const handleDeletePayment = (id: string) => {
    if (window.confirm('آیا از حذف این رکورد پرداخت اطمینان دارید؟')) {
      const updated = payments.filter((p) => p.id !== id);
      setPayments(updated);
      savePayments(updated);
    }
  };

  // --- Settings Handler ---
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // If Auth is enabled and user is not authenticated, show Login view
  if (settings.authConfig?.isEnabled && !isAuthenticated) {
    return (
      <LoginView
        settings={settings}
        authConfig={settings.authConfig}
        workshopName={settings.workshopName}
        managerName={settings.managerName}
        onLoginSuccess={handleLoginSuccess}
        onSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div
      className="flex h-screen bg-[#F8FAFC] text-[#1E293B] font-sans antialiased overflow-hidden select-none"
      dir="rtl"
    >
      {/* Permanent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        workersCount={workers.length}
        activeWorkersCount={workers.filter((w) => w.isActive).length}
        settings={settings}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Universal Header with Period Selector & Quick Actions */}
        <Header
          selectedYear={selectedYear}
          setSelectedYear={handleSetYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={handleSetMonth}
          todayJalali={currentDate}
          settings={settings}
          onOpenAddWorker={() => {
            setActiveTab('workers');
            setIsAddWorkerOpen(true);
          }}
          onOpenAddPayment={() => {
            setActiveTab('payments');
            setIsAddPaymentOpen(true);
          }}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
          {activeTab === 'dashboard' && (
            <DashboardView
              workers={workers}
              workRecords={workRecords}
              adjustments={adjustments}
              payments={payments}
              settings={settings}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onNavigate={setActiveTab}
              onOpenWorkerPortal={(worker) => setActivePortalWorker(worker)}
              onOpenAddWorker={() => {
                setActiveTab('workers');
                setIsAddWorkerOpen(true);
              }}
              onOpenAddPayment={() => {
                setActiveTab('payments');
                setIsAddPaymentOpen(true);
              }}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceMatrixView
              workers={workers}
              workRecords={workRecords}
              adjustments={adjustments}
              payments={payments}
              settings={settings}
              selectedYear={selectedYear}
              setSelectedYear={handleSetYear}
              selectedMonth={selectedMonth}
              setSelectedMonth={handleSetMonth}
              onSaveDailyWork={handleSaveDailyWork}
              onDeleteDailyWork={handleDeleteDailyWork}
              onBatchSaveRecords={handleBatchSaveRecords}
              onBatchDeleteRecords={handleBatchDeleteRecords}
              onOpenWorkerPortal={(worker) => setActivePortalWorker(worker)}
            />
          )}

          {activeTab === 'workers' && (
            <WorkersView
              workers={workers}
              workRecords={workRecords}
              adjustments={adjustments}
              payments={payments}
              settings={settings}
              onSaveWorker={handleSaveWorker}
              onDeleteWorker={handleDeleteWorker}
              onOpenWorkerPortal={(worker) => setActivePortalWorker(worker)}
              isAddModalOpen={isAddWorkerOpen}
              setIsAddModalOpen={setIsAddWorkerOpen}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              workers={workers}
              payments={payments}
              settings={settings}
              onSavePayment={handleSavePayment}
              onDeletePayment={handleDeletePayment}
              isAddPaymentOpen={isAddPaymentOpen}
              setIsAddPaymentOpen={setIsAddPaymentOpen}
            />
          )}

          {(activeTab === 'reports' || activeTab === 'excel') && (
            <ReportsView
              workers={workers}
              workRecords={workRecords}
              adjustments={adjustments}
              payments={payments}
              settings={settings}
              selectedYear={selectedYear}
              setSelectedYear={handleSetYear}
              selectedMonth={selectedMonth}
              setSelectedMonth={handleSetMonth}
              onOpenWorkerPortal={(worker) => setActivePortalWorker(worker)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onReloadAllData={handleReloadAllData}
            />
          )}
        </main>
      </div>

      {/* Worker Portal Modal (کارتابل اختصاصی کارگر) */}
      {activePortalWorker && (
        <WorkerPortalModal
          worker={activePortalWorker}
          workRecords={workRecords}
          adjustments={adjustments}
          payments={payments}
          settings={settings}
          onClose={() => setActivePortalWorker(null)}
          onSaveAdjustment={handleSaveAdjustment}
          onDeleteAdjustment={handleDeleteAdjustment}
          onSavePayment={handleSavePayment}
          onDeletePayment={handleDeletePayment}
          onOpenDailyWork={(worker, dayNumber, dateStr) => {
            const [y, m] = dateStr.split('/').map(Number);
            setDailyWorkTarget({
              worker,
              day: dayNumber,
              year: y || selectedYear,
              month: m || selectedMonth,
            });
          }}
        />
      )}

      {/* Daily Work Modal when invoked from Portal */}
      {dailyWorkTarget && (
        <DailyWorkModal
          worker={dailyWorkTarget.worker}
          dayNumber={dailyWorkTarget.day}
          year={dailyWorkTarget.year}
          month={dailyWorkTarget.month}
          existingRecord={workRecords.find(
            (r) =>
              r.workerId === dailyWorkTarget.worker.id &&
              r.year === dailyWorkTarget.year &&
              r.month === dailyWorkTarget.month &&
              r.day === dailyWorkTarget.day
          )}
          existingAdjustments={adjustments.filter(
            (a) =>
              a.workerId === dailyWorkTarget.worker.id &&
              a.year === dailyWorkTarget.year &&
              a.month === dailyWorkTarget.month &&
              a.day === dailyWorkTarget.day
          )}
          settings={settings}
          onSave={(rec, dayAdjs) => {
            handleSaveDailyWork(rec, dayAdjs);
            setDailyWorkTarget(null);
          }}
          onClose={() => setDailyWorkTarget(null)}
        />
      )}
    </div>
  );
}
