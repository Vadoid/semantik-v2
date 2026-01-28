import { describe, it, expect, vi } from 'vitest';
import { generateSqlFromSemanticLayer } from '../generate-sql-from-semantic-layer';

describe('generateSqlFromSemanticLayer', () => {
  it('should generate placeholder if no tables provided', async () => {
    const result = await generateSqlFromSemanticLayer({
      viewName: 'test_view',
      tables: [],
      relationships: [],
      selectedFields: {},
      projectId: 'test-project',
    });

    expect(result.sqlQuery).toContain('SELECT 1');
  });

  it('should generate simple select from single table', async () => {
    const result = await generateSqlFromSemanticLayer({
      viewName: 'test_view',
      tables: [
        { id: 'p.d.t1', name: 't1', schema: [], description: '', location: '' },
      ],
      relationships: [],
      selectedFields: {
        'p.d.t1': ['col1'],
      },
      projectId: 'test-project',
    });

    expect(result.sqlQuery).toContain('SELECT');
    expect(result.sqlQuery).toContain('t1_col1');
    expect(result.sqlQuery).toContain('FROM');
    expect(result.sqlQuery).toContain('`p.d.t1`');
  });

  it('should generate joins correctly', async () => {
     // This tests the logic of graph traversal and join construction
     const result = await generateSqlFromSemanticLayer({
      viewName: 'test_view',
      tables: [
        { id: 'p.d.users', name: 'users', schema: [], description: '', location: '' },
        { id: 'p.d.orders', name: 'orders', schema: [], description: '', location: '' },
      ],
      relationships: [
        {
            id: 'rel1',
            fromTable: 'p.d.orders',
            fromField: 'user_id',
            toTable: 'p.d.users',
            toField: 'id',
            cardinality: 'many-to-one',
        }
      ],
      selectedFields: {
        'p.d.users': ['email'],
        'p.d.orders': ['id'],
      },
      projectId: 'test-project',
    });

    expect(result.sqlQuery).toContain('LEFT JOIN `p.d.users`');
    expect(result.sqlQuery).toContain('ON');
  });
});
