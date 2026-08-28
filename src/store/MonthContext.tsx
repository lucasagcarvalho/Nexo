import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { currentMonthKey, addMonths, compareMonths } from '@/lib/format';

interface MonthContextValue {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToCurrent: () => void;
  isCurrentMonth: boolean;
}

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => currentMonthKey());

  const setSelectedMonth = useCallback((month: string) => {
    setSelectedMonthState(month);
  }, []);

  const goToPrevious = useCallback(() => {
    setSelectedMonthState((prev) => addMonths(prev, -1));
  }, []);

  const goToNext = useCallback(() => {
    setSelectedMonthState((prev) => addMonths(prev, 1));
  }, []);

  const goToCurrent = useCallback(() => {
    setSelectedMonthState(currentMonthKey());
  }, []);

  const isCurrentMonth = compareMonths(selectedMonth, currentMonthKey()) === 0;

  return (
    <MonthContext.Provider value={{ selectedMonth, setSelectedMonth, goToPrevious, goToNext, goToCurrent, isCurrentMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth(): MonthContextValue {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth must be used within MonthProvider');
  return ctx;
}
