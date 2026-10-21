import { createField } from './field/controller';
export interface Field {
  setChapter(id: string): void;
  measure(): void;
}

export function startField(): Field {
  return createField();
}
