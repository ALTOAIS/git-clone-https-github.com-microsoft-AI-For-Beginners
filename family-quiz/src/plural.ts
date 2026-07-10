/** Русское склонение слова «балл»: 1 балл, 2 балла, 5 баллов. */
export function pointsWord(n: number): string {
  const abs = Math.abs(n);
  if (abs % 10 === 1 && abs % 100 !== 11) return 'балл';
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return 'балла';
  return 'баллов';
}
