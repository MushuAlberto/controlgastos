export interface Expense {
  id?: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  userId: string;
  createdAt: string;
}

export interface Goal {
  id?: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  userId: string;
  createdAt: string;
}

export type Category = 'Comida' | 'Transporte' | 'Vivienda' | 'Entretenimiento' | 'Salud' | 'Otros';

export const CATEGORIES: Category[] = ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Otros'];
