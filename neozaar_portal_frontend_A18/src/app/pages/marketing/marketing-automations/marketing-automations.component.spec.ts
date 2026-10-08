import { validateWorkflow } from './marketing-automations.component';

describe('Marketing automation workflow validation', () => {
  it('accepts a valid linear trigger and action journey', () => {
    const definition = {
      start: 'trigger',
      nodes: [
        { id: 'trigger', type: 'trigger', next: 'email' },
        { id: 'email', type: 'send_email', next: null },
      ],
    };
    expect(validateWorkflow(definition)).toEqual([]);
  });

  it('requires both decision paths to be connected', () => {
    const definition = {
      start: 'trigger',
      nodes: [
        { id: 'trigger', type: 'trigger', next: 'decision' },
        { id: 'decision', type: 'condition', label: 'Qualified?', onTrue: 'crm', onFalse: null },
        { id: 'crm', type: 'crm_handoff', next: null },
      ],
    };
    expect(validateWorkflow(definition)).toContain('Qualified? requires YES and NO connections.');
  });

  it('detects duplicate/missing triggers and broken connections', () => {
    const definition = { start: 'missing', nodes: [{ id: 'email', type: 'send_email', next: 'unknown' }] };
    const errors = validateWorkflow(definition);
    expect(errors).toContain('Start node is missing.');
    expect(errors).toContain('Workflow requires exactly one trigger.');
    expect(errors).toContain('email has a broken connection.');
  });
});
