import { importCustomers, importBookings } from './actions';

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ error?: string; done?: string }> }) {
  const sp = await searchParams;
  return (<><header className="top"><h1>Import from Sheet edition</h1></header>
    <div className="content">
      {sp.error && <div className="err" style={{ marginBottom: 12 }}>{sp.error}</div>}
      {sp.done && <div className="okmsg" style={{ marginBottom: 12 }}>{sp.done}</div>}
      <div className="card" style={{ marginBottom: 16 }}><h3>How</h3><ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
        <li>Open your <b>AGS Services Master</b> Google Sheet.</li>
        <li>Click the <b>Customers</b> tab › <b>File › Download › Comma-separated values (.csv)</b>. Do the same for the <b>Bookings</b> tab.</li>
        <li>Import <b>customers first</b>, then bookings. Running an import twice is safe: people and booking numbers already in the CRM are skipped.</li>
        <li>Delete the CSV files from your computer afterwards: they contain customers' personal details.</li></ol></div>
      <div className="grid2">
        <form action={importCustomers} className="card form"><h3>1. Customers</h3><p className="small muted">Name, family, mobile, date of birth, address. Aadhaar / PAN numbers are checked and saved encrypted (last 4 digits shown).</p>
          <input type="file" name="file" accept=".csv,text/csv" required /><div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn primary">Import customers</button></div></form>
        <form action={importBookings} className="card form"><h3>2. Bookings</h3><p className="small muted">Keeps the same booking numbers (TTD-2611-0001…), status becomes the matching step, money received and refunds become payments on the original dates.</p>
          <input type="file" name="file" accept=".csv,text/csv" required /><div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn primary">Import bookings</button></div></form>
      </div>
    </div></>);
}
