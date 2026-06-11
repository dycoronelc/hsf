/** Normaliza skip/take de query strings para TypeORM (exige números, no strings vacíos). */
export function parsePagination(
  skip?: unknown,
  limit?: unknown,
  defaultLimit = 100,
  maxLimit = 200,
): { skip: number; take: number } {
  const parsedSkip = Math.max(0, parseInt(String(skip ?? '0'), 10) || 0);
  const parsedLimit = Math.min(
    Math.max(1, parseInt(String(limit ?? defaultLimit), 10) || defaultLimit),
    maxLimit,
  );
  return { skip: parsedSkip, take: parsedLimit };
}
