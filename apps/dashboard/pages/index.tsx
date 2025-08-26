export default function DashboardHome() {
  return (
    <main style={{maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "ui-sans-serif, system-ui"}}>
      <h1 style={{fontSize: 28, marginBottom: 12}}>Lynkby — Dashboard</h1>
      <p style={{opacity: 0.8}}>Sign up, create your page, and manage links.</p>
      <div style={{marginTop: 16, display: "flex", gap: 12}}>
        <button style={{padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb"}}>Sign up</button>
        <button style={{padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb"}}>Log in</button>
      </div>
    </main>
  );
}
