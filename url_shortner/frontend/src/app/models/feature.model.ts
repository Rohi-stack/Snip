export interface Feature {
  id: string;
  iconType: string;
  title: string;
  description: string;
  isPremium?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}
