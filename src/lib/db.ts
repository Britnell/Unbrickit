import { datestr } from './helper.js';

const DB_NAME = 'HabitsDB';
const DB_VERSION = 1;
const HABIT_LOGS_STORE = 'habitLogs';

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  value: number;
}

let dbInstance: IDBDatabase | null = null;

export async function initializeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.log(request.error?.message);
      reject(null);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(HABIT_LOGS_STORE)) {
        const logsStore = db.createObjectStore(HABIT_LOGS_STORE, {
          keyPath: 'id',
        });

        logsStore.createIndex('habitId', 'habitId', { unique: false });
        logsStore.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

export async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
    return await initializeDB();
  }
  return dbInstance;
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function getHabitLogsForDate(date: string): Promise<HabitLog[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HABIT_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(HABIT_LOGS_STORE);
    const index = store.index('date');

    const request = index.getAll(date);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error('Error retrieving habit logs for date:', date, request.error);
      reject(request.error);
    };
  });
}

export async function getHabitLogsForDateRange(startDate: string, endDate: string): Promise<HabitLog[]> {
  const allLogs: HabitLog[] = [];

  const dates = generateDateRange(startDate, endDate);

  for (const date of dates) {
    try {
      const logsForDate = await getHabitLogsForDate(date);
      allLogs.push(...logsForDate);
    } catch (error) {
      console.error(`Error retrieving logs for date ${date}:`, error);
    }
  }

  allLogs.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return 0;
  });

  return allLogs;
}

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD format.');
  }

  if (start > end) {
    throw new Error('Start date must be before or equal to end date.');
  }

  const current = new Date(start);

  while (current <= end) {
    dates.push(datestr(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export async function upsertHabitLog(habitId: string, date: string, value: number): Promise<HabitLog> {
  const db = await getDB();

  const id = `${habitId}_${date}`;

  const habitLog: HabitLog = {
    id,
    habitId,
    date,
    value,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HABIT_LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(HABIT_LOGS_STORE);

    const request = store.put(habitLog);

    request.onsuccess = () => {
      console.log(`Habit log upserted for habit ${habitId} on ${date} with value ${value}`);
      resolve(habitLog);
    };

    request.onerror = () => {
      console.error('Error upserting habit log:', request.error);
      reject(request.error);
    };

    transaction.onerror = () => {
      console.error('Transaction error:', transaction.error);
      reject(transaction.error);
    };
  });
}
