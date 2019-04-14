function chunk(list: any[], chunkSize = 10000) {
  return new Array(Math.ceil(list.length / chunkSize))
    .fill(0)
    .map((_: any, i: number) =>
      list.slice(i * chunkSize, i * chunkSize + chunkSize)
    );
}
export async function chunkWork<T, TResult = T>(
  items: T[],
  max = [250000, 10000],
  work: (items: T[]) => Promise<TResult[]>
): Promise<TResult[]> {
  return chunkSequencial(items, max[0], items =>
    chunkParallel(items, max[1], work)
  );
}
export async function chunkSequencial<T, TResult = T>(
  items: T[],
  max = 1000,
  work: (items: T[]) => Promise<TResult[]>
): Promise<TResult[]> {
  let results: TResult[] = [];
  await chunk(items, max).reduce(
    (state, items) =>
      state.then(() =>
        work(items).then(result => (results = results.concat(result)))
      ),
    Promise.resolve()
  );
  return results;
}
export async function chunkParallel<T, TResult = T>(
  items: T[],
  max = 1000,
  work: (items: T[]) => Promise<TResult[]>
): Promise<TResult[]> {
  let results: TResult[] = [];
  const resultSet = await Promise.all(
    chunk(items, max).map(items => work(items))
  );
  resultSet.forEach(result => (results = results.concat(result)));
  return results;
}
