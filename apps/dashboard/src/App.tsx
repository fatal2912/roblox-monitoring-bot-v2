import { useEffect, useState } from "react";
import { Activity, Bell, Bot, Gamepad2, Users, ShieldAlert, RefreshCw, Database, LockKeyhole } from "lucide-react";
import { supabase } from "./lib/supabase";

type EventRow = { id: string; event_type: string; source_type: string; source_id: string; title: string; summary: string; occurred_at: string };
const icons: Record<string, any> = { group: Users, user: Activity, game: Gamepad2, system: ShieldAlert };

export default function App() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");\n  const [session, setSession] = useState<any>(null);\n  const [email, setEmail] = useState("");\n  const [password, setPassword] = useState("");\n  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setAuthBusy(true); setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message); else setSession(data.session);
    setAuthBusy(false);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setEvents([]);
  }

  async function load() {
    if (!supabase) { setError("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect this dashboard."); setLoading(false); return; }\n    if (!session) { setLoading(false); return; }
    setLoading(true); setError("");
    const query = supabase.from("monitor_events").select("id,event_type,source_type,source_id,title,summary,occurred_at").order("occurred_at", {ascending:false}).limit(100);
    const { data, error } = await query;
    if (error) setError(error.message); else setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  }
  useEffect(() => { if (session) void load(); }, [session]);
  const visible = events.filter(e => filter === "all" || e.source_type === filter);
  const counts = {
    total: events.length,
    groups: events.filter(e => e.source_type === "group").length,
    users: events.filter(e => e.source_type === "user").length,
    games: events.filter(e => e.source_type === "game").length
  };
  if (supabase && !session) return <main className="authShell"><form className="authCard" onSubmit={signIn}><div className="brandIcon"><LockKeyhole/></div><div className="eyebrow">SECURE ADMIN ACCESS</div><h1>Sign <em>in</em></h1><p>Use the Supabase Auth account added to the bot_admins allowlist.</p><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error && <div className="notice">{error}</div>}<button className="signIn" disabled={authBusy}>{authBusy ? "Signing in…" : "Sign in to dashboard"}</button></form></main>;
  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="brandIcon"><Bot/></div><div><strong>ROBLOX MONITOR</strong><span>CONTROL CENTER / V2</span></div></div><div className="topActions"><span>{session?.user?.email ?? "Not connected"}</span><button className="refresh" onClick={() => void load()}><RefreshCw size={16}/> Refresh</button><button className="refresh" onClick={() => void signOut()}>Sign out</button></div></header>
    <section className="hero"><div><div className="eyebrow"><span className="pulse"/> MONITORING SYSTEM</div><h1>Command <em>Center</em></h1><p>Roblox group, player, and experience intelligence.</p></div><div className="heroBadge"><Activity/><span>EVENT FEED</span></div></section>
    <section className="stats">
      <Stat icon={<Database/>} label="Events loaded" value={counts.total}/>
      <Stat icon={<Users/>} label="Group events" value={counts.groups}/>
      <Stat icon={<Activity/>} label="Player events" value={counts.users}/>
      <Stat icon={<Gamepad2/>} label="Game events" value={counts.games}/>
    </section>
    <section className="panel">
      <div className="panelHead"><div><div className="eyebrow">LIVE INTELLIGENCE</div><h2>Recent activity</h2></div><div className="filters">{["all","group","user","game","system"].map(v=><button className={filter===v?"active":""} key={v} onClick={()=>setFilter(v)}>{v}</button>)}</div></div>
      {error && <div className="notice"><ShieldAlert size={18}/><span>{error}</span></div>}
      {loading ? <div className="empty">Loading monitoring events…</div> : visible.length === 0 ? <div className="empty"><Bell size={24}/><strong>No events yet</strong><span>Events will appear here after the worker detects changes.</span></div> :
        <div className="eventList">{visible.map(event => { const Icon = icons[event.source_type] ?? Activity; return <article className="event" key={event.id}><div className="eventIcon"><Icon size={18}/></div><div className="eventBody"><strong>{event.title}</strong><p>{event.summary}</p><small>{event.event_type} · {event.source_type}:{event.source_id}</small></div><time>{new Date(event.occurred_at).toLocaleString()}</time></article>; })}</div>}
    </section>
    <footer>ROBLOX MONITORING BOT V2 <span>·</span> CLOUD WORKER CONNECTED VIA SUPABASE</footer>
  </main>;
}
function Stat({icon,label,value}:{icon:any;label:string;value:number}) { return <div className="stat"><div className="statIcon">{icon}</div><div><strong>{value}</strong><span>{label}</span></div></div>; }
