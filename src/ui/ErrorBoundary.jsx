import { Component } from 'react';

/** Catches render errors in the 3D view (e.g. a lost WebGL context) and offers a reload. */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('Dominoi crashed:', error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <Fallback title="Something went wrong" body="The 3D view stopped unexpectedly. Your arrangement is saved — reload to pick up where you left off." reload />;
  }
}

export function Fallback({ title, body, reload }) {
  return (
    <div className="fallback">
      <div className="fallback-card">
        <h1>{title}</h1>
        <p>{body}</p>
        {reload && <button className="pill primary" onClick={() => window.location.reload()}>Reload</button>}
      </div>
    </div>
  );
}
