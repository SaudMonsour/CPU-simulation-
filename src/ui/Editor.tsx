import { useSim } from '../state/store';

export function Editor() {
  const source = useSim((s) => s.source);
  const error = useSim((s) => s.error);
  const setSource = useSim((s) => s.setSource);

  return (
    <div className="editor">
      <div className="panel-title">Program</div>
      <textarea
        className="code"
        spellCheck={false}
        value={source}
        onChange={(e) => setSource(e.target.value)}
      />
      {error && <div className="error mono">{error}</div>}
    </div>
  );
}
