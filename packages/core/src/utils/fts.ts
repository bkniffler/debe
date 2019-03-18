const fields = [
  ['type', 1000],
  ['normalized', 1000],
  ['name', 500],
  ['fullName', 10]
];

/*

# CREATE TABLE
      CREATE VIRTUAL TABLE "fts" USING FTS5(id UNINDEXED, code UNINDEXED, type, normalized, name, fullName, terminal UNINDEXED);

# SEARCH
      SELECT *, highlight(fts, 5, '<b>', '</b>') highlight
      FROM fts 
      WHERE fts MATCH ? 
      AND rank MATCH 'bm25(1000.0, 1000.0, 1000.0, 1000.0, 500.0, 10.0, 1.0)' 
      ORDER BY rank
      LIMIT 100;

# COUNT
      SELECT type
      FROM fts 
      WHERE fts MATCH ? 
      AND rank MATCH 'bm25(1000.0, 1000.0, 1000.0, 1000.0, 500.0, 10.0, 1.0)' 
      ORDER BY rank
      LIMIT 9999;
*/
